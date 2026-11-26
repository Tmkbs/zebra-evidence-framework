"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const S=require("../classroom/answer-strategies.js");
const P=require("../classroom/guidance-planner.js");
const I=require("../classroom/guidance-intake.js");
function plan(question,product="datawedge",version="",context=""){
 return P.prepare({question,product,version,context,source_urls:[]});
}
test("strategy catalog keeps all six observations provisional and preserves their provenance",()=>{
 const rows=S.catalog();assert.equal(rows.length,6);
 assert.ok(rows.every(x=>x.provenance.status!=="validated"));
 const version=rows.find(x=>x.id==="version_boundary");
 assert.equal(version.provenance.nominal_case_count,2);
 assert.equal(version.provenance.independent_support_count,1);
 assert.equal(version.provenance.validation_threshold,2);
 assert.deepEqual(version.provenance.reused_evidence_ids,["DW15-VERSION-CHECK","DW66-MULTI-PLUGIN"]);
 assert.deepEqual(rows.find(x=>x.id==="missing_context").provenance.evidence_ids,["FORUM-00476-REPORT"]);
});
test("generic product introduction does not trigger diagnostic or version strategies",()=>{
 assert.deepEqual(S.select(plan("What is DataWedge and what does a profile do?","datawedge","15.0")),[]);
});
test("version-boundary candidate transfers to a different product without claiming validation",()=>{
 const a=S.select(plan("After an update, my DataWedge scanner no longer sends data.","datawedge",""));
 const b=S.select(plan("After upgrading Enterprise Browser, the app no longer opens.","enterprise-browser",""));
 for(const result of [a,b]){
  assert.ok(result.some(x=>x.id==="version_boundary"));
  assert.ok(result.some(x=>x.id==="missing_context"));
  assert.ok(result.some(x=>x.id==="unverified_device_claim"));
  assert.equal(result.find(x=>x.id==="version_boundary").application_status,"ask_for_version");
  assert.equal(result.find(x=>x.id==="version_boundary").research_status,"candidate_not_validated");
 }
});
test("version-sensitive question with a supplied edition still requires edition-matched evidence",()=>{
 const result=S.select(plan("After updating, this DataWedge behavior changed.","datawedge","15.0"));
 const strategy=result.find(x=>x.id==="version_boundary");
 assert.equal(strategy.application_status,"edition_match_required");
 assert.equal(strategy.next_question,"");
});
test("diagnostic context is requested only when it is absent",()=>{
 const q="My DataWedge scanner is not working on the device.";
 assert.ok(S.select(plan(q,"datawedge","6.8","")).some(x=>x.id==="missing_context"));
 const withContext=S.select(plan(q,"datawedge","6.8","TC700K, Android 13, active Profile A, scan command returns no result."));
 assert.ok(!withContext.some(x=>x.id==="missing_context"));
 assert.ok(withContext.some(x=>x.id==="unverified_device_claim"));
});
test("a documented prerequisite is applied only from an exact matching official edition",()=>{
 const url="https://techdocs.zebra.com/datawedge/6-8/guide/api/softscantrigger/";
 const p=plan("Why might the software scan trigger fail to start?","datawedge","6.8");
 const card=I.offlineEvidence({...p,source_urls:[url]}).cards[0];
 assert.ok(S.select(p,[]).every(x=>x.id!=="missing_prerequisite"));
 const result=S.select(p,[card]);
 const prerequisite=result.find(x=>x.id==="missing_prerequisite");
 assert.ok(prerequisite);assert.equal(prerequisite.application_status,"source_backed");
 assert.match(prerequisite.evidence_links[0].quote,/Barcode Input/);
 const wrong=S.select({...p,version:"15.0"},[card]);
 assert.ok(!wrong.some(x=>x.id==="missing_prerequisite"));
 const untrusted=S.select(p,[{url:"https://evil.example/datawedge/6-8/",sections:[{quote:"Functional only when enabled"}]}]);
 assert.ok(!untrusted.some(x=>x.id==="missing_prerequisite"));
});
test("source discrepancy needs both exact identifiers in the same edition-matched source",()=>{
 const url="https://techdocs.zebra.com/datawedge/6-8/guide/api/resultinfo/";
 const p=plan("What is the difference between SEND_RESULT and RECEIVE_RESULT in the result code example?","datawedge","6.8");
 const card=I.offlineEvidence({...p,source_urls:[url]}).cards[0];
 const enriched=P.withEvidence(p,[card]);
 const result=enriched.strategies;
 assert.deepEqual(result,S.select(p,[card]));
 assert.deepEqual(enriched.policies.map(x=>x.id),result.map(x=>x.id));
 assert.ok(enriched.policies.some(x=>x.id==="example_body_conflict"));
 assert.ok(result.some(x=>x.id==="example_body_conflict"));
 assert.ok(result.some(x=>x.id==="naming_inconsistency"));
 assert.equal(result.find(x=>x.id==="example_body_conflict").application_status,"source_discrepancy_needs_review");
 const split=S.select(p,[
  {url,sections:[{section:"Overview",quote:"RECEIVE_RESULT"}]},
  {url,sections:[{section:"Example",quote:"SEND_RESULT"}]}
 ]);
 assert.ok(!split.some(x=>x.id==="example_body_conflict"));
 const wrongEdition=S.select({...p,version:"15.0"},[card]);
 assert.ok(!wrongEdition.some(x=>x.id==="example_body_conflict"));
});
test("mentioning two names in a question is not itself proof of a documentation conflict",()=>{
 const p=plan("I heard RECEIVE_RESULT and SEND_RESULT. Which should I use?","datawedge","6.8");
 assert.ok(!S.select(p,[]).some(x=>x.id==="example_body_conflict"));
 assert.ok(!p.policies.some(x=>["example_body_conflict","naming_inconsistency"].includes(x.id)));
 assert.deepEqual(p.policies.map(x=>x.id),p.strategies.map(x=>x.id));
 assert.deepEqual(p.strategies,S.select(p,[]));
});
test("device guardrail is suppressed only when a real device test is explicitly recorded",()=>{
 const q="The scanner does not work on the TC700K. Is the fix confirmed?";
 assert.ok(S.select(plan(q,"datawedge","6.8")).some(x=>x.id==="unverified_device_claim"));
 const tested={...plan(q,"datawedge","6.8"),device_tested:true};
 assert.ok(!S.select(tested).some(x=>x.id==="unverified_device_claim"));
});
