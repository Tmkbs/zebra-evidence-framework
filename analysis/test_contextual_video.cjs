"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const P=require("../classroom/guidance-planner.js"),V=require("../classroom/guidance-visual.js"),T=require("../classroom/guidance-team-bridge.js"),S=require("../classroom/guidance-storyboard.js");
const q=(question,version,url)=>P.prepare({question,product:"datawedge",version,context:"",source_urls:url?[url]:[]});
const scan=q("Why might the software scan trigger fail to start scanning?", "6.8","https://techdocs.zebra.com/datawedge/6-8/guide/api/softscantrigger/");
const compare=q("Why do the result codes mention RECEIVE_RESULT and SEND_RESULT?", "6.8","https://techdocs.zebra.com/datawedge/6-8/guide/api/resultinfo/");
const config=q("How should PARAM_LIST and PLUGIN_CONFIG be nested in SET_CONFIG?", "15.0","https://techdocs.zebra.com/datawedge/15-0/guide/api/setconfig/");
const profiles=q("What is DataWedge, and how do its profiles handle input and output?", "15.0");
const maps=[V.graph(scan),V.graph(compare),V.graph(config),V.graph(profiles),T.graph(T.defaultReader)];
test("all reviewed visual forms can use the same short-video plan",()=>{
 assert.deepEqual(maps.map(m=>S.videoPlan(m)?.scene),["diagnostic","comparison","containment","data_path","reported_paths"]);
 for(const m of maps){
  const p=S.videoPlan(m);assert.equal(p.schema,"zebra-contextual-clip/v1");assert.equal(p.device_recording,false);
  assert.equal(p.device_tested,false);assert.equal(p.model_generated,false);
  assert.equal(p.total_duration_ms,p.frames.reduce((n,f)=>n+f.duration_ms,0));assert.ok(p.total_duration_ms<=60000);
  assert.deepEqual(p.frames.map(f=>f.caption),S.build(m).frames.map(f=>f.caption.trim()));
  assert.ok(p.source_links.length>0);assert.ok(p.frames.every(f=>f.duration_ms>=5500&&f.duration_ms<=10500));
  assert.equal(p.frames.some(f=>f.evidence.some(e=>e.quote)),true);
 }
});
test("unmatched questions and missing editions cannot get a technical video",()=>{
 assert.equal(S.videoPlan(V.graph(P.prepare({...scan,version:"",source_urls:[]}))),null);
 assert.equal(S.videoPlan(V.graph(q("Why does my unrelated application fail?", "15.0","https://techdocs.zebra.com/datawedge/15-0/guide/profiles/"))),null);
 assert.equal(S.videoPlan({kind:"unknown"}),null);
});
test("clip plans retain forum and secondary-summary provenance, without inventing official evidence",()=>{
 const p=S.videoPlan(maps.at(-1));
 assert.ok(p.frames.some(f=>f.evidence.some(e=>e.origin==="public_forum_report"&&e.archive_url.includes("922f359fe59e4cce01420af7e234cf016d93171c"))));
 assert.ok(p.frames.some(f=>f.evidence.some(e=>e.origin==="team_release_note")));
 assert.ok(p.frames.every(f=>f.evidence.every(e=>!["retrieved_excerpt","checked_source_card"].includes(e.origin))));
 assert.ok(!Object.hasOwn(p,"video_file"));
});
test("a supported scene still needs reviewed evidence and complete short captions",()=>{
 const m=JSON.parse(JSON.stringify(maps[0]));
 for(const n of m.nodes)n.evidence=[];
 assert.equal(S.videoPlan(m),null);
 const long=JSON.parse(JSON.stringify(maps[0]));long.nodes[0].detail="x".repeat(521);
 assert.throws(()=>S.videoPlan(long),/complete scene caption/);
});
test("planning alone does not require a browser or produce encoded bytes",async()=>{
 assert.equal(S.videoSupport(null),"");
 await assert.rejects(S.renderClip(maps[0]),/browser document/);
 assert.equal(S.build(maps[0]).video_file,false);
});
