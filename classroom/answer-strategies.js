/* Reusable answer-strategy registry.
 * Candidate patterns are kept separate from source-backed checks and
 * workflow requirements. Provenance is inherited from the existing
 * three-case research snapshot; no pattern is promoted to validated here.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 else root.ZebraAnswerStrategies=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const VERSION_PROVENANCE={
 status:"candidate_not_validated",
 case_ids:["DW66-VERSION-BOUNDARY","DW-FORUM-00476"],
 nominal_case_count:2,reviewed_case_count:3,independent_support_count:1,validation_threshold:2,
 reused_evidence_ids:["DW15-VERSION-CHECK","DW66-MULTI-PLUGIN"],
 version_unestablished_evidence_ids:["FORUM-00476-REPORT"],
 note:"Two nominal case mentions reduce to one independent supporting case after reused evidence and the unestablished forum version are excluded."
};
const SINGLE_CASE={
 example_body_conflict:{case_ids:["DW68-RESULT-CONSISTENCY"],evidence_ids:[],status:"single_case_observation_not_validated"},
 missing_context:{case_ids:["DW-FORUM-00476"],evidence_ids:["FORUM-00476-REPORT"],status:"single_case_observation_not_validated"},
 missing_prerequisite:{case_ids:["DW68-RESULT-CONSISTENCY"],evidence_ids:[],status:"single_case_observation_not_validated"},
 naming_inconsistency:{case_ids:["DW68-RESULT-CONSISTENCY"],evidence_ids:[],status:"single_case_observation_not_validated"},
 unverified_device_claim:{case_ids:["DW68-RESULT-CONSISTENCY"],evidence_ids:[],status:"single_case_observation_not_validated"}
};
const CATALOG=Object.freeze([
 {id:"version_boundary",label:"Confirm the applicable version",category:"candidate_pattern",trigger:"The question explicitly mentions an update, upgrade, compatibility, deprecation, or version-dependent behavior.",required_context:["exact installed product version/build"],evidence_requirements:["official documentation for the same product and edition"],safe_next_action:"Ask for the installed version if it is missing; then use only the matching documentation edition.",abstain_if:"The installed version cannot be confirmed or the source edition does not match.",provenance:VERSION_PROVENANCE},
 {id:"missing_context",label:"Ask for the missing diagnostic context",category:"candidate_pattern",trigger:"The user reports a failure or unexpected behavior and has not supplied any diagnostic context.",required_context:["device/model","OS or runtime version","active profile/configuration","exact steps and observed error"],evidence_requirements:["a clear user-reported symptom; do not treat missing context as proof of a documentation defect"],safe_next_action:"Ask for the smallest missing detail that separates the likely paths; do not guess the environment.",abstain_if:"The symptom or missing detail is not clear enough to justify a focused question.",provenance:SINGLE_CASE.missing_context},
 {id:"missing_prerequisite",label:"Check a documented prerequisite",category:"candidate_pattern",trigger:"A matched official source explicitly states an enabling condition or prerequisite relevant to the question.",required_context:["the feature/action being attempted","whether the documented prerequisite is met"],evidence_requirements:["an exact, version-matched official excerpt containing the prerequisite"],safe_next_action:"Quote the prerequisite and ask whether it is satisfied before suggesting later troubleshooting.",abstain_if:"No matching official prerequisite excerpt is available.",provenance:SINGLE_CASE.missing_prerequisite},
 {id:"example_body_conflict",label:"Show both sides of a source discrepancy",category:"candidate_pattern",trigger:"The same matched official source contains both differing terms in distinct sections such as overview and function prototype.",required_context:["exact product and documentation edition"],evidence_requirements:["both exact passages from the same version-matched official source"],safe_next_action:"Present both passages and mark the discrepancy for review; do not silently choose one.",abstain_if:"Only the user's paraphrase or one side of the source is available.",provenance:SINGLE_CASE.example_body_conflict},
 {id:"naming_inconsistency",label:"Preserve exact API names",category:"candidate_pattern",trigger:"A matched source contains multiple exact API identifiers that differ in spelling.",required_context:["exact source section for each identifier"],evidence_requirements:["verbatim identifiers and their source locations"],safe_next_action:"Keep the exact spelling and show where each name appears; do not normalize or silently correct it.",abstain_if:"The identifier is inferred from memory or not present in the cited source.",provenance:SINGLE_CASE.naming_inconsistency},
 {id:"unverified_device_claim",label:"Separate documentation from device behavior",category:"candidate_pattern",trigger:"The user reports a real-device failure or asks whether a fix works, but no reproducible device test is available.",required_context:["device/build","reproduction steps","observed result or log"],evidence_requirements:["distinguish official documentation from user-reported observations"],safe_next_action:"State what the documentation says and what the report describes; label the device outcome unverified.",abstain_if:"Do not state that a device is fixed or that a root cause is established without a reproducible test.",provenance:SINGLE_CASE.unverified_device_claim}
]);
const VERSION_RE=/\b(?:after (?:a |the )?update|after updating|since (?:the )?update|after (?:an )?upgrade|after upgrading|upgrade(?:d)?|version(?:s)?|compatib(?:ility|le)|deprecated|across releases|between releases|changed in (?:version )?\d)/i;
const FAILURE_RE=/\b(?:fail(?:ed|ure|s|ing)?|error|not working|does not work|doesn't work|no longer|not received|cannot|can't|won't|stopped|not responding|does not start|won't start|problem|issue)\b/i;
const DEVICE_RE=/\b(?:device|scanner|scan|barcode|app|application|profile|trigger|broadcast|receiver|runtime|android|firmware)\b/i;
const TOKEN_A="RECEIVE_RESULT",TOKEN_B="SEND_RESULT";
function normalizeSource(s){
 const sections=Array.isArray(s?.sections)?s.sections.map(x=>({section:String(x.section||""),quote:String(x.quote||""),note:String(x.note||"")})):[];
 const text=[String(s?.text||s?.excerpt||""),...sections.flatMap(x=>[x.section,x.quote,x.note])].filter(Boolean).join("\n");
 return {id:String(s?.id||s?.evidence_id||s?.url||"unknown"),url:typeof s?.url==="string"?s.url:"",title:String(s?.title||""),sections,text};
}
function make(def,matchReason,extra={}){
 return {id:def.id,label:def.label,category:def.category,research_status:def.provenance.status,match_reason:matchReason,required_context:[...def.required_context],evidence_requirements:[...def.evidence_requirements],safe_next_action:def.safe_next_action,abstain_if:def.abstain_if,provenance:JSON.parse(JSON.stringify(def.provenance)),...extra};
}
function select(plan,evidence=[]){
 if(!plan||typeof plan!=="object")throw Error("A prepared answer plan is required");
 const question=String(plan.question||""),context=String(plan.context||""),text=question+"\n"+context;
 const version=String(plan.version||"");
 const sources=(Array.isArray(evidence)?evidence:[]).map(normalizeSource);
 const selected=[];
 const versionSensitive=VERSION_RE.test(text);
 const diagnostic=FAILURE_RE.test(text)&&DEVICE_RE.test(text);
 if(versionSensitive){
  const def=CATALOG[0];
  selected.push(make(def,!version?"The question mentions an update/version-sensitive behavior, but no installed version was supplied.":"The question is explicitly version-sensitive; keep the answer pinned to the stated edition.",{application_status:!version?"ask_for_version":"edition_match_required",next_question:!version?"What exact software version or build is installed?":"",evidence_links:[]}));
 }
 if(diagnostic&&!context.trim()){
  const def=CATALOG[1];
  selected.push(make(def,"The question reports a failure, but no device, configuration, reproduction, or error context was supplied.",{application_status:"ask_for_context",next_question:"What device/model and OS/build are you using, and what exact step or error do you observe?",evidence_links:[]}));
 }
 if(diagnostic&&plan.device_tested!==true){
  const def=CATALOG[5];
  selected.push(make(def,"The question describes real-device behavior, but this workflow has no reproducible device test.",{application_status:"guardrail",next_question:"",evidence_links:[]}));
 }
 for(const source of sources){
  const upper=source.text.toUpperCase();
  const hasA=upper.includes(TOKEN_A),hasB=upper.includes(TOKEN_B);
  const prerequisite=/\b(?:only when|only if|requires?|must be enabled|prerequisite|dependent on)\b/i.test(source.text);
  if(prerequisite){
   const def=CATALOG[2];
   selected.push(make(def,"The matched official excerpt explicitly states a prerequisite.",{application_status:"source_backed",next_question:"Is this prerequisite enabled in the active configuration?",evidence_links:[{evidence_id:source.id,url:source.url,quote:source.sections.find(x=>/\b(?:only when|only if|requires?|must be enabled|prerequisite|dependent on)\b/i.test(x.quote))?.quote||""}]}));
  }
  if(hasA&&hasB){
   const def=CATALOG[3];
   selected.push(make(def,"The same matched official source contains both RECEIVE_RESULT and SEND_RESULT; their roles still require human review.",{application_status:"source_discrepancy_needs_review",next_question:"",evidence_links:[{evidence_id:source.id,url:source.url,identifiers:[TOKEN_A,TOKEN_B],sections:source.sections.filter(x=>x.quote).map(x=>({section:x.section,quote:x.quote}))}]}));
   const names=CATALOG[4];
   selected.push(make(names,"The source contains two differently spelled API identifiers; preserve each exact form and its location.",{application_status:"source_backed",next_question:"",evidence_links:[{evidence_id:source.id,url:source.url,identifiers:[TOKEN_A,TOKEN_B]}]}));
  }
 }
 const unique=new Map();
 for(const item of selected){const prior=unique.get(item.id);if(!prior)unique.set(item.id,item);else prior.evidence_links.push(...item.evidence_links)}
 return [...unique.values()];
}
function catalog(){return CATALOG.map(x=>({...x,required_context:[...x.required_context],evidence_requirements:[...x.evidence_requirements],provenance:JSON.parse(JSON.stringify(x.provenance))}))}
return Object.freeze({select,catalog});
});