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
const CARDS=Object.freeze([
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
function offlineEvidence(plan){
 const urls=(plan.source_urls||[]).map(s=>{try{let u=new URL(s);u.hash="";return u.href}catch{return ""}});
 const cards=plan.state==="ready_for_source_retrieval"?CARDS.filter(c=>c.product===plan.product&&c.version===plan.version&&urls.includes(c.url)):[];
 return {mode:"offline_curated_source_cards",model_attempts:0,model_runs_completed:0,cards,
   notice:"Short excerpts inspected on the official pages on 2026-11-24; not a current retrieval, complete source, or model-generated answer. Review the original pages when connected.",device_tested:false};
}
return Object.freeze({parseCSV,importCSV,offlineEvidence});
});
