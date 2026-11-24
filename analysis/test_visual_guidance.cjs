"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const vm=require("node:vm");
const path=require("node:path");
const P=require("../classroom/guidance-planner.js");
const V=require("../classroom/guidance-visual.js");
const I=require("../classroom/guidance-intake.js");
const scan="https://techdocs.zebra.com/datawedge/6-8/guide/api/softscantrigger/";
const codes="https://techdocs.zebra.com/datawedge/6-8/guide/api/resultinfo/";
const base={question:"Why might the software scan trigger fail to start scanning in DataWedge 6.8?",product:"datawedge",version:"6.8",context:"",source_urls:[scan]};
const p=P.prepare(base);
test("scan flow is source-linked with four conceptual stages",()=>{
 const g=V.graph(p);
 assert.equal(g.kind,"scan_prerequisite");assert.equal(g.columns.length,4);assert.equal(g.next.id,"profile");
 assert.equal(g.nodes.find(n=>n.id==="profile").evidence[0].url,scan);
 assert.equal(g.device_tested,false);assert.equal(g.visual_model_calls,0);
 assert.ok(g.links.every(l=>l.relation==="guide_sequence_not_causal_proof"));
});
test("all nine scan conditions choose the first unresolved gate without claiming success",()=>{
 const expected={unknown:{unknown:"profile",busy:"profile",ready:"profile"},disabled:{unknown:"profile",busy:"profile",ready:"profile"},enabled:{unknown:"scanner",busy:"scanner",ready:"outcome"}};
 for(const profile of Object.keys(expected))for(const scanner of Object.keys(expected[profile])){
  const g=V.graph(p,{}, {profile,scanner});
  assert.equal(g.next.id,expected[profile][scanner],profile+"/"+scanner);
  assert.equal(g.device_tested,false);assert.equal(g.observation_status,"hypothetical_or_unverified");
  assert.ok(!g.nodes.some(n=>/success verified|device verified/i.test(n.caption)));
 }
 const last=V.graph(p,{}, {profile:"enabled",scanner:"ready"});
 assert.match(last.next.text,/success is not established/);
});
test("busy scanner cannot bypass disabled or unknown profile",()=>{
 for(const profile of ["disabled","unknown"]){
  const g=V.graph(p,{}, {profile,scanner:"busy"});
  assert.equal(g.next.id,"profile");assert.equal(g.nodes.find(n=>n.id==="scanner").status,"waiting");
 }
});
test("unknown condition enum is normalized, not invented",()=>{
 assert.deepEqual(V.normalizeState({profile:"magic",scanner:"invalid"}),{profile:"unknown",scanner:"unknown"});
});
test("missing edition suppresses all specific evidence",()=>{
 const g=V.graph(P.prepare({...base,version:""}));
 assert.equal(g.kind,"scope_required");assert.equal(g.controls.length,0);assert.ok(g.nodes.every(n=>n.evidence.length===0));
});
test("different edition does not inherit cached visual template",()=>{
 const g=V.graph(P.prepare({...base,version:"15.0",source_urls:[]}));
 assert.equal(g.kind,"source_route");assert.ok(g.nodes.every(n=>n.evidence.every(e=>!e.quote)));
});
test("unrelated question with an explicit article does not get a mismatched diagram",()=>{
 const g=V.graph(P.prepare({...base,question:"How can I configure an unrelated application permission?"}));
 assert.equal(g.kind,"source_route");
});
test("result code comparison keeps both source spellings and no correct-device conclusion",()=>{
 const q=P.prepare({...base,question:"Why do the DataWedge result codes mention RECEIVE_RESULT and SEND_RESULT?",source_urls:[codes]});
 const g=V.graph(q);
 assert.equal(g.kind,"result_discrepancy");assert.deepEqual(g.columns[1],["overview","prototype"]);
 assert.match(g.nodes.find(n=>n.id==="overview").evidence[0].quote,/RECEIVE_RESULT/);
 assert.match(g.nodes.find(n=>n.id==="prototype").evidence[0].quote,/SEND_RESULT/);
 assert.match(g.next.text,/Do not choose/);assert.equal(g.controls.length,0);
});
test("live retrieval without matching passages falls back rather than implying cached evidence is current",()=>{
 const g=V.graph(p,{sources:[{url:scan,text:"This excerpt is unrelated to the required passages."}]});
 assert.equal(g.kind,"source_route");
});
test("live matching evidence is labeled retrieved with receipt, not cached",()=>{
 const card=I.offlineEvidence(p).cards[0];
 const g=V.graph(p,{sources:[{url:scan,text:card.sections.map(s=>s.quote).join("\n"),id:"E1",retrieved_at:"2026-11-24T12:00:00Z",excerpt_sha256:"sample-hash"}]});
 assert.equal(g.kind,"scan_prerequisite");
 const e=g.nodes.find(n=>n.id==="scanner").evidence[0];
 assert.equal(e.origin,"retrieved_excerpt");assert.equal(e.evidence_id,"E1");assert.equal(e.excerpt_sha256,"sample-hash");
});
test("two topics do not silently create an invented causal graph",()=>{
 const g=V.graph(P.prepare({...base,question:"How do software scan trigger and SEND_RESULT interact?",source_urls:[scan,codes]}));
 assert.equal(g.kind,"scope_required");assert.equal(g.controls.length,0);
});
test("exploration is not a reported context until explicitly confirmed",()=>{
 const g=V.graph(p,{}, {profile:"enabled",scanner:"busy"});
 assert.equal(V.reportedContext(g,false),"");
 assert.match(V.reportedContext(g,true),/User-reported observations \(not independently verified\)/);
 assert.match(V.reportedContext(g,true),/scanner busy at command time/);
 assert.equal(V.receipt(g).observation_status,"hypothetical_or_unverified");
 assert.equal(V.receipt(g,{reported:true}).observation_status,"user_reported_not_verified");
 assert.equal(V.receipt(V.graph(p),{reported:true}).observation_status,"hypothetical_or_unverified");
});
test("only explicitly selected facts may transfer to context",()=>{
 const g=V.graph(p,{}, {profile:"enabled"});
 assert.match(V.reportedContext(g,true),/Barcode Input enabled/);
 assert.ok(!V.reportedContext(g,true).includes("scanner"));
});
test("browser module matches server-side pure logic and page scripts parse",()=>{
 const context=vm.createContext({URL});
 for(const file of ["guidance-planner.js","guidance-intake.js","guidance-visual.js"])vm.runInContext(fs.readFileSync(path.join(__dirname,"../classroom",file),"utf8"),context);
 const browser=vm.runInContext("ZebraVisual.graph(ZebraGuidance.prepare("+JSON.stringify(base)+"))",context);
 assert.deepEqual(JSON.parse(JSON.stringify(browser)),V.graph(p));
 const html=fs.readFileSync(path.join(__dirname,"../classroom/answer-guidance.html"),"utf8");
 assert.match(html,/id="visionBox"/);assert.match(html,/src="guidance-visual.js"/);
 for(const m of html.matchAll(/<script>([\s\S]*?)<\/script>/g))new vm.Script(m[1]);
});

const S=require("../classroom/guidance-storyboard.js");
const config="https://techdocs.zebra.com/datawedge/15-0/guide/api/setconfig/";
const configInput={question:"How should PARAM_LIST and PLUGIN_CONFIG be nested in DataWedge 15.0 SET_CONFIG?",product:"datawedge",version:"15.0",context:"",source_urls:[config]};
test("configuration hierarchy is edition pinned and only supported by matching official evidence",()=>{
 const plan=P.prepare(configInput),g=V.graph(plan);
 assert.equal(g.kind,"configuration_hierarchy");
 assert.deepEqual(g.columns.flat(),["main","plugin","params","boundary"]);
 assert.equal(g.controls.length,0);assert.equal(g.device_tested,false);
 assert.ok(g.nodes.find(n=>n.id==="params").evidence.every(e=>e.url===config));
 assert.match(g.nodes.find(n=>n.id==="params").evidence[0].quote,/parameter list bundle nested/);
 assert.equal(V.graph(P.prepare({...configInput,version:"6.8",source_urls:[]})).kind,"source_route");
 assert.equal(V.graph(plan,{sources:[{url:config,text:"Only the main bundle is described here."}]}).kind,"source_route");
});
test("three explanation scenes are distinct and all retain source provenance",()=>{
 const comparison=P.prepare({...base,question:"Why do RECEIVE_RESULT and SEND_RESULT differ in result codes?",source_urls:[codes]});
 const graphs=[V.graph(p),V.graph(comparison),V.graph(P.prepare(configInput))];
 assert.deepEqual(graphs.map(g=>S.build(g).scene),["diagnostic","comparison","containment"]);
 for(const g of graphs){
  const story=S.build(g);
  assert.deepEqual(story.frames.map(f=>f.id),g.columns.flat());
  assert.equal(story.total_duration_ms,story.frames.length*6000);
  assert.equal(story.video_file,false);assert.equal(story.model_generated,false);assert.equal(story.device_tested,false);
  for(const f of story.frames)assert.deepEqual(f.evidence,g.nodes.find(n=>n.id===f.id).evidence);
 }
});
test("storyboard exposes a neutral scope fallback for missing context",()=>{
 const g=V.graph(P.prepare({...base,version:""})),story=S.build(g);
 assert.equal(story.scene,"scope");
 assert.equal(story.frames.some(f=>f.evidence.some(e=>e.quote)),false);
 assert.equal(story.model_generated,false);
});
test("portable storyboard does not mutate the visual map and can be serialized",()=>{
 const g=V.graph(p),before=JSON.stringify(g),story=S.build(g);
 assert.equal(JSON.stringify(g),before);
 assert.deepEqual(JSON.parse(JSON.stringify(story)),story);
 assert.equal(story.representation,"authored_conceptual_illustration");
});
test("storyboard rejects missing, duplicated or invalid nodes",()=>{
 const g=V.graph(p);
 assert.throws(()=>S.build({}));
 assert.throws(()=>S.build({...g,columns:[["not-a-node"]]}));
 assert.throws(()=>S.build({...g,columns:[["command"],["command"]]}));
});
test("seek index is bounded and invalid input cannot access nonexistent frames",()=>{
 const story=S.build(V.graph(p));
 for(const [input,want] of [[-20,0],[100,3],[2.7,2],[NaN,0],[Infinity,0]])assert.equal(S.clampIndex(story,input),want);
});
test("browser storyboard contract equals the Node contract",()=>{
 const context=vm.createContext({URL});
 vm.runInContext(fs.readFileSync(path.join(__dirname,"../classroom/guidance-storyboard.js"),"utf8"),context);
 const g=V.graph(P.prepare(configInput));
 const actual=vm.runInContext("ZebraStoryboard.build("+JSON.stringify(g)+")",context);
 assert.deepEqual(JSON.parse(JSON.stringify(actual)),S.build(g));
});
