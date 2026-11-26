"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs/promises"),os=require("node:os"),path=require("node:path");
const A=require("./automation.cjs"),manifest=require("./automation-demo-input.json");
test("batch executes all reviewed templates and preserves clarification and evidence status",async()=>{
 const report=await A.runBatch(manifest.cases,{request:()=>assert.fail("No network")});
 assert.equal(report.summary.processed,7);assert.equal(report.summary.model_attempts,0);assert.equal(report.summary.clarification_required,3);
 assert.equal(report.quality_improvement_measured,false);
 assert.ok(report.records[5].result.plan.strategies.some(s=>s.id==="version_boundary"));
 const kinds=report.records.map((r,i)=>A.narration(r.result,{readerKey:manifest.cases[i].reader_key})?.kind||null);
 assert.deepEqual(kinds,["profile_learning","scan_prerequisite","result_discrepancy","configuration_hierarchy","reported_path_comparison",null,null]);
});
test("no raw developer question is narrated; matching cached evidence is retained",()=>{
 const input={...manifest.cases[2],question:manifest.cases[2].question+" PRIVATE-TEXT-FIXTURE"};
 const clip=A.narration(A.offline(input));
 assert.equal(clip.kind,"result_discrepancy");assert.ok(!JSON.stringify(clip).includes("PRIVATE-TEXT-FIXTURE"));
 assert.ok(clip.frames.some(f=>f.evidence.some(e=>e.quote.includes("RECEIVE_RESULT"))));
 assert.equal(clip.model_generated,false);
 assert.equal(A.narration(A.offline({...input,version:"15.0"})),null);
});
test("live batch must be explicitly enabled and refuses unverified inputs",async()=>{
 await assert.rejects(A.runBatch(manifest.cases,{mode:"compare"}),/explicit live/);
 const report=await A.runBatch(manifest.cases,{mode:"compare",live:true,request:()=>assert.fail("No network")});
 assert.equal(report.summary.review_required,7);assert.equal(report.summary.model_attempts,0);
});
test("batch isolates invalid cases, deduplicates IDs and reuses identical video artifacts",async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),"zebra-batch-test-"));let renders=0;
 try{
  const a=manifest.cases[0],b={...a,case_id:"another"};
  const report=await A.runBatch([a,b,a,{case_id:"missing",question:""},manifest.cases[5]],{videos:true,outDir:dir,render:async clip=>{renders++;return {video:Buffer.from("test-fixture"),captions:"WEBVTT\n",receipt:{kind:clip.kind,duration_seconds:2}}}});
  assert.equal(renders,1);assert.equal(report.summary.failed,1);assert.equal(report.summary.review_required,1);
  assert.equal(report.records[1].video.reused,true);assert.equal(report.records[4].video.status,"not_generated");
 }finally{await fs.rm(dir,{recursive:true,force:true})}
});
