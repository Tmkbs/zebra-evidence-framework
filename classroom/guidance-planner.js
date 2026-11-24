/* Shared, deterministic answer planner. No network, model, or storage. */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 else root.ZebraGuidance=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const PRODUCTS=new Set(["datawedge","ehs","enterprise-browser","emdk-for-android","stagenow"]);
const POLICIES=Object.freeze({
 version_boundary:"Use the selected documentation edition. Treat the installed version as user-reported, not independently established. Do not transfer behavior from another edition.",
 missing_context:"Ask a focused question for missing device, OS, runtime, configuration or observed error. Do not fill in missing facts.",
 missing_prerequisite:"Identify applicable prerequisites from the exact source. Distinguish enabling a profile or permission from executing the command.",
 example_body_conflict:"When source prose and a code example appear to disagree, show both with their evidence. Do not silently choose one or recommend an unverified fix.",
 naming_inconsistency:"Preserve the exact API parameter spelling in the source; separate identifiers that merely look similar.",
 unverified_device_claim:"Distinguish documented behavior from a reported observation. Do not claim successful device operation, an established defect, or a repair without a reproducible device check."
});
const ROUTES=[
 {re:/\b(?:soft[_ ]?scan[_ ]?trigger|start[_ ]?scanning|stop[_ ]?scanning|software scan trigger)\b/i,paths:["softscantrigger/"]},
 {re:/\b(?:send_result|receive_result|command_identifier|result_info|result codes?|command result|result intent)\b/i,paths:["resultinfo/"]},
 {re:/\b(?:set[_ ]?config|plugin_config|set configuration|nested bundle)\b/i,paths:["setconfig/"]},
 {re:/\b(?:intent output|broadcast receiver|intent filter)\b/i,paths:["../output/intent/"]}
];
function clean(value,max,name,required=false){
 if(value==null)value="";
 if(typeof value!=="string")throw Error(name+" must be text");
 const v=value.trim();
 if(v.length>max||required&&!v)throw Error("Invalid "+name);
 return v;
}
function edition(value){
 const v=clean(value,24,"edition");
 if(!v)return "";
 if(!/^\d{1,3}\.\d{1,3}(?:\.\d{1,3})?$/.test(v))throw Error("Use a numeric documentation edition, e.g. 6.8 or 15.0");
 return v.split(".").map(x=>String(Number(x))).join(".");
}
function officialURL(raw,product,version){
 if(typeof raw!=="string"||raw.length>1200)throw Error("Invalid source URL");
 const u=new URL(raw);
 if(u.protocol!=="https:"||u.hostname!=="techdocs.zebra.com"||u.port||u.username||u.password||u.search||!/^\/[a-zA-Z0-9._/-]+$/.test(u.pathname)||/\/\.\.?(?:\/|$)/.test(u.pathname))
  throw Error("Only HTTPS official TechDocs sources are accepted");
 const segments=u.pathname.split("/").filter(Boolean);
 if(segments[0]!==product||segments[1]!==version.replace(/\./g,"-"))
  throw Error("Source must match the selected product and documentation edition exactly");
 if(u.hash&&!/^#[A-Za-z0-9_.:-]{1,100}$/.test(u.hash))throw Error("Invalid section anchor");
 return u.href;
}
function explanationIntent(question,product){
 if(product!=="datawedge")return "technical_question";
 const q=question.trim();
 // Specific commands, reported failures, and capability/compatibility tests
 // must not be displaced by a generic introductory lesson.
 if(ROUTES.some(r=>r.re.test(q))||/\b(fail(?:ed|ure|s)?|error|not working|doesn.t work|does not work|cannot|can.t|doesn.t support|does not support|not supported|compatib\w*|which version|why won.t|why doesn.t|bug)\b/i.test(q))return "technical_question";
 return /\b(?:datawedge|profiles?)\b/i.test(q)&&/\b(?:what (?:is|are|does|do)|how (?:does|do)|explain|overview|introduction|learn about|understand)\b/i.test(q)&&!/\b(?:can i|can it|can datawedge|support(?:ed|s)?)\b/i.test(q)?"concept_overview":"technical_question";
}
function routeSources(question,product,version){
 if(product!=="datawedge")return [];
 if(version==="15.0"&&explanationIntent(question,product)==="concept_overview")return ["https://techdocs.zebra.com/datawedge/15-0/guide/profiles/"];
 const urls=[];
 for(const r of ROUTES)if(r.re.test(question))for(const p of r.paths){
  const url=new URL(p,"https://techdocs.zebra.com/datawedge/"+version.replace(/\./g,"-")+"/guide/api/").href;
  if(!urls.includes(url))urls.push(url);
 }
 return urls.slice(0,2);
}
function policySelection(q,context){
 const s=q+" "+context;
 const ids=[];
 const versionSensitive=/\b(after (?:(?:a|an|the) )?update|after updating|since (?:the )?update|after (?:an )?upgrade|after upgrading|upgrade(?:d)?|version(?:s)?|compatib(?:ility|le)|deprecated|across releases|between releases|changed in (?:version )?\d)\b/i.test(s);
 const failure=/\b(fail(?:ed|ure|s|ing)?|error|not working|does not work|doesn't work|no longer|not received|cannot|can't|won't|stopped|not responding|does not start|won't start|problem|issue)\b/i.test(s);
 const device=/\b(device|scanner|scan|barcode|app|application|profile|trigger|broadcast|receiver|runtime|android|firmware)\b/i.test(s);
 if(versionSensitive)ids.push("version_boundary");
 if(failure&&device&&!context.trim())ids.push("missing_context");
 if(failure&&device)ids.push("unverified_device_claim");
 if(/\b(RECEIVE_RESULT)\b/i.test(s)&&/\b(SEND_RESULT)\b/i.test(s))
  ids.push("example_body_conflict","naming_inconsistency");
 return [...new Set(ids)];
}
function prepare(input){
 if(!input||typeof input!=="object"||Array.isArray(input))throw Error("Expected a JSON object");
 const question=clean(input.question,1800,"question",true);
 if(question.length<12)throw Error("Enter a substantive technical question");
 const product=clean(input.product,40,"product");
 if(product&&!PRODUCTS.has(product))throw Error("Unsupported product selection");
 const version=edition(input.version);
 const context=clean(input.context,1200,"context");
 const caseId=clean(input.case_id,100,"case ID");
 if(caseId&&!/^[A-Za-z0-9_-]+$/.test(caseId))throw Error("Invalid case ID");
 const action=input.action||"plan";
 if(!["plan","evidence","guided","compare"].includes(action))throw Error("Unknown action");
 const supplied=input.source_urls||[];
 if(!Array.isArray(supplied)||supplied.length>2)throw Error("Supply at most two official document URLs");
 const questions=[];
 if(!product)questions.push("Which Zebra software product are you using?");
 if(!version)questions.push("What exact software version or build is installed?");
 const policies=policySelection(question,context);
 let sources=[];
 if(product&&version){
  sources=supplied.length?supplied.map(s=>officialURL(s,product,version)):routeSources(question,product,version);
  sources=[...new Set(sources)];
  if(!sources.length)questions.push("Provide the applicable version-specific TechDocs article URL for this task.");
 }
 return {schema:"zebra-answer-plan/v1",case_id:caseId,question,product,version,context,action,
  state:questions.length?"clarification_required":"ready_for_source_retrieval",
  clarification:questions,policies:policies.map(id=>({id,strategy:POLICIES[id],status:"provisional_answer_safeguard"})),
  explanation_intent:explanationIntent(question,product),source_urls:sources,source_selection:supplied.length?"user_selected":"limited_topic_router",
  installed_version_verified:false,global_pattern_validated:false};
}

return Object.freeze({prepare,officialURL,routeSources,policySelection,explanationIntent,edition,clean,products:[...PRODUCTS]});
});
