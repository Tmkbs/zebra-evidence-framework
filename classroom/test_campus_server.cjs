"use strict";
const assert=require("node:assert/strict");
const http=require("node:http");
const {configure,allowHost,campusStatus,buildServer}=require("../campus_review_server.cjs");

async function main(){
 const env={};
 const cfg=configure(env);
 assert.equal(cfg.base,"http://c3dgx0.cs.northwestern.edu:8000/v1");
 assert.equal(cfg.model,"nvidia/Qwen3.8-Flash-Next-FP4-Local");
 assert.equal(env.AI_ALLOW_HTTP,"true");
 assert.ok(cfg.passcode.length>=32);
 assert.ok(!env.AI_API_KEY||env.AI_API_KEY==="token-is-ignored");
 assert.throws(()=>configure({AI_BASE_URL:"http://example.com/v1"}),/Plain HTTP/);
 assert.throws(()=>configure({AI_BASE_URL:"https://example.com/v1"}),/AI_API_KEY/);
 assert.equal(allowHost({headers:{host:"evil.example:3000"}},3000),false);
 assert.equal(allowHost({headers:{host:"localhost:3000"}},3000),true);
 const mockFetch=async url=>{
  assert.equal(url,cfg.base+"/models");
  return{ok:true,json:async()=>({data:[{id:cfg.model},{id:"another/model"}]})};
 };
 const status=await campusStatus(cfg,mockFetch);
 assert.equal(status.connected,true);
 assert.equal(status.model_listed,true);
 const server=buildServer(cfg,mockFetch);
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 const port=server.address().port;
 async function request(path,options={}){
  return new Promise((resolve,reject)=>{
   const req=http.request({hostname:"127.0.0.1",port,path,method:options.method||"GET",headers:{Host:options.host||"127.0.0.1:3000"}},res=>{
    const chunks=[];res.on("data",x=>chunks.push(x));res.on("end",()=>resolve({status:res.statusCode,body:Buffer.concat(chunks).toString("utf8")}))});
   req.on("error",reject);
   if(options.body)req.write(options.body);
   req.end();
  });
 }
 try{
  const home=await request("/");
  assert.equal(home.status,200);
  assert.match(home.body,/Zebra Evidence Review/);
  const delivery=await request("/final-delivery.html");
  assert.equal(delivery.status,200);
  assert.match(delivery.body,/Final Delivery Review/);
  const m=await request("/api/campus-status");
  assert.equal(m.status,200);
  assert.equal(JSON.parse(m.body).connected,true);
  const denied=await request("/api/campus-status",{host:"evil.example:3000"});
  assert.equal(denied.status,403);
  const missing=await request("/any-unlisted-file");
  assert.equal(missing.status,404);
  const malformed=await request("/api/review",{method:"POST",body:"{bad"});
  assert.equal(malformed.status,400);
 }finally{await new Promise(resolve=>server.close(resolve))}
 console.log("PASS localhost serves both review UIs, safely proxies campus status, rejects unknown hosts and malformed requests");
}
main().catch(e=>{console.error(e);process.exitCode=1});
