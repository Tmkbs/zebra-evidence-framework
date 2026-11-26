"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const P=require("../classroom/guidance-planner.js"),I=require("../classroom/guidance-intake.js"),V=require("../classroom/guidance-visual.js"),S=require("../classroom/guidance-storyboard.js"),B=require("./batch-answer.cjs");
const input=require("./document-lesson-pilot.json").cases[0];
test("r62 EHS document proposal becomes a reusable, source-backed video lesson",()=>{
 const p=P.prepare(input),packet=I.offlineEvidence(p),g=V.graph(p,{offline_evidence:packet}),v=S.videoPlan(g);
 assert.equal(p.source_urls.length,2);assert.equal(packet.cards.length,2);assert.equal(g.kind,"document_lesson");assert.equal(g.lesson_id,"ehs-settings-access-r62");
 assert.equal(v.frames.length,4);assert.ok(v.frames.every(f=>f.evidence.length&&f.evidence.every(e=>e.origin==="checked_source_card"&&e.quote)));
 assert.equal(v.source_links.length,2);assert.equal(v.device_tested,false);assert.equal(v.model_generated,false);
 const media=I.contextualMedia(p,g);assert.equal(I.checkUnderstanding(media,"no").correct,true);assert.equal(I.checkUnderstanding(media,"yes").correct,false);
 assert.match(g.team_reader_url,/ehs40-settings-access/);
});
test("unrelated question, unestablished edition, mismatched edition, or missing sources do not get a video",()=>{
 const p=P.prepare(input);
 for(const x of [{...input,version:""},{...input,version:"4.2"},{...input,question:"How do I configure an unrelated wallpaper?"},{...input,source_urls:[p.source_urls[0]]}]){
  assert.equal(S.videoPlan(V.graph(P.prepare(x))),null);
 }
 assert.throws(()=>P.prepare({...input,source_urls:["https://techdocs.zebra.com/ehs/4-2/guide/settings/"]}),/edition exactly/);
});
test("fresh retrieval never backfills a missing source passage with old cards",()=>{
 const p=P.prepare(input),cards=I.offlineEvidence(p).cards;
 const sources=cards.map((c,i)=>({id:"E"+i,url:c.url,text:c.sections.map(s=>s.quote).join("\n")}));
 assert.equal(V.graph(p,{sources}).kind,"document_lesson");
 assert.ok(S.videoPlan(V.graph(p,{sources})).frames.every(f=>f.evidence.every(e=>e.origin==="retrieved_excerpt")));
 assert.equal(S.videoPlan(V.graph(p,{sources:[sources[0],{...sources[1],text:"Unrelated excerpt."}]})),null);
 const g=V.graph(p);g.nodes[0].evidence=[];assert.equal(S.videoPlan(g),null);
});
test("same batch renderer accepts the second product without a model",async()=>{
 const r=await B.execute(require("./document-lesson-pilot.json"),{request:()=>assert.fail("unexpected network"),renderVideo:async row=>{assert.equal(row.visual_guide.lesson_id,"ehs-settings-access-r62");return {status:"fixture_not_encoded"}}});
 assert.equal(r.summary.narrated_video_candidates,1);assert.equal(r.summary.model_runs_completed,0);assert.equal(r.rows[0].evaluation_eligible,false);
});
