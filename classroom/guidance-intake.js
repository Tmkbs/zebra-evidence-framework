/* Public question intake and small, explicitly curated offline evidence cards.
 * This module has no network, model, storage, or publication side effects.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 else root.ZebraIntake=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const OFFICIAL="techdocs.zebra.com";
function publicURL(raw,hosts){
 if(typeof raw!=="string"||raw.length>1600)return "";
 try{const u=new URL(raw.trim());return u.protocol==="https:"&&hosts.includes(u.hostname)&&!u.username&&!u.password&&!u.port&&!u.search?u.href:""}catch{return ""}
}
function parseCSV(s){
 if(typeof s!=="string"||!s.trim()||s.length>700000)throw Error("CSV empty or too large");
 s=s.replace(/^\uFEFF/,"");
 let rows=[],row=[],field="",quoted=false,closed=false,started=false;
 const fieldEnd=()=>{row.push(field);field="";closed=false;started=false};
 const rowEnd=()=>{fieldEnd();if(row.some(x=>x.trim()))rows.push(row);row=[];if(rows.length>2001)throw Error("Too many rows")};
 for(let i=0;i<s.length;i++){
  const ch=s[i];
  if(quoted){if(ch==='"'){if(s[i+1]==='"'){field+='"';i++}else{quoted=false;closed=true}}else field+=ch;continue}
  if(ch===","){fieldEnd();continue}
  if(ch==="\r"||ch==="\n"){if(ch==="\r"&&s[i+1]==="\n")i++;rowEnd();continue}
  if(closed)throw Error("Unexpected text after quoted field");
  if(ch==='"'&&!started){quoted=true;started=true;continue}
  if(ch==='"')throw Error("Invalid CSV quoting");
  field+=ch;started=true;
 }
 if(quoted)throw Error("Unclosed quoted field");
 if(field||row.length||closed)rowEnd();
 if(rows.length<2)throw Error("Need header and at least one row");
 const headers=rows.shift().map(s=>s.trim().toLowerCase().replace(/[_-]+/g," ").replace(/\s+/g," "));
 if(headers.length<2||headers.length>80||new Set(headers).size!==headers.length||rows.some(r=>r.length!==headers.length))throw Error("Invalid CSV columns");
 return {headers,rows};
}
function column(h,patterns){for(const p of patterns){const i=h.findIndex(s=>p.test(s));if(i>=0)return i}return -1}
function importCSV(s){
 const {headers,rows}=parseCSV(s);
 const map={
  id:column(headers,[/^case id$/,/^spr key$/,/^id$/]),
  question:column(headers,[/^original (forum |developer )?question$/,/^developer question$/,/^question$/]),
  title:column(headers,[/^case title$/,/^title$/,/^feature\s*\/\s*component$/]),
  forum:column(headers,[/forum.*(link|url)/,/developer.*(link|url)/,/^original question (link|url)$/]),
  source:column(headers,[/^target techdocs page\s*\/\s*section$/,/official.*techdocs.*(link|url)/,/original.*techdocs.*(link|url)/,/^techdocs.*(link|url)/,/^target techdocs.*(link|url)/,/^official.*source.*(link|url)/])
 };
 if(map.id<0)throw Error("Public case ID column not found");
 const out=[],seen=new Set();let skipped=0;
 for(let i=0;i<rows.length;i++){
  const row=rows[i],get=k=>map[k]<0?"":String(row[map[k]]||"").trim();
  const id=get("id");
  if(!/^ZF-[a-f0-9]{16}$/i.test(id)||seen.has(id.toLowerCase())){skipped++;continue}
  seen.add(id.toLowerCase());
  const question=get("question");
  const source=publicURL(get("source"),[OFFICIAL]);
  const forum=publicURL(get("forum"),["developer.zebra.com","stackoverflow.com","community.zebra.com"]);
  // Never substitute a root-cause label, recommended change, summary or title
  // for the original question. A question column is not proof of verbatim input.
  out.push({id,title:get("title").slice(0,160)||id,question:question.length>=12&&question.length<=1800?question:"",
   source_urls:source?[source]:[],forum_url:forum,question_status:question.length>=12&&question.length<=1800?"needs_origin_review":"missing_original_question",
   reported_version:"",origin_verified:false,source_csv_row:i+2});
 }
 return {schema:"zebra-public-question-intake/v1",rows:out,skipped_rows:skipped,total_input_rows:rows.length,question_column:map.question<0?null:headers[map.question],eligible_for_evaluation:0};
}
const PROFILE_SOURCE="https://techdocs.zebra.com/datawedge/15-0/guide/profiles/";
const CARDS=Object.freeze([
 {url:PROFILE_SOURCE,product:"datawedge",version:"15.0",title:"DataWedge Profiles",checked:"2026-11-24",sections:[
  {section:"Profile options — Input",quote:"how the data is acquired (input)",note:"Input plugins specify how data is captured."},
  {section:"Profile options — Process",quote:"processed for data formatting (if needed)",note:"Formatting is optional."},
  {section:"Profile options — Output",quote:"delivered to the app (output)",note:"Output plugins deliver data to the application."}
 ],next:"Learn the capture, optional formatting and delivery stages. Check the applicable feature matrix and plugin page before inferring support for a particular device or operation."},
 {url:"https://techdocs.zebra.com/datawedge/15-0/guide/api/setconfig/",product:"datawedge",version:"15.0",title:"Set Config",checked:"2026-11-24",sections:[
  {section:"MAIN BUNDLE",quote:"A bundle array (nested within the main bundle)",note:"The main configuration contains the plugin configuration array."},
  {section:"PLUGIN_CONFIG BUNDLE",quote:"A parameter list bundle nested within the PLUGIN_CONFIG bundle",note:"A plugin configuration contains its own parameter list."}
 ],next:"Keep the main configuration, plugin configuration, and plugin parameters at their documented levels. Confirm plugin names, applicable parameter tables, and actual device behavior separately."},
 {url:"https://techdocs.zebra.com/datawedge/6-8/guide/api/resultinfo/",product:"datawedge",version:"6.8",title:"Intent Result Codes",checked:"2026-11-24",sections:[
  {section:"Overview",quote:"intent extras RECEIVE_RESULT and COMMAND_IDENTIFIER",note:"The overview names RECEIVE_RESULT."},
  {section:"Function Prototype",quote:'i.putExtra("SEND_RESULT","true");',note:"The code instead uses SEND_RESULT."}
 ],next:"Inspect both passages in the same edition. Confirm the actual API command, device/build and result logs before recommending a parameter. The differing spellings do not establish which works on a device."},
 {url:"https://techdocs.zebra.com/datawedge/6-8/guide/api/softscantrigger/",product:"datawedge",version:"6.8",title:"Soft Scan Trigger",checked:"2026-11-24",sections:[
  {section:"SOFT_SCAN_TRIGGER",quote:"Functional only when Barcode Input is enabled in the active Profile.",note:"Check the active profile's Barcode Input prerequisite."},
  {section:"Sample 'SCANNER_STATUS' Notification",quote:"commands might be ignored if the scanner is busy",note:"Check whether the scanner is ready before retrying."}
 ],next:"Confirm the active profile and scanner state; request a reproducible observation. These are documented prerequisites, not an observed device fix."}
]);
// A reviewed document lesson is data, not a new drawing implementation. The
// original team proposal is provenance, not permission to claim a device fix.
const DOCUMENT_LESSONS=Object.freeze([{
 id:"ehs-settings-access-r62",product:"ehs",version:"4.0",
 title:"EHS settings access — three distinct controls",
 summary:"Distinguish launcher visibility, the Settings panel, and app availability before changing a device policy.",
 reader_url:"https://zebra-techdocs-practicum.vercel.app/document-reader/ehs40-settings-access/index.html#settings-control-scope",
 release:"r62",checked:"2026-11-26",
 topic:/\b(?:settings|system_settings_restricted|apps_disabled|apps_enabled)\b/i,
 intent:/\b(?:hide|hidden|restrict\w*|disable\w*|access|shortcut|icon|visibility|available)\b/i,
 cards:[
  {url:"https://techdocs.zebra.com/ehs/4-0/guide/setup/",title:"EHS Setup — User Mode",sections:[{id:"visibility",section:"Select Apps for User Mode",quote:"Long-press an app icon to alternatively display or hide it",note:"The launcher can display or hide an app icon in User Mode. Icon visibility alone is not proof that an app has been disabled."}],next:"Separate launcher visibility from app availability."},
  {url:"https://techdocs.zebra.com/ehs/4-0/guide/settings/",title:"EHS Advanced Settings",sections:[
   {id:"panel",section:"System Settings Restricted — notes",quote:"only prevents their display in the Settings panel",note:"The documented restriction concerns what is shown in the Settings panel; it is not a guarantee that the underlying features are blocked."},
   {id:"enabled",section:"System Settings Restricted — prerequisite",quote:"must be explicitly enabled in advance",note:"The System Settings app must be enabled before the restriction can be used."},
   {id:"availability",section:"Enable/Disable Apps",quote:"explicitly disabled or enabled",note:"Application enablement is a separate control from the launcher icon and Settings panel."}
  ],next:"Confirm the applicable device, Android version, intended access policy and uninstall implications before recommending a configuration."}
 ],
 scenes:[
  {id:"launcher",title:"Launcher icon",caption:"Visible or hidden",detail:"EHS User Mode can display or hide an app icon. This controls its launcher presentation; it does not establish that the application itself is unavailable.",refs:["visibility"]},
  {id:"panel",title:"Settings panel",caption:"Full or limited display",detail:"System Settings Restricted limits what appears in the Settings panel. The Settings app must be enabled first. A restricted display does not guarantee that every underlying settings feature is blocked.",refs:["panel","enabled"]},
  {id:"application",title:"Settings app",caption:"Separate app control",detail:"Enable or disable app availability is a separate documented control. Treat it separately from hiding an icon or restricting the panel; do not apply a device policy solely from this illustration.",refs:["availability"]},
  {id:"decision",title:"Choose the scope",caption:"Review before changing",detail:"First establish whether the goal concerns launcher visibility, the displayed Settings panel or actual app availability. Confirm the installed edition, required access policy and side effects before a change. No device behavior is verified.",refs:["visibility","panel","availability"]}
 ],
 checkpoint:{id:"ehs_visibility_boundary",prompt:"Does hiding a Settings icon prove that all underlying Settings features are blocked?",options:[{id:"yes",label:"Yes"},{id:"no",label:"No"},{id:"unknown",label:"Not sure"}],explanation:"Icon visibility, the restricted Settings panel and application availability are different controls.",correct:"no"}
}]);
function articleKey(raw){try{const u=new URL(raw);u.hash="";return u.href}catch{return ""}}
function lessonCards(){
 return DOCUMENT_LESSONS.flatMap(l=>l.cards.map(c=>({...c,product:l.product,version:l.version,checked:l.checked,lesson_id:l.id})));
}
function reviewedLesson(plan,result={}){
 if(!plan||plan.state!=="ready_for_source_retrieval")return null;
 const matches=DOCUMENT_LESSONS.filter(l=>l.product===plan.product&&l.version===plan.version&&l.topic.test(plan.question)&&l.intent.test(plan.question));
 if(matches.length!==1)return null;
 const l=matches[0],selected=new Set((plan.source_urls||[]).map(articleKey)),evidence=new Map();
 for(const c of l.cards){
  if(!selected.has(c.url))return null;
  // Once fresh retrieval is attempted, never substitute a cached quotation.
  const retrieved=Array.isArray(result.sources);
  const source=retrieved?result.sources.find(s=>articleKey(s.url)===c.url&&typeof s.text==="string"):null;
  if(retrieved&&(!source||!c.sections.every(s=>source.text.includes(s.quote))))return null;
  for(const s of c.sections)evidence.set(s.id,{url:c.url,section:s.section,quote:s.quote,origin:retrieved?"retrieved_excerpt":"checked_source_card",...(retrieved?{retrieved_at:source.retrieved_at||null,evidence_id:source.id||null,excerpt_sha256:source.excerpt_sha256||null}:{checked:l.checked})});
 }
 const nodes=l.scenes.map(s=>({id:s.id,title:s.title,caption:s.caption,detail:s.detail,status:s.id==="decision"?"check":"source",evidence:s.refs.map(id=>evidence.get(id))}));
 if(nodes.some(n=>!n.evidence.length||n.evidence.some(e=>!e?.quote)))return null;
 return {id:l.id,title:l.title,summary:l.summary,reader_url:l.reader_url,release:l.release,nodes,checkpoint:l.checkpoint};
}

function offlineEvidence(plan){
 const urls=(plan.source_urls||[]).map(s=>{try{let u=new URL(s);u.hash="";return u.href}catch{return ""}});
 const cards=plan.state==="ready_for_source_retrieval"?[...CARDS,...lessonCards()].filter(c=>c.product===plan.product&&c.version===plan.version&&urls.includes(c.url)):[];
 return {mode:"offline_curated_source_cards",model_attempts:0,model_runs_completed:0,cards,
   notice:"Short excerpts inspected on the official pages on the dates shown; not a current retrieval, complete source, or model-generated answer. Review the original pages when connected.",device_tested:false};
}
// A media recommendation is separate from a live answer, video analysis or
// a newly generated video. The official page lists the assets below.
function contextualMedia(plan,map){
 const base={schema:"zebra-contextual-media/v1",assets:[],auto_load:false,video_playback_verified:false,model_calls:0};
 if(map?.kind==="document_lesson"&&map.lesson_id){
  const lesson=DOCUMENT_LESSONS.find(l=>l.id===map.lesson_id);
  if(lesson&&plan?.product===lesson.product&&plan?.version===lesson.version)return {...base,selection:"reviewed_document_lesson",reason:"Concept explanation based on the exact edition and reviewed document distinctions.",checkpoint:{...lesson.checkpoint},reader_url:lesson.reader_url};
 }
 if(!plan||!map||plan.state!=="ready_for_source_retrieval"||plan.product!=="datawedge"||plan.version!=="15.0"||
    plan.explanation_intent!=="concept_overview"||map.kind!=="profile_learning")
  return {...base,selection:"not_selected",reason:"No matched introductory source and explanation need. Avoid irrelevant or cross-edition media."};
 const sourceOK=map.nodes.filter(n=>["input","process","output"].includes(n.id)).length===3&&
  ["input","process","output"].every(id=>map.nodes.find(n=>n.id===id)?.evidence.some(e=>e.url===PROFILE_SOURCE&&e.quote));
 if(!sourceOK)return {...base,selection:"not_selected",reason:"The matched source passages are not available."};
 return {...base,selection:"official_media_and_interactive_concept",reason:"The question asks how the profile works. A visual explanation of the data path and the official introduction are relevant.",
  assets:[
   {kind:"diagram",title:"Official DataWedge Profile diagram",url:"https://techdocs.zebra.com/datawedge/15-0/guide/profiles/dw_profile.png",source_url:PROFILE_SOURCE,edition:"15.0",provenance:"official_documentation_image_inspected",checked:"2026-11-24"},
   {kind:"video",title:"An introduction to DataWedge profiles",url:"https://www.youtube.com/watch?v=LCaPhWxk4y0",source_url:PROFILE_SOURCE,edition:"15.0",provenance:"video_embed_listed_on_official_documentation",checked:"2026-11-24",playback_verified:false,timecode_verified:false}
  ],
  checkpoint:{id:"profile_formatting",prompt:"Which stage optionally formats acquired data before delivery?",options:[{id:"input",label:"Input"},{id:"process",label:"Process"},{id:"output",label:"Output"}],
   explanation:"The Process stage handles optional formatting; Input acquires data and Output delivers it.",evidence_node:"process"}
 };
}
function checkUnderstanding(packet,choice){
 if(packet?.selection==="reviewed_document_lesson"){
  const lesson=DOCUMENT_LESSONS.find(l=>l.checkpoint.id===packet.checkpoint?.id);
  if(!lesson||!lesson.checkpoint.options.some(o=>o.id===choice))return null;
  const correct=choice===lesson.checkpoint.correct;
  return {checkpoint_id:lesson.checkpoint.id,choice,correct,feedback:(correct?"Correct. ":"Not quite. ")+lesson.checkpoint.explanation,scope:"single_optional_self_check_not_learning_outcome",device_tested:false};
 }
 if(packet?.selection!=="official_media_and_interactive_concept"||packet.checkpoint?.id!=="profile_formatting"||!packet.checkpoint.options.some(o=>o.id===choice))return null;
 return {checkpoint_id:packet.checkpoint.id,choice,correct:choice==="process",feedback:choice==="process"?"Correct. "+packet.checkpoint.explanation:"Not quite. "+packet.checkpoint.explanation,scope:"single_optional_self_check_not_learning_outcome",device_tested:false};
}
return Object.freeze({parseCSV,importCSV,offlineEvidence,reviewedLesson,contextualMedia,checkUnderstanding});
});
