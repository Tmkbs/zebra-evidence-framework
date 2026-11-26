"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const M=require("./model-provider.cjs"),G=require("./answer-guidance.cjs");
const {configure,buildServer}=require("../campus_review_server.cjs");
const source="https://techdocs.zebra.com/datawedge/6-8/guide/api/softscantrigger/";
const input={question:"Why might the software scan trigger fail to start scanning?",product:"datawedge",version:"6.8",source_urls:[source],public_only:true,action:"compare"};
const env={ZEBRA_MODEL_MODE:"enterprise",ZEBRA_MODEL_APPROVED_ORIGIN:"https://approved.example",ZEBRA_MODEL_BASE_URL:"https://approved.example/v1",ZEBRA_MODEL_NAME:"approved-model",ZEBRA_MODEL_API_KEY:"fixture-secret"};
test("campus defaults reuse the prior documented 8080 endpoint and Qwen model",()=>{
 const c=M.configure({}, {defaultMode:"campus"});assert.equal(c.base,"http://c3dgx0.cs.northwestern.edu:8080/v1");assert.equal(c.model,"Qwen3.8-Flash-Next-FP4-Local");assert.equal(M.DEFAULT_BASE,c.base);
});
test("portable profile is disabled by default and requires explicit approved HTTPS origin",()=>{
 assert.equal(M.configure({}).mode,"off");
 assert.throws(()=>M.resolve(M.configure({})),/disabled/);
 assert.throws(()=>M.configure({ZEBRA_MODEL_MODE:"enterprise"}),/approved origin/);
 for(const base of ["http://approved.example/v1","https://other.example/v1","https://approved.example:444/v1","https://user:secret@approved.example/v1","https://approved.example/v1?x=1","https://approved.example/other"]){
  assert.throws(()=>M.resolve(M.configure({...env,ZEBRA_MODEL_BASE_URL:base})));
 }
 const c=M.configure(env);assert.equal(M.resolve(c).base,env.ZEBRA_MODEL_BASE_URL);
 assert.equal(M.resolve(c).headers.Authorization,"Bearer fixture-secret");
 assert.deepEqual(M.publicConfig(c),{mode:"enterprise",enabled:true,model:"approved-model"});
 assert.equal(configure({ZEBRA_MODEL_MODE:"off"}).mode,"off");
});
test("no provider or source requests without approved public input; off still permits evidence-only",async()=>{
 let n=0;const no=()=>{n++;throw Error("network called")};
 await assert.rejects(G.run(input,M.configure({}),no),/disabled/);
 await assert.rejects(G.run({...input,public_only:false},M.configure(env),no),/public, approved/);
 assert.equal(n,0);
});
test("existing answer strategy executes with administrator-selected provider and ignores request overrides",async()=>{
 const calls=[];
 const quote="Functional only when Barcode Input is enabled in the active Profile.";
 const html="<html><main><h2>SOFT_SCAN_TRIGGER</h2><p>"+quote+" Check the installed version, configuration and scanner state before making assumptions about the reported behavior.</p></main></html>";
 const request=async(url,opt)=>{
  calls.push({url,opt});
  if(url===source)return new Response(html,{headers:{"content-type":"text/html"}});
  if(url===env.ZEBRA_MODEL_BASE_URL+"/chat/completions"){
   assert.equal(opt.headers.Authorization,"Bearer fixture-secret");
   assert.equal(opt.redirect,"error");const body=JSON.parse(opt.body);assert.equal(body.model,"approved-model");
   return new Response(JSON.stringify({model:"approved-model",choices:[{message:{content:JSON.stringify({status:"inconclusive",claims:[{claim:"Check Barcode Input.",evidence_id:"E1",quote}],clarification:[],next_checks:["Confirm the active Profile."]})}}]}));
  }
  assert.fail("unexpected endpoint");
 };
 const r=await G.run({...input,base:"https://attacker.example/v1",model:"unapproved",token:"request-secret"},M.configure(env),request);
 assert.equal(r.pair_valid,true);assert.equal(r.model_runs_completed,2);assert.equal(calls.length,3);
 assert.equal(calls[0].opt.headers.Authorization,undefined);
 assert.equal(r.runs[0].provider_mode,"enterprise");assert.equal(r.runs[0].result.exact_quote_count,1);
 assert.ok(!JSON.stringify(r).includes("fixture-secret"));assert.ok(!JSON.stringify(r).includes("request-secret"));
 assert.equal(JSON.parse(calls[1].opt.body).messages[1].content,JSON.parse(calls[2].opt.body).messages[1].content);
});
test("portable HTTP mode blocks legacy model proxy and never sends credentials in session",async()=>{
 const cfg=configure(env),server=buildServer(cfg,()=>assert.fail("network called"));
 await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
 const http=require("node:http");
 const req=(route,method="GET")=>new Promise((resolve,reject)=>{const q=http.request({host:"127.0.0.1",port:server.address().port,path:route,method,headers:{Host:"127.0.0.1:3000"}},r=>{const chunks=[];r.on("data",c=>chunks.push(c));r.on("end",()=>resolve({status:r.statusCode,body:Buffer.concat(chunks).toString()}))});q.on("error",reject);q.end()});
 try{
  const s=await req("/api/session");assert.equal(s.status,200);assert.ok(!s.body.includes("fixture-secret"));assert.equal(JSON.parse(s.body).model_config.mode,"enterprise");
  assert.equal((await req("/api/review","POST")).status,403);
 }finally{await new Promise(resolve=>server.close(resolve))}
});
