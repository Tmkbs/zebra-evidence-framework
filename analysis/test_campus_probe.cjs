"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {probeCampus,endpoints}=require("../campus_api_check.cjs");
test("uses the prior 8080 endpoint first and automatically falls back to 8000",async()=>{
 const env={},calls=[];
 const request=async(url)=>{
  calls.push(url);
  if(url.endsWith("/models")&&url.includes(":8080/"))throw Error("ECONNREFUSED");
  if(url.endsWith("/models")&&url.includes(":8000/"))return new Response(JSON.stringify({data:[{id:"Qwen3.8-Flash-Next-FP4-Local"}]}));
  if(url.endsWith("/chat/completions")&&url.includes(":8000/"))return new Response(JSON.stringify({model:"Qwen3.8-Flash-Next-FP4-Local",choices:[{message:{content:"READY"}}],usage:{total_tokens:8}}));
  assert.fail("Unexpected URL "+url);
 };
 const r=await probeCampus({env,request});
 assert.equal(r.live_model_call,true);assert.equal(r.port,"8000");assert.equal(r.reported_model,"Qwen3.8-Flash-Next-FP4-Local");assert.equal(r.reply,"READY");assert.equal(r.attempts.length,2);assert.ok(r.attempts.every(x=>x.port==="8080"));assert.deepEqual(r.attempts.map(x=>x.stage),["models","chat/completions"]);
 assert.ok(calls[0].includes(":8080/"));assert.ok(calls.some(x=>x.includes(":8000/v1/chat/completions")));
});
test("stops on the first working documented endpoint",async()=>{
 const calls=[],env={};const request=async url=>{calls.push(url);if(url.endsWith("/models"))return new Response(JSON.stringify({data:[{id:"DeepSeek-V4-Flash-0731"}]}));return new Response(JSON.stringify({model:"DeepSeek-V4-Flash-0731",choices:[{message:{content:"READY"}}]}))};
 const r=await probeCampus({env,request});assert.equal(r.port,"8080");assert.equal(r.request_contains_only_synthetic_text,true);assert.equal(calls.some(x=>x.includes(":8000/")),false);
});
test("respects an explicitly configured campus port then checks the other documented port",()=>{
 assert.deepEqual(endpoints({AI_BASE_URL:"http://c3dgx0.cs.northwestern.edu:8000/v1"}),["http://c3dgx0.cs.northwestern.edu:8000/v1","http://c3dgx0.cs.northwestern.edu:8080/v1"]);
 assert.throws(()=>endpoints({AI_BASE_URL:"http://example.com:8080/v1"}),/approved Northwestern/);
});
test("selects only an advertised known model when discovery is available",async()=>{
 const env={},request=async url=>url.endsWith("/models")?new Response(JSON.stringify({data:[{id:"DeepSeek-V4-Flash-0731"}]})):new Response(JSON.stringify({model:"DeepSeek-V4-Flash-0731",choices:[{message:{content:"READY"}}]}));
 const r=await probeCampus({env,request});assert.equal(r.requested_model,"DeepSeek-V4-Flash-0731");
});
test("requires HTTPS before any campus request for non-placeholder authentication",async()=>{
 const cases=[
  {CAMPUS_QWEN_TOKEN:"offline-test-token"},
  {CAMPUS_QWEN_TOKEN:"offline-test-token",AI_BASE_URL:"http://c3dgx0.cs.northwestern.edu:8000/v1"},
  {CAMPUS_QWEN_TOKEN:"offline-test-token",AI_BASE_URL:"http://c3dgx0.cs.northwestern.edu:8080/v1"}
 ];
 for(const env of cases){
  let calls=0;
  const request=async()=>{calls++;throw Error("No request expected")};
  await assert.rejects(probeCampus({env,request}),/Real authentication tokens require HTTPS/);
  assert.equal(calls,0);
 }
});
test("permits authenticated HTTPS and keeps fallback on HTTPS",async()=>{
 const env={CAMPUS_QWEN_TOKEN:"offline-test-token",AI_BASE_URL:"https://c3dgx0.cs.northwestern.edu:8080/v1"};
 const calls=[];
 const request=async(url,options)=>{
  calls.push(url);
  assert.equal(new URL(url).protocol,"https:");
  assert.equal(options.headers.Authorization,"Bearer offline-test-token");
  assert.equal(options.redirect,"error");
  if(url.includes(":8080/"))return new Response("Unavailable",{status:503});
  if(url.endsWith("/models"))return new Response(JSON.stringify({data:[{id:"Qwen3.8-Flash-Next-FP4-Local"}]}));
  return new Response(JSON.stringify({model:"Qwen3.8-Flash-Next-FP4-Local",choices:[{message:{content:"READY"}}]}));
 };
 const r=await probeCampus({env,request});
 assert.equal(r.port,"8000");
 assert.equal(calls.length,4);
 assert.ok(calls.every(url=>new URL(url).protocol==="https:"));
});
