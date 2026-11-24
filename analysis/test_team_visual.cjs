"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const T=require("../classroom/guidance-team-bridge.js"),S=require("../classroom/guidance-storyboard.js"),P=require("../classroom/guidance-planner.js");
const k=T.defaultReader;
test("team pilot preserves reader identity and historical reported version separately from article edition",()=>{
 const r=T.get(k),h=T.handoff(k);
 assert.equal(r.key,"dw62-intent-receiver");assert.equal(r.release,"r61");assert.equal(r.catalog_release_observed,"r62");
 assert.equal(h.reported_version,"6.2.23");assert.equal(h.reader_document_edition,"6.2");assert.equal(h.version,"");
 assert.deepEqual(h.source_urls,[]);assert.equal(h.case_id,"");assert.equal(h.official_source_verified,false);
 assert.match(h.archive_url,/922f359fe59e4cce01420af7e234cf016d93171c/);assert.match(h.report_url,/developer\.zebra\.com/);
});
test("strict query contract rejects unknown reader, arbitrary fields and duplicates",()=>{
 assert.equal(T.keyFromSearch("?reader="+k),k);
 for(const s of ["","?reader=unknown","?reader="+k+"&reader="+k,"?reader="+k+"&question=private","?reader="+encodeURIComponent("https://evil.example"),"?reader="+k+"&source=anything","?reader="+k+"x"])assert.equal(T.keyFromSearch(s),null);
 assert.equal(T.get("constructor"),null);assert.equal(T.graph("unknown"),null);
});
test("handoff remains a historical paraphrase, not a verified case or model input receipt",()=>{
 const h=T.handoff(k),p=P.prepare({...h,action:"plan"});
 assert.equal(h.question_origin,"paraphrased_public_report_not_blind_test");
 assert.equal(p.state,"clarification_required");assert.equal(p.installed_version_verified,false);assert.equal(p.global_pattern_validated,false);
 assert.equal(p.case_id,"");assert.equal(h.model_calls,0);
});
test("two paths retain source types and cannot become a device diagnosis",()=>{
 const map=T.graph(k);
 assert.equal(map.kind,"reported_path_comparison");assert.equal(map.device_tested,false);
 assert.equal(map.observation_status,"archived_public_self_report_unverified");
 assert.equal(map.nodes.find(n=>n.id==="test").caption,"Reported received");
 assert.equal(map.nodes.find(n=>n.id==="scan").caption,"Reported not received");
 assert.match(map.nodes.find(n=>n.id==="boundary").caption,/unresolved/);
 assert.equal(map.nodes.find(n=>n.id==="test").evidence[0].origin,"public_forum_report");
 assert.equal(map.nodes.find(n=>n.id==="boundary").evidence[0].origin,"team_release_note");
 assert.ok(map.nodes.every(n=>n.evidence.every(e=>e.origin!=="checked_source_card")));
 const story=S.build(map);assert.equal(story.scene,"reported_paths");assert.equal(story.video_file,false);assert.equal(story.model_generated,false);
 assert.deepEqual(story.frames.map(f=>f.id),["report","test","scan","boundary"]);
});
test("optional check is not an evaluation or a model-quality result",()=>{
 assert.equal(T.checkpoint(k,"yes").correct,false);assert.equal(T.checkpoint(k,"no").correct,true);
 assert.equal(T.checkpoint(k,"unknown").correct,false);assert.equal(T.checkpoint(k,"invalid"),null);
 assert.equal(T.checkpoint("unknown","no"),null);assert.equal(T.checkpoint(k,"no").scope,"single_optional_concept_check_not_evaluation");
});
test("browser companion uses same bounded registry and renders through shared story engine",()=>{
 const ctx=vm.createContext({URL,URLSearchParams});
 vm.runInContext(fs.readFileSync(path.join(__dirname,"../classroom/guidance-team-bridge.js"),"utf8"),ctx);
 assert.deepEqual(JSON.parse(JSON.stringify(ctx.ZebraTeamVisual.graph(k))),T.graph(k));
 const page=fs.readFileSync(path.join(__dirname,"../classroom/visual-companion.html"),"utf8");
 assert.match(page,/src="guidance-team-bridge.js"/);assert.match(page,/src="guidance-storyboard.js"/);
 assert.doesNotMatch(page,/<(?:iframe|img|video)\b/i);
 for(const m of page.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
});
