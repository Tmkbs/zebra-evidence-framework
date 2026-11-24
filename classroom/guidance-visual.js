/* Interactive evidence maps for the existing Ask & Guide workflow.
 * Version-pinned, source-linked and deterministic. No hardware, network or model
 * calls. The display is a conceptual decision aid, not a device simulation.
 */
(function(root,factory){
 const intake=typeof module==="object"&&module.exports?require("./guidance-intake.js"):root.ZebraIntake;
 const api=factory(intake);
 if(typeof module==="object"&&module.exports)module.exports=api;
 else root.ZebraVisual=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(Intake){
"use strict";
const SCAN="https://techdocs.zebra.com/datawedge/6-8/guide/api/softscantrigger/";
const RESULT="https://techdocs.zebra.com/datawedge/6-8/guide/api/resultinfo/";
const CONFIG="https://techdocs.zebra.com/datawedge/15-0/guide/api/setconfig/";
const SCAN_PROFILE="Functional only when Barcode Input is enabled in the active Profile.";
const SCAN_BUSY="commands might be ignored if the scanner is busy";
const RESULT_PROSE="intent extras RECEIVE_RESULT and COMMAND_IDENTIFIER";
const RESULT_CODE='i.putExtra("SEND_RESULT","true");';
const fields=Object.freeze({
 profile:{label:"Barcode Input in active profile",choices:[["unknown","Not checked"],["enabled","Enabled"],["disabled","Disabled"]]},
 scanner:{label:"Scanner state at command time",choices:[["unknown","Not checked"],["ready","Ready"],["busy","Busy"]]}
});
function normalizeState(state={}){
 const choose=(field)=>fields[field].choices.some(x=>x[0]===state?.[field])?state[field]:"unknown";
 return {profile:choose("profile"),scanner:choose("scanner")};
}
function articleURL(value){
 try{const u=new URL(value);u.hash="";return u.href}catch{return ""}
}
function chooseEvidence(plan,result,url,definitions,version="6.8"){
 if(!plan||plan.state!=="ready_for_source_retrieval"||plan.product!=="datawedge"||plan.version!==version||
    !(plan.source_urls||[]).some(s=>articleURL(s)===url))return null;
 // A new retrieved excerpt takes precedence. Never silently represent an
 // older curated card as current evidence when a live excerpt lacks it.
 if(Array.isArray(result?.sources)){
  const source=result.sources.find(s=>articleURL(s.url)===url&&typeof s.text==="string");
  if(!source||!definitions.every(d=>source.text.includes(d.quote)))return null;
  return definitions.map(d=>({...d,url,origin:"retrieved_excerpt",retrieved_at:source.retrieved_at||null,evidence_id:source.id||null,excerpt_sha256:source.excerpt_sha256||null}));
 }
 const card=Intake.offlineEvidence(plan).cards.find(c=>c.url===url);
 if(!card||!definitions.every(d=>card.sections.some(s=>s.quote===d.quote)))return null;
 return definitions.map(d=>({...d,url,origin:"checked_source_card",checked:card.checked}));
}
function node(id,title,caption,status,detail,evidence=[]){
 return {id,title,caption,status,detail,evidence};
}
function make(kind,title,summary,columns,next,nodes,controls=[],state={}){
 const ids=new Set(nodes.map(n=>n.id));
 if(columns.flat().some(id=>!ids.has(id))||!ids.has(next.id))throw Error("Invalid visual map");
 const links=[];
 for(let i=1;i<columns.length;i++)for(const from of columns[i-1])for(const to of columns[i])links.push({from,to,relation:"guide_sequence_not_causal_proof"});
 return {schema:"zebra-visual-guide/v1",kind,title,summary,columns,links,nodes,next,controls,state,
  device_tested:false,visual_model_calls:0,observation_status:"hypothetical_or_unverified",publication_approved:false};
}
function graph(plan,result={},inputState={}){
 if(!plan||plan.schema!=="zebra-answer-plan/v1")throw Error("A prepared guidance plan is required");
 const state=normalizeState(inputState);
 const genericStart=node("question","Developer question","Scope the request","input",plan.question);
 if(plan.state!=="ready_for_source_retrieval"){
  const need=plan.clarification||[];
  return make("scope_required","Context before advice","Missing context blocks version-specific visual guidance.",
   [["question"],["scope"],["next"]],{id:"scope",text:need[0]||"Clarify the missing context."},
   [genericStart,node("scope","Missing information","Clarify first","check",need.join(" ")),node("next","Find applicable evidence","Waiting for context","waiting","Do not transfer guidance from a different product or edition.")]);
 }
 const scanRelevant=/\b(?:soft[_ ]?scan[_ ]?trigger|(?:start|stop|toggle)[_ ]?scanning|software scan(?:ning)? trigger|scanner status)\b/i.test(plan.question);
 const resultRelevant=/\b(?:receive_result|send_result|result codes?|command result|result intent)\b/i.test(plan.question);
 const scan=scanRelevant?chooseEvidence(plan,result,SCAN,[
  {section:"SOFT_SCAN_TRIGGER",quote:SCAN_PROFILE},
  {section:"Sample SCANNER_STATUS notification",quote:SCAN_BUSY}
 ]):null;
 const codes=resultRelevant?chooseEvidence(plan,result,RESULT,[
  {section:"Overview",quote:RESULT_PROSE},
  {section:"Function Prototype",quote:RESULT_CODE}
 ]):null;
 const configRelevant=/\b(?:set[_ ]?config|plugin_config|param_list|nested bundles?)\b/i.test(plan.question);
 const config=configRelevant?chooseEvidence(plan,result,CONFIG,[
  {section:"MAIN BUNDLE",quote:"A bundle array (nested within the main bundle)"},
  {section:"PLUGIN_CONFIG BUNDLE",quote:"A parameter list bundle nested within the PLUGIN_CONFIG bundle"}
 ],"15.0"):null;
 // Two independently applicable maps are not merged into an invented
 // dependency. Ask for a single focus if both topics were selected.
 if(scan&&codes){
  return make("scope_required","Choose a focus","Two supported topics match. Split them into separate questions instead of joining unrelated evidence.",
   [["question"],["scope"],["next"]],{id:"scope",text:"Choose either scan-trigger prerequisites or result-code naming."},
   [genericStart,node("scope","Two topics","Narrow the request","check","Separate the scan trigger from result-code naming before using a visual template."),node("next","Inspect the selected source","Pending scope","waiting","No combined device behavior is inferred.")]);
 }
 if(config){
  return make("configuration_hierarchy","SET_CONFIG — nested bundle structure","Inspect the containment relationships in DataWedge 15.0. This is a structural explanation, not executable configuration or a claim that a device accepted it.",
   [["main"],["plugin"],["params"],["boundary"]],{id:"params",text:"Place each parameter list inside its own plugin configuration; check the selected plugin's parameter table and verify on the target build."},
   [node("main","Main configuration","SET_CONFIG","source","The main bundle contains the plugin configuration array.",[config[0]]),
    node("plugin","Plugin configuration","PLUGIN_CONFIG","source","Each plugin configuration describes its own settings and contains its corresponding parameter list.",config),
    node("params","Parameter list","PARAM_LIST","source","The parameter list is inside the plugin configuration, not a peer of it at the top level.",[config[1]]),
    node("boundary","Validation boundary","No device execution","check","The hierarchy only explains documented containment. It does not verify parameter names, values, or the behavior of an actual device.")]);
 }
 if(scan){
  let next;
  const p=state.profile,s=state.scanner;
  if(p==="unknown")next={id:"profile",text:"Inspect the active profile and determine whether Barcode Input is enabled."};
  else if(p==="disabled")next={id:"profile",text:"The selected disabled input does not satisfy the documented prerequisite. Review the active profile before retrying."};
  else if(s==="unknown")next={id:"scanner",text:"Check scanner status at the time of the command."};
  else if(s==="busy")next={id:"scanner",text:"The selected busy state is a documented reason a command may be ignored. Inspect SCANNER_STATUS and verify readiness before retrying."};
  else next={id:"outcome",text:"Both selected conditions meet the documented checks. Reproduce the command on the target build and inspect its result/logs; success is not established."};
  const ps=p==="unknown"?"check":p==="disabled"?"blocked":"selected";
  const ss=p!=="enabled"?"waiting":s==="unknown"?"check":s==="busy"?"blocked":"selected";
  const nodes=[
   node("command","App command","SOFT_SCAN_TRIGGER","input","Conceptual start: a developer attempts a software scan trigger in DataWedge 6.8."),
   node("profile","Active profile",p==="unknown"?"Input not checked":p==="enabled"?"Input selected enabled":"Input selected disabled",ps,
    "The selected state is hypothetical or user-reported, never read from hardware. The official article makes Barcode Input a prerequisite.",[scan[0]]),
   node("scanner","Scanner readiness",p!=="enabled"?"Check profile first":s==="unknown"?"Status not checked":s==="busy"?"Selected busy":"Selected ready",ss,
    "A busy scanner may ignore the trigger. Check the status mechanism in the version-specific article.",[scan[1]]),
   node("outcome","Next diagnostic action","Device result unverified",next.id==="outcome"?"check":"waiting",
    next.id==="outcome"?next.text:"Resolve the highlighted prerequisite before concluding anything about the device.")
  ];
  return make("scan_prerequisite","Software scan trigger — decision map","Inspect a documented prerequisite, then scanner readiness. Explore conditions; this is not a simulated scanner.",
   [["command"],["profile"],["scanner"],["outcome"]],next,nodes,["profile","scanner"].map(id=>({id,...fields[id]})),state);
 }
 if(codes){
  return make("result_discrepancy","Result codes — evidence comparison","The same edition uses two different parameter spellings. Inspect the prose and prototype separately.",
   [["question"],["overview","prototype"],["boundary"]],{id:"boundary",text:"Do not choose a parameter from this discrepancy alone. Confirm the target API, actual installed build and observed result/logs; escalate the wording conflict for review."},
   [genericStart,
    node("overview","Overview","RECEIVE_RESULT","source","The prose uses this exact parameter spelling.",[codes[0]]),
    node("prototype","Function prototype","SEND_RESULT","source","The code uses a different exact spelling.",[codes[1]]),
    node("boundary","Unresolved discrepancy","No device conclusion","check","These are two passages, not two independent failure cases. Their different spellings alone do not determine the correct device behavior.",codes)]);
 }
 return make("source_route","Evidence route","No checked visual template matches this question and exact evidence. The generic map makes no additional technical claims.",
   [["question"],["edition"],["source"],["next"]],{id:"source",text:Array.isArray(result.sources)?"Inspect the retrieved excerpt and check whether it answers the question.":"Retrieve and inspect the version-specific official article before offering detailed guidance."},
   [genericStart,node("edition","Version scope",plan.product+" "+plan.version,"reported","Reported edition is not verified on-device."),
    node("source","Official source route",(plan.source_urls||[]).length+" selected link(s)","check","An applicable source link is not proof of content or answer accuracy.",
     (plan.source_urls||[]).map(url=>({url,section:"Selected article",origin:"selected_link"}))),
    node("next","Evidence-aware answer","Review before use","waiting","An unsupported topic does not get an invented visual explanation.")]);
}
function reportedContext(map,confirmed){
 if(!confirmed||map?.kind!=="scan_prerequisite")return "";
 const s=normalizeState(map.state),parts=[];
 if(s.profile!=="unknown")parts.push("active-profile Barcode Input "+s.profile);
 if(s.scanner!=="unknown")parts.push("scanner "+s.scanner+" at command time");
 return parts.length?"User-reported observations (not independently verified): "+parts.join("; ")+".":"";
}
function receipt(map,{reported=false}={}){
 return {...map,observation_status:reported&&reportedContext(map,true)?"user_reported_not_verified":"hypothetical_or_unverified"};
}
function render(container,map,{focus="",confirmed=false,reported=false,onFocus=()=>{},onState=()=>{},onConfirm=()=>{},onReport=()=>{}}={}){
 const doc=container.ownerDocument||document;
 const el=(tag,value="",cls="")=>{const x=doc.createElement(tag);x.textContent=String(value);if(cls)x.className=cls;return x};
 const nodes=new Map(map.nodes.map(n=>[n.id,n]));
 const selected=nodes.get(focus)||nodes.get(map.next.id)||map.nodes[0];
 container.replaceChildren();
 const heading=el("div","","vision-heading");
 heading.append(el("div","INTERACTIVE VISION / "+map.kind.replaceAll("_"," ").toUpperCase(),"vision-kicker"),el("h2",map.title),el("p",map.summary,"muted"));
 container.append(heading);
 const diagram=el("div","","vision-flow");
 diagram.setAttribute("aria-label","Interactive evidence and diagnostic sequence");
 for(let i=0;i<map.columns.length;i++){
  if(i){const arrow=el("div","→","vision-arrow");arrow.setAttribute("aria-hidden","true");diagram.append(arrow)}
  const col=el("div","","vision-lane");
  for(const id of map.columns[i]){
   const n=nodes.get(id),b=el("button","","vision-node vision-"+n.status+(id===map.next.id?" vision-current":""));
   b.type="button";b.dataset.visionNode=id;b.setAttribute("aria-pressed",String(id===selected.id));
   b.append(el("span",n.status==="reported"?"REPORTED SCOPE":n.status==="selected"?(reported?"SELF-REPORTED":"SCENARIO INPUT"):n.status==="source"?"SOURCE TEXT":n.status==="waiting"?"PENDING":n.status==="blocked"?"CHECK BLOCKED":n.status==="check"?"CHECK NEEDED":"QUESTION","vision-node-status"),el("strong",n.title),el("span",n.caption,"vision-node-caption"));
   b.addEventListener("click",()=>onFocus(id));col.append(b)
  }
  diagram.append(col);
 }
 container.append(diagram);
 const next=el("div","","vision-next");next.setAttribute("role","status");next.append(el("div","NEXT CHECK","vision-kicker"),el("strong",map.next.text));
 container.append(next);
 const panel=el("div","","vision-inspector");panel.append(el("div","SELECTED NODE","vision-kicker"),el("h3",selected.title),el("p",selected.detail));
 for(const e of selected.evidence){
  const evidence=el("div","","vision-quote");evidence.append(el("strong",e.section||"Official source"));
  if(e.quote)evidence.append(el("blockquote",e.quote));
  const meta=e.origin==="retrieved_excerpt"?"Retrieved excerpt · "+(e.retrieved_at||"time not recorded"):e.origin==="checked_source_card"?"Checked source card · "+e.checked:"Selected source link · content not checked here";
  evidence.append(el("div",meta,"muted"));
  try{const u=new URL(e.url);if(u.protocol==="https:"&&u.hostname==="techdocs.zebra.com"){const a=el("a","Read official article ↗");a.href=u.href;a.target="_blank";a.rel="noopener noreferrer";evidence.append(a)}}catch{}
  panel.append(evidence)
 }
 container.append(panel);
 if(map.controls.length){
  const ctrl=el("div","","vision-controls");ctrl.append(el("h3","Explore the decision"));
  ctrl.append(el("p","Change these conditions to see the next check update. By default they are scenario inputs, not observations from a real device.","muted"));
  for(const f of map.controls){
   const group=el("div","","vision-control");group.setAttribute("role","group");group.setAttribute("aria-label",f.label);group.append(el("strong",f.label));
   const opts=el("div","","vision-options");
   for(const [value,label] of f.choices){
    const b=el("button",label,"vision-option");b.type="button";b.dataset.visionField=f.id;b.dataset.visionValue=value;
    b.setAttribute("aria-pressed",String(map.state[f.id]===value));b.addEventListener("click",()=>onState({...map.state,[f.id]:value}));opts.append(b)
   }
   group.append(opts);ctrl.append(group)
  }
  const check=el("label","","check");const checkbox=el("input");checkbox.type="checkbox";checkbox.checked=!!confirmed;checkbox.addEventListener("change",()=>onConfirm(checkbox.checked));check.append(checkbox,el("span","These selections describe my actual observations, not just a demo."));
  const report=el("button","Use as reported context for next answer");report.type="button";report.disabled=!reportedContext(map,confirmed);report.addEventListener("click",()=>onReport(reportedContext(map,confirmed)));
  ctrl.append(check,report,el("p",reported?"Context applied as self-reported; no hardware validation.":"Selections are not sent to a model unless you explicitly use them as reported context.","muted"));container.append(ctrl)
 }
 container.append(el("p","Conceptual guidance map · not a device simulation, a verified repair, or a measured model result.","vision-foot"));
 return selected.id;
}
return Object.freeze({graph,normalizeState,reportedContext,receipt,render});
});
