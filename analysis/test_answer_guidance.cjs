"use strict";
// Fixtures are synthetic. No live campus model or device test is performed here.
const test=require("node:test");
const assert=require("node:assert/strict");
const G=require("./answer-guidance.cjs");
const {buildServer}=require("../campus_review_server.cjs");
const cfg={port:3000,base:"http://c3dgx0.cs.northwestern.edu:8080/v1",model:"campus-test",passcode:"local-test-token"};
const source="https://techdocs.zebra.com/datawedge/6-8/guide/api/resultinfo/";
const input={question:"The DataWedge example uses SEND_RESULT but the description mentions RECEIVE_RESULT. Which should I use?",product:"datawedge",version:"6.8",source_urls:[source],context:"Testing an example, device behavior has not been verified.",public_only:true};
const html='<html><main><h2 id="overview">Overview</h2><p>The prose mentions RECEIVE_RESULT as an intent extra in this illustrative test document. The following synthetic example is not an observed device result.</p><p>Sample code uses SEND_RESULT and COMMAND_IDENTIFIER. Check the applicable release and verify behavior before treating the example as working.</p></main></html>';
const quote="Sample code uses SEND_RESULT and COMMAND_IDENTIFIER.";
function fixtureFetch({failSecond=false,badQuote=false,modelIdentity=true}={}){
 const calls=[];
 const request=async(url,opt={})=>{
  calls.push({url,opt});
  if(url===source)return new Response(html,{status:200,headers:{"content-type":"text/html"}});
  if(url===cfg.base+"/chat/completions"){
   const count=calls.filter(c=>c.url.endsWith("/chat/completions")).length;
   if(failSecond&&count===2)return new Response("unavailable",{status:503});
   return new Response(JSON.stringify({...(modelIdentity?{model:cfg.model}:{}),choices:[{message:{content:JSON.stringify({status:"inconclusive",claims:[{claim:"The sample contains this parameter.",evidence_id:"E1",quote:badQuote?"A fabricated quotation.":quote}],clarification:["Which build is installed?"],next_checks:["Verify on the target device."]})}}]}),{status:200,headers:{"content-type":"application/json"}});
  }
  throw Error("Unexpected endpoint "+url);
 };
 return {calls,request};
}
test("missing version asks a question, without retrieval or model",async()=>{
 let count=0;const r=await G.run({...input,version:"",action:"guided"},cfg,async()=>{count++;throw Error("Network forbidden")});
 assert.equal(r.mode,"plan_only");assert.equal(r.plan.state,"clarification_required");assert.equal(r.model_attempts,0);assert.equal(count,0);assert.ok(r.plan.clarification.some(v=>/version/i.test(v)));
});
test("missing product is not inferred from a topic",()=>assert.equal(G.prepare({...input,product:""}).state,"clarification_required"));
test("plan only does not use network",async()=>{
 const r=await G.run({...input,action:"plan"},cfg,()=>assert.fail("No network"));
 assert.equal(r.plan.state,"ready_for_source_retrieval");assert.equal(r.model_runs_completed,0);
});
test("known result-code topic produces version-pinned URL",()=>{
 const p=G.prepare({...input,source_urls:[]});
 assert.deepEqual(p.source_urls,[source]);assert.equal(p.source_selection,"limited_topic_router");
});
test("unknown topic requires a source instead of guessing",()=>{
 const p=G.prepare({question:"How can I use a completely different application feature?",product:"ehs",version:"4.0"});
 assert.equal(p.state,"clarification_required");assert.equal(p.source_urls.length,0);
});
test("reject latest, wrong edition, product and external URLs",()=>{
 for(const url of ["https://techdocs.zebra.com/datawedge/latest/guide/api/resultinfo/","https://techdocs.zebra.com/datawedge/15-0/guide/api/resultinfo/","https://techdocs.zebra.com/ehs/6-8/guide/","https://evil.example/datawedge/6-8/guide/","http://techdocs.zebra.com/datawedge/6-8/guide/","https://techdocs.zebra.com/datawedge/6-8/guide/?secret=1"]){
  assert.throws(()=>G.prepare({...input,source_urls:[url]}));
 }
});
test("provisional safeguards do not imply validated patterns",()=>{
 const p=G.prepare(input);assert.equal(p.global_pattern_validated,false);assert.equal(p.installed_version_verified,false);
 assert.ok(p.policies.some(x=>x.id==="example_body_conflict"));
});
test("no campus call when consent missing",async()=>{
 const f=fixtureFetch();await assert.rejects(G.run({...input,action:"guided",public_only:false},cfg,f.request),/public, approved/);assert.equal(f.calls.length,0);
});
test("reject external model before retrieving any source",async()=>{
 const f=fixtureFetch();await assert.rejects(G.run({...input,action:"guided"},{...cfg,base:"https://api.openai.com/v1"},f.request),/only Northwestern/);assert.equal(f.calls.length,0);
});
test("cross-edition redirect fails closed",async()=>{
 let count=0;await assert.rejects(G.run({...input,action:"guided"},cfg,async()=>{count++;return new Response("",{status:302,headers:{location:"https://techdocs.zebra.com/datawedge/15-0/guide/"}})}),/edition exactly/);assert.equal(count,1);
});
test("same official evidence and model settings for both arms",async()=>{
 const f=fixtureFetch(),r=await G.run({...input,action:"compare"},cfg,f.request);
 assert.equal(r.mode,"live_paired_answer");assert.equal(r.model_attempts,2);assert.equal(r.model_runs_completed,2);assert.equal(r.pair_valid,true);assert.equal(r.device_tested,false);assert.equal(r.quality_improvement_measured,false);
 assert.equal(f.calls.filter(c=>c.url===source).length,1);
 const calls=f.calls.filter(c=>c.url.endsWith("/chat/completions")).map(c=>JSON.parse(c.opt.body));
 assert.equal(calls.length,2);assert.deepEqual(calls[0].messages[1],calls[1].messages[1]);assert.equal(calls[0].model,calls[1].model);assert.equal(calls[0].temperature,calls[1].temperature);assert.equal(calls[0].max_tokens,calls[1].max_tokens);
 assert.notEqual(calls[0].messages[0].content,calls[1].messages[0].content);
 assert.equal(r.runs[0].result.exact_quote_count,1);assert.equal(r.signals.both_result_tokens_present,true);
 assert.ok(r.runs[0].result.metric_scope.includes("not semantic"));
});
test("unmatched quotes are rejected rather than displayed as evidence",async()=>{
 const f=fixtureFetch({badQuote:true});const r=await G.run({...input,action:"guided"},cfg,f.request);
 assert.equal(r.runs[0].result.exact_quote_count,0);assert.equal(r.runs[0].result.rejected_claims.length,1);
});
test("partial run preserves first response and does not claim valid pair",async()=>{
 const f=fixtureFetch({failSecond:true}),r=await G.run({...input,action:"compare"},cfg,f.request);
 assert.equal(r.model_runs_completed,1);assert.equal(r.pair_valid,false);assert.equal(r.runs[1].completed,false);
});
test("unknown model identity prevents pair validity",async()=>{
 const f=fixtureFetch({modelIdentity:false}),r=await G.run({...input,action:"compare"},cfg,f.request);
 assert.equal(r.model_runs_completed,2);assert.equal(r.pair_valid,false);
});
test("malformed or unstructured model output is not accepted",()=>{
 assert.throws(()=>G.normalize("Here is an answer",[]),/required JSON/);
});
test("same-origin local route requires session and uses the existing server",async()=>{
 const f=fixtureFetch(),server=buildServer(cfg,f.request);
 await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
 try{
  const url="http://127.0.0.1:"+server.address().port;
  // Host validation uses the configured port; supply it explicitly to the
  // ephemeral test server with the Node HTTP client.
  const http=require("node:http");
  function post(path,{token="",origin,body,method="POST"}={}){
   return new Promise((resolve,reject)=>{
    const req=http.request({hostname:"127.0.0.1",port:server.address().port,path,method,headers:{Host:"127.0.0.1:3000","X-Review-Access":token,"Content-Type":"application/json",...(origin?{Origin:origin}:{})}},res=>{
     const chunks=[];res.on("data",c=>chunks.push(c));res.on("end",()=>resolve({status:res.statusCode,body:Buffer.concat(chunks).toString("utf8")}))
    });req.on("error",reject);if(body)req.write(JSON.stringify(body));req.end()
   });
  }
  assert.equal((await post("/answer-guidance.html",{method:"GET"})).status,200);
  assert.equal((await post("/api/answer-guidance",{body:input})).status,401);
  assert.equal((await post("/api/answer-guidance",{token:cfg.passcode,origin:"https://evil.example",body:input})).status,403);
  const r=await post("/api/answer-guidance",{token:cfg.passcode,body:{...input,action:"compare"}});
  assert.equal(r.status,200);assert.equal(JSON.parse(r.body).model_runs_completed,2);
 }finally{await new Promise(resolve=>server.close(resolve))}
});
