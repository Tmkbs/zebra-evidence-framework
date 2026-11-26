/* Shared, deterministic answer planner. No network, model, or storage. */
(function(root,factory){
 const api=factory(typeof module==="object"&&module.exports?require("./answer-strategies.js"):root.ZebraAnswerStrategies);
 if(typeof module==="object"&&module.exports)module.exports=api;
 else root.ZebraGuidance=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(registry){
"use strict";
const PRODUCTS=new Set(["datawedge","ehs","enterprise-browser","emdk-for-android","stagenow"]);
if(!registry)throw Error("Load answer-strategies.js before guidance-planner.js");
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
// Compatibility view only. The registry is the single decision engine.
function policySelection(question,context=""){
 return registry.select({question,context},[]).map(s=>s.id);
}
function withEvidence(plan,evidence=[]){
 const strategies=registry.select(plan,evidence);
 const policies=strategies.map(s=>({id:s.id,strategy:s.safe_next_action,status:"provisional_answer_safeguard"}));
 return {...plan,strategies,policies};
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
 let sources=[];
 if(product&&version){
  sources=supplied.length?supplied.map(s=>officialURL(s,product,version)):routeSources(question,product,version);
  sources=[...new Set(sources)];
  if(!sources.length)questions.push("Provide the applicable version-specific TechDocs article URL for this task.");
 }
 return withEvidence({schema:"zebra-answer-plan/v1",case_id:caseId,question,product,version,context,action,
  state:questions.length?"clarification_required":"ready_for_source_retrieval",
  clarification:questions,
  explanation_intent:explanationIntent(question,product),source_urls:sources,source_selection:supplied.length?"user_selected":"limited_topic_router",
  installed_version_verified:false,global_pattern_validated:false});
}

return Object.freeze({prepare,withEvidence,officialURL,routeSources,policySelection,explanationIntent,edition,clean,products:[...PRODUCTS]});
});
