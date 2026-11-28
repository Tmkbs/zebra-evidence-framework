"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),crypto=require("node:crypto");
const E=require("./strategy-evolution.cjs"),G=require("./answer-guidance.cjs");
const hash=s=>crypto.createHash("sha256").update(s).digest("hex");
test("seeded genomes preserve every strategy and only change guided prompt emphasis/order",()=>{
 const p=E.initial(26);assert.deepEqual(p,E.initial(26));assert.equal(p.candidates.length,4);
 const plan=G.prepare({question:"Why did the scanner fail after an upgrade?",product:"datawedge",version:"6.8",source_urls:["https://techdocs.zebra.com/datawedge/6-8/guide/api/softscantrigger/"]});
 const selected=E.apply(plan.strategies,p.candidates[1]);
 assert.deepEqual(selected.strategies.map(s=>s.id).sort(),plan.strategies.map(s=>s.id).sort());
 assert.deepEqual(G.prompt(plan,[],"baseline",{},p.candidates[1]),G.prompt(plan,[],"baseline",{}));
 const candidate=G.prompt(plan,[],"guided",{},p.candidates[1]);
 assert.equal(candidate[1].content,G.prompt(plan,[],"guided",{})[1].content);assert.match(candidate[0].content,/Experimental response emphasis/);
 assert.throws(()=>E.validateCandidate({...p.candidates[0],order:[]}));
});
function fixture(p){
 const sourceText="Synthetic fixture excerpt only, not an actual model run.";
 const sources=[{id:"E1",url:"https://techdocs.zebra.com/datawedge/6-8/guide/api/softscantrigger/",text:sourceText,excerpt_sha256:hash(sourceText)}];
 const e=hash(JSON.stringify(sources.map(({id,url,text})=>({id,url,text}))));
 return {schema:"zebra-strategy-fitness/v1",generation:p.generation,case_split:"development",evidence_kind:"reviewed_model_runs",reviewer:"Synthetic fixture reviewer",independent_review_confirmed:true,rounds:p.candidates.map((c,i)=>{
  const rows=[0,1,2].map(j=>{
   const plan={question:"Synthetic fixture question "+j+"?",product:"datawedge",version:"6.8",context:""};
   const raw_answer="Synthetic candidate "+i+" case "+j;
   return {id:"fixture-"+j,source_group:"fixture:"+j,question_sha256:hash(plan.question.toLowerCase()),question_origin:"original_public_question",origin_verified_by_operator:true,status:"planned_or_executed",result:{mode:"live_guided_answer",strategy_candidate_id:c.id,model_runs_completed:1,model_attempts:1,plan,sources,evidence_sha256:e,frozen_input_sha256:hash(JSON.stringify({...plan,evidence_sha256:e})),settings:{temperature:0,max_tokens:1800},runs:[{mode:"guided",completed:true,model_identity_reported:true,model:"fixture-only",raw_answer,raw_answer_sha256:hash(raw_answer),prompt_sha256:hash(JSON.stringify(G.prompt(plan,sources,"guided",{},c)))}]}};
  });
  // Hash object key order must match real runner's frozen input.
  for(const row of rows){const r=row.result,p=r.plan;r.frozen_input_sha256=hash(JSON.stringify({question:p.question,context:p.context,product:p.product,version:p.version,evidence_sha256:e}))}
  return {candidate_id:c.id,report:{schema:"zebra-answer-batch/v1",summary:{mode:"guided"},rows},reviews:rows.map(r=>({id:r.id,raw_answer_sha256:r.result.runs[0].raw_answer_sha256,scores:Object.fromEntries(E.dimensions.map(d=>[d,i===0||i===1?2:1])),critical_error:i===0,rationale:"Synthetic test rubric."}))};
 })};
}
test("selection and crossover are deterministic, critical errors outrank score, no automatic promotion",()=>{
 const p=E.initial(),f=fixture(p),n=E.advance(p,f);
 assert.equal(n.generation,1);assert.equal(n.selection.selected_parent_ids[0],p.candidates[1].id);
 assert.equal(n.candidates.length,4);assert.equal(n.promotion_approved,false);
 assert.equal(n.selection.held_out_status,"not_evaluated");assert.deepEqual(n,E.advance(p,f));
 assert.equal(n.candidates.filter(c=>p.candidates.some(x=>x.id===c.id)).length,2);
});
test("no fitness from missing reviews, changing evidence, altered answer, or held-out cases",()=>{
 const p=E.initial();
 for(const edit of [f=>{f.independent_review_confirmed=false},f=>{f.case_split="held_out"},f=>{f.rounds[0].reviews.pop()},f=>{f.rounds[0].report.rows[0].result.runs[0].raw_answer="tampered"},f=>{f.rounds[0].report.rows[0].result.sources[0].text="different source"}]){
  const f=fixture(p);edit(f);assert.throws(()=>E.advance(p,f));
 }
});

test("guided experiment is passed through the existing inference engine and receipt",async()=>{
 const candidate=E.initial(26).candidates[0],source="https://techdocs.zebra.com/datawedge/6-8/guide/api/softscantrigger/";
 const cfg={mode:"enterprise",base:"https://approved.example/v1",approved_origin:"https://approved.example",model:"fixture-model",strategy_candidate:candidate};
 const quote="Functional only when Barcode Input is enabled in the active Profile.";
 let modelCalls=0;
 const request=async(url,opt)=>{
  if(url===source)return new Response("<html><main><h2>SOFT_SCAN_TRIGGER</h2><p>"+quote+" This synthetic source fixture contains enough text to test the extraction path, not actual device behavior.</p></main></html>",{headers:{"content-type":"text/html"}});
  assert.equal(url,cfg.base+"/chat/completions");const body=JSON.parse(opt.body);assert.match(body.messages[0].content,/Experimental response emphasis/);modelCalls++;
  return new Response(JSON.stringify({model:cfg.model,choices:[{message:{content:JSON.stringify({status:"documented_guidance",claims:[{claim:"Check Barcode Input.",quote,evidence_id:"E1"}],clarification:[],next_checks:[]})}}]}));
 };
 const input={question:"Why might the software scan trigger fail to start scanning?",product:"datawedge",version:"6.8",source_urls:[source],public_only:true,action:"guided"};
 const r=await G.run(input,cfg,request);
 assert.equal(modelCalls,1);assert.equal(r.strategy_candidate_id,candidate.id);assert.equal(r.model_runs_completed,1);
 await assert.rejects(G.run({...input,action:"compare"},cfg,()=>assert.fail("network")),/restricted to guided/);
});
