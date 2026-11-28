"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),W=require("../classroom/techdocs-widget.js");
test("widget accepts only exact evidence-backed candidate claims and safe source links",()=>{
 const quote="The checked source excerpt.";
 const r={plan:{clarification:["Confirm the version"]},sources:[{id:"E1",url:"https://docs.example/1/guide",text:quote},{id:"E2",url:"javascript:alert(1)",text:quote}],runs:[{mode:"guided",completed:true,result:{quote_checked_claims:[{claim:"Checked",evidence_id:"E1",quote,quote_exact:true},{claim:"Fake",evidence_id:"E1",quote:"Invented excerpt.",quote_exact:true},{claim:"Unsafe",evidence_id:"E2",quote,quote_exact:true}],next_checks:["Confirm configuration"]}}],model_runs_completed:1};
 const view=W.view(r);assert.equal(view.claims.length,1);assert.equal(view.claims[0].claim,"Checked");assert.equal(view.evidence.length,1);assert.equal(view.checks.length,1);
});
test("widget handles offline curated evidence and unknown scopes without pretending to run inference",()=>{
 const r=W.view({plan:{state:"clarification_required",clarification:["Which version?"]},offline_evidence:{cards:[{url:"https://docs.example/2/guide",title:"Example",sections:[{quote:"Example excerpt"}]}]},model_runs_completed:0});
 assert.equal(r.modelCompleted,0);assert.equal(r.needsClarification,true);assert.equal(r.claims.length,0);assert.equal(r.evidence.length,1);
});
