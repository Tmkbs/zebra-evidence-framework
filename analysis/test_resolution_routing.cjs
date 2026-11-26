"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),B=require("./batch-answer.cjs"),R=require("./resolution-routing.cjs");
const demo=require("./batch-demo-input.json"),lesson=require("./document-lesson-pilot.json").cases[0];
const source="https://techdocs.zebra.com/datawedge/6-8/guide/api/softscantrigger/";
const question="Why might the software scan trigger fail to start scanning?";
const forum={id:"forum-fixture",channel:"forum",question_origin:"original_public_question",origin_verified:true,public_only:true,forum_url:"https://developer.zebra.com/content/fixture",question,product:"datawedge",version:"6.8",source_urls:[source]};
const support={...forum,id:"support-fixture",channel:"support_ticket",question_origin:"authorized_support_question",forum_url:undefined,support_sample_ref:"SAMPLE-DEMO",support_sample_approved:true,question:"How can I check whether the software scan trigger is ready?"};
const packet=cases=>({schema:"zebra-batch-input/v1",cases});
const cfg={mode:"enterprise",base:"https://approved.example/v1",approved_origin:"https://approved.example",model:"fixture-model"};
const quote="Functional only when Barcode Input is enabled in the active Profile.";
function mock({badQuote=false,fail=false,status="documented_guidance"}={}){
 const calls=[];
 return {calls,request:async(url,opt)=>{
  calls.push(url);
  if(url===source)return new Response("<html><main><h2>SOFT_SCAN_TRIGGER</h2><p>"+quote+" In this synthetic test fixture, check the active profile and scanner readiness before trying to trigger a scan. The documentation excerpt is not a device test.</p></main></html>",{headers:{"content-type":"text/html"}});
  if(url===cfg.base+"/chat/completions"){
   assert.equal(opt.redirect,"error");if(fail)return new Response("unavailable",{status:503});
   return new Response(JSON.stringify({model:cfg.model,choices:[{message:{content:JSON.stringify({status,claims:[{claim:"Check the active profile's Barcode Input setting.",evidence_id:"E1",quote:badQuote?"Invented source quotation.":quote}],clarification:status==="clarify"?["Which profile is active?"]:[],next_checks:["Confirm the active profile."]})}}]}));
  }
  assert.fail("Unexpected URL");
 }};
}
test("offline route distinguishes source guidance, unresolved conflict and missing scope",async()=>{
 const input=[...demo.cases.map((r,i)=>({...r,channel:i%2?"support_ticket":"forum"})),{...lesson,channel:"forum"}];
 const out=await B.execute(packet(input),{request:()=>assert.fail("network")});
 const by=Object.fromEntries(out.rows.map(r=>[r.id,r]));
 assert.equal(by.profiles.resolution.disposition,"document_guidance");
 assert.equal(by["scan-trigger"].resolution.disposition,"document_guidance");
 assert.equal(by["result-codes"].resolution.disposition,"human_review");
 assert.equal(by["nested-config"].resolution.disposition,"document_guidance");
 assert.equal(by[lesson.id].resolution.disposition,"document_guidance");
 assert.equal(out.summary.resolution_by_channel.confirmed_resolutions,0);
 assert.equal(out.summary.resolution_by_channel.automatic_resolution_rate,null);
 assert.ok(out.rows.every(r=>r.resolution.automatic_closure===false));
 assert.equal(Object.values(out.summary.resolution_by_channel.channels).reduce((n,c)=>n+c.input_rows,0),input.length);
});
test("one guided call for each approved non-confidential channel; no baseline required",async()=>{
 const f=mock(),out=await B.execute(packet([forum,support]),{mode:"guided",allowNetwork:true,cfg,request:f.request});
 assert.equal(f.calls.length,4);
 assert.equal(out.summary.model_runs_completed,2);
 assert.equal(out.summary.valid_model_pairs,0);
 assert.ok(out.rows.every(r=>r.resolution.disposition==="model_candidate"&&r.resolution.confirmed_resolution===false));
 assert.equal(out.summary.resolution_by_channel.channels.forum.model_candidate,1);
 assert.equal(out.summary.resolution_by_channel.channels.support_ticket.model_candidate,1);
});
test("unapproved support material and synthetic questions cannot call provider",async()=>{
 const out=await B.execute(packet([{...support,support_sample_approved:false},{...support,id:"second",question:"Can I start scanning with the scanner busy?",question_origin:"synthetic_question"}]),{mode:"guided",allowNetwork:true,cfg,request:()=>assert.fail("no network")});
 assert.ok(out.rows.every(r=>r.resolution.disposition==="excluded"));
});
test("model failure and rejected quotation route to review; missing edition asks before inference",async()=>{
 for(const opt of [{badQuote:true},{fail:true}]){
  const f=mock(opt),out=await B.execute(packet([forum]),{mode:"guided",allowNetwork:true,cfg,request:f.request});
  assert.equal(out.rows[0].resolution.disposition,"human_review");
 }
 const out=await B.execute(packet([{...forum,version:""}]),{mode:"guided",allowNetwork:true,cfg,request:()=>assert.fail("no network")});
 assert.equal(out.rows[0].resolution.disposition,"clarify");
 assert.match(out.rows[0].resolution.questions.join(" "),/version/i);
});
