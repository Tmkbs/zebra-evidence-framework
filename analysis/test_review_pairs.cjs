"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),crypto=require("node:crypto");
const {reviewer}=require("./review-pairs.cjs");
function tests(factory,hash,assert){
 const R=factory(hash,()=>1),q="How should the software scan trigger be checked?",p={question:q,product:"datawedge",version:"6.8",context:""},s={id:"E1",url:"https://techdocs.zebra.com/datawedge/6-8/guide/api/softscantrigger/",text:"Synthetic excerpt for a software test.",body_sha256:"a".repeat(64),retrieved_at:"2026-11-26T00:00:00Z"};
 s.excerpt_sha256=hash(s.text);const e=hash(JSON.stringify([{id:s.id,url:s.url,text:s.text}]));
 const runs=["baseline","guided"].map(mode=>({mode,completed:true,model_identity_reported:true,model:"fixture-only",prompt_sha256:(mode==="baseline"?"b":"c").repeat(64),raw_answer:mode+" fixture answer",raw_answer_sha256:hash(mode+" fixture answer"),ran_at:"2026-11-26T00:00:00Z"}));
 const row={id:"fixture",status:"planned_or_executed",question_origin:"original_public_question",origin_verified_by_operator:true,forum_url:"https://developer.zebra.com/content/fixture",source_group:"https://developer.zebra.com/content/fixture",question_sha256:hash(q.toLowerCase()),result:{mode:"live_paired_answer",pair_valid:true,model_runs_completed:2,model_attempts:2,plan:p,settings:{temperature:0,max_tokens:1800},run_id:"fixture",sources:[s],evidence_sha256:e,frozen_input_sha256:hash(JSON.stringify({question:q,context:"",product:p.product,version:p.version,evidence_sha256:e})),runs}};
 const batch={schema:"zebra-answer-batch/v1",rows:[row,{...row,id:"duplicate"},{...row,id:"offline",question_origin:"synthetic_question"},{...row,id:"bad",result:{...row.result,frozen_input_sha256:"tampered"}},{...row,id:"partial",result:{...row.result,pair_valid:false}}]};
 const out=R.prepare(batch);
 assert(out.packet.cases.length===1,"only one admissible fixture");assert(out.key.excluded.length===4,"blocked rows retained");
 assert(out.packet.cases[0].answers.A===runs[1].raw_answer,"arm shuffle");assert(!JSON.stringify(out.packet).includes("arm_modes"),"mapping separate");
 let rejected=false;try{R.grade(out.packet,out.key,out.sheet)}catch{rejected=true}assert(rejected,"unreviewed blocked");
 out.sheet.reviewer="fixture reviewer";out.sheet.independent_review_confirmed=true;
 const item=out.sheet.items[0];for(const arm of ["A","B"]){item[arm].scores=Object.fromEntries(R.dims.map(d=>[d,arm==="A"?2:1]));item[arm].critical_error=arm==="B";item[arm].note="Synthetic fixture only";}
 const result=R.grade(out.packet,out.key,out.sheet);assert(result.reviewed_pairs===1&&result.mean_paired_delta===5&&result.guided_critical_errors===0&&!result.quality_improvement_established,"mapping and boundary");
 rejected=false;try{R.grade({...out.packet,scope:"changed"},out.key,out.sheet)}catch{rejected=true}assert(rejected,"tamper detected");
 const bad=JSON.parse(JSON.stringify(row));bad.result.runs[0].raw_answer="tampered";assert(R.inspect(bad)==="response_or_identity_invalid","response hash");
 bad.result.runs[0].raw_answer=runs[0].raw_answer;bad.result.sources[0].url="https://techdocs.zebra.com/datawedge/15-0/guide/api/softscantrigger/";assert(R.inspect(bad)==="source_scope_mismatch","wrong edition");
 const zero=R.prepare({schema:batch.schema,rows:[batch.rows[2]]});zero.sheet.reviewer="fixture";zero.sheet.independent_review_confirmed=true;
 const none=R.grade(zero.packet,zero.key,zero.sheet);assert(none.reviewed_pairs===0&&none.mean_paired_delta===null,"zero no score");
}
test("synthetic receipt exclusion, randomized labels, rubric and digests",()=>tests(reviewer,s=>crypto.createHash("sha256").update(s).digest("hex"),(v,m)=>assert.ok(v,m)));
