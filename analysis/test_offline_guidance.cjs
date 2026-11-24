"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const P=require("../classroom/guidance-planner.js");
const I=require("../classroom/guidance-intake.js");
const G=require("./answer-guidance.cjs");
const original="https://techdocs.zebra.com/datawedge/6-8/guide/api/resultinfo/";
const fixture={question:"What is the difference between SEND_RESULT and RECEIVE_RESULT in the result code example?",product:"datawedge",version:"6.8",source_urls:[original],context:"",public_only:true};
const sampleId="ZF-1234567890abcdef";
test("shared browser planner agrees with node",()=>{
 const context=vm.createContext({URL});
 vm.runInContext(fs.readFileSync(path.join(__dirname,"../classroom/guidance-planner.js"),"utf8"),context);
 assert.deepEqual(JSON.parse(JSON.stringify(context.ZebraGuidance.prepare(fixture))),P.prepare(fixture));
 assert.deepEqual(P.prepare(fixture),G.prepare(fixture));
});
test("missing edition has no cached evidence and no model",()=>{
 const p=P.prepare({...fixture,version:""});
 assert.equal(p.state,"clarification_required");assert.equal(I.offlineEvidence(p).cards.length,0);
});
test("known exact edition yields checked cards, not a model result",()=>{
 const p=P.prepare(fixture),v=I.offlineEvidence(p);
 assert.equal(v.cards.length,1);assert.equal(v.model_runs_completed,0);assert.equal(v.device_tested,false);
 assert.equal(v.cards[0].url,original);assert.match(v.notice,/not a current retrieval/);
 assert.match(v.cards[0].sections[0].quote,/RECEIVE_RESULT/);assert.match(v.cards[0].sections[1].quote,/SEND_RESULT/);
});
test("same topic in a different edition cannot use cached cards",()=>{
 const p=P.prepare({...fixture,version:"15.0",source_urls:[]});
 assert.equal(I.offlineEvidence(p).cards.length,0);
});
test("known prerequisite uses separate official card",()=>{
 const url="https://techdocs.zebra.com/datawedge/6-8/guide/api/softscantrigger/";
 const p=P.prepare({...fixture,question:"Why might the software scan trigger fail to start?",source_urls:[url]});
 const c=I.offlineEvidence(p).cards[0];assert.equal(c.url,url);assert.match(c.sections[0].quote,/Barcode Input/);
});
test("CSV retains question only; does not leak recommendation, category or document version",()=>{
 const v=I.importCSV("SPR Key,Question,Case Title,Official TechDocs URL,Forum URL,Documentation root cause category,Recommended TechDocs Action,Version\r\n"+sampleId+",\"Why does this command fail,\nwhen scanning?\",Example,"+original+",https://developer.zebra.com/content/example,answer-category,secret-expected-answer,15.0\r\n");
 assert.equal(v.rows.length,1);assert.equal(v.rows[0].reported_version,"");assert.equal(v.rows[0].origin_verified,false);assert.equal(v.eligible_for_evaluation,0);
 assert.match(v.rows[0].question,/scanning/);assert.ok(!JSON.stringify(v).includes("secret-expected-answer"));assert.ok(!JSON.stringify(v).includes("answer-category"));
});
test("CSV without explicit question does not turn editorial findings into a question",()=>{
 const v=I.importCSV("SPR Key,Feature / Component,Root Cause Breakdown / Missing Content,Recommended TechDocs Action,Target TechDocs Page / Section\n"+sampleId+",DataWedge,This is an editorial diagnosis,Expected answer,"+original);
 assert.equal(v.rows[0].question,"");assert.equal(v.rows[0].question_status,"missing_original_question");assert.equal(v.question_column,null);
 assert.equal(v.rows[0].source_urls[0],original);
});
test("reject private/non-ZF IDs, duplicates and unapproved links",()=>{
 const v=I.importCSV("Case ID,Question,Official TechDocs URL\n"+sampleId+",This is a public question,https://evil.example/private\n"+sampleId+",A duplicate public question,"+original+"\nSPR-123456,A private ticket,"+original);
 assert.equal(v.rows.length,1);assert.equal(v.skipped_rows,2);assert.equal(v.rows[0].source_urls.length,0);
});
test("reject malformed quoting and duplicate headers",()=>{
 assert.throws(()=>I.parseCSV('Case ID,Question\nabc,"quoted"tail'));
 assert.throws(()=>I.parseCSV('Case ID,Case_ID\nabc,def'));
 assert.throws(()=>I.parseCSV('Case ID,Question\nabc,"unclosed'));
});
test("source-only path works without a campus model and freezes real retrieval metadata",async()=>{
 const calls=[];
 const r=await G.run({...fixture,action:"evidence"},{base:"https://api.openai.com/v1"},async(url,opt)=>{
  calls.push(url);
  assert.equal(url,original);
  return new Response("<html><main><h2>Overview</h2><p>Test fixture only: this sample document contains RECEIVE_RESULT, while another test string contains SEND_RESULT. It has enough words to pass the minimum source extraction requirement. No device test is claimed.</p></main></html>",{headers:{"content-type":"text/html"}});
 });
 assert.equal(r.mode,"evidence_only");assert.equal(r.model_attempts,0);assert.equal(r.model_runs_completed,0);assert.equal(calls.length,1);assert.match(r.evidence_sha256,/^[a-f0-9]{64}$/);assert.equal(r.device_tested,false);
});
test("source-only requires explicit public material consent",async()=>{
 await assert.rejects(G.run({...fixture,action:"evidence",public_only:false},{},()=>assert.fail("No network")),/public, approved/);
});
test("static page scripts parse and load shared modules",()=>{
 const html=fs.readFileSync(path.join(__dirname,"../classroom/answer-guidance.html"),"utf8");
 assert.match(html,/src="guidance-planner.js"/);assert.match(html,/src="guidance-intake.js"/);assert.match(html,/Offline guidance/);
 for(const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
});
