"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const B=require("./batch-answer.cjs"),fs=require("node:fs"),path=require("node:path");
const fixture=require("./batch-demo-input.json");
test("batch prepares four different reviewed video forms and blocks unsupported scopes",async()=>{
 let calls=0,rendered=[];
 const out=await B.execute(fixture,{request:()=>{calls++;throw Error("no network")},renderVideo:async row=>{rendered.push(row.id);return {status:"fixture_not_encoded"}}});
 assert.equal(calls,0);assert.equal(out.rows.length,6);assert.equal(out.summary.global_patterns_validated,0);
 assert.deepEqual(rendered,["profiles","scan-trigger","result-codes","nested-config"]);
 assert.equal(out.summary.narrated_video_candidates,4);assert.equal(out.summary.narrated_videos_encoded,0);
 assert.equal(out.rows[4].status,"clarification_required");
 assert.ok(out.rows[4].result.plan.strategies.some(s=>s.id==="version_boundary"));
 assert.equal(out.rows[5].video.status,"not_selected");
 assert.ok(out.rows.every(r=>r.evaluation_eligible===false));
 assert.ok(out.rows[1].result.plan.strategies.some(s=>s.id==="missing_prerequisite"));
 assert.ok(out.rows[2].result.plan.strategies.some(s=>s.id==="example_body_conflict"));
});
test("batch retains duplicate and missing questions without counting them as results",async()=>{
 const row=fixture.cases[0],out=await B.execute({schema:fixture.schema,cases:[row,{...row,id:"duplicate"},{...row,id:"empty",question:""}]});
 assert.deepEqual(out.rows.map(r=>r.status),["planned_or_executed","duplicate_question","missing_original_question"]);
 assert.equal(out.summary.skipped_rows,2);assert.equal(out.summary.total_rows,3);
});
test("same forum group is counted once, not as independently confirmed support",async()=>{
 const row=fixture.cases[4],url="https://developer.zebra.com/content/fixture";
 const packet={schema:fixture.schema,cases:[{...row,forum_url:url},{...row,id:"second",question:"After upgrading Enterprise Browser, the app no longer responds.",forum_url:url}]};
 const out=await B.execute(packet);
 const hit=out.summary.candidate_strategy_matches.find(s=>s.id==="version_boundary");
 assert.equal(hit.unique_question_or_forum_groups,1);
 assert.equal(out.summary.global_patterns_validated,0);
});
test("network is opt-in and denied for synthetic and unreviewed sources",async()=>{
 await assert.rejects(B.execute(fixture,{mode:"compare"}),/allow-network/);
 const out=await B.execute(fixture,{mode:"compare",allowNetwork:true,request:()=>assert.fail("network called")});
 assert.ok(out.rows.every(r=>r.status==="network_not_authorized"));assert.equal(out.summary.model_runs_completed,0);
});
test("existing public case manifest preserves paraphrases and unknown version/product",async()=>{
 const packet=B.manifestPacket(require("../classroom/public_case_manifest.json"));
 const out=await B.execute(packet);
 assert.equal(out.rows.length,3);assert.ok(out.rows.every(r=>r.question_origin==="public_report_paraphrase"&&r.origin_verified_by_operator===false&&r.result.plan.version===""&&r.result.plan.product===""));
 assert.equal(out.summary.model_runs_completed,0);assert.equal(out.summary.narrated_video_candidates,0);
});
test("CSV import does not turn recommendations into original questions",async()=>{
 const packet=B.csvPacket("Case ID,Recommendation,Target TechDocs Page / Section\nZF-1234567890abcdef,Invented recommendation,https://techdocs.zebra.com/datawedge/6-8/guide/api/resultinfo/\n");
 const out=await B.execute(packet);
 assert.equal(out.rows[0].status,"missing_original_question");
 assert.equal(out.csv_intake.eligible_for_evaluation,0);
});
test("path traversal and duplicate IDs are rejected",async()=>{
 await assert.rejects(B.execute({schema:fixture.schema,cases:[{...fixture.cases[0],id:"../outside"}]}),/case id/);
 await assert.rejects(B.execute({schema:fixture.schema,cases:[fixture.cases[0],fixture.cases[0]]}),/case id/);
});
