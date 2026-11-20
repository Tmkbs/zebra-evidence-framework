'use strict';

// Manual local intake for user-triggered Zebra browser snapshots. Never fetches pages,
// calls providers, executes source text, or approves a document change.
const fs=require('node:fs');
const crypto=require('node:crypto');
const VERSION='zebra-doc-capture/v1';
const INTAKE='zebra-doc-capture-intake/v1';
const SECTION_SCOPE='zebra-section-scope/v1';
const SCOPED_DOC=/^https:\/\/techdocs\.zebra\.com\/(?:[a-z][a-z0-9-]*|dcs\/rfid\/android)\/\d{1,4}(?:-\d{1,4}){1,4}\//;
const LIMIT={file:384*1024, title:512, block:3500, body:48*1024, blocks:120};
const BLOCK=new Set(['heading','paragraph','list_item','code','table_row','quote']);
const CASE=/^[A-Za-z][A-Za-z0-9_.-]{0,79}$/;
const ANCHOR=/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$/;
const FORUM=/^\/(?:content\/[a-z0-9][a-z0-9-]{1,170}|forum\/[1-9][0-9]{0,11})\/?$/;
const DOC_PATH=/^\/[a-z][a-z0-9-]+\/(?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]*$/;
const RESTRICTED=/^(?:login|logout|log-in|sign-in|signin|register|signup|account|user|users|admin|internal|private|download|oauth|sso|search|ticket|support-portal)(?:$|[-_.])/i;
class IntakeError extends Error {
 constructor(code,message){super(message);this.code=code;}
}
const deny=(c,m)=>{throw new IntakeError(c,m);};
const nonempty=(s,n)=>typeof s==='string' && !!s.trim() && Buffer.byteLength(s,'utf8')<=n && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]|\p{Surrogate}/u.test(s);
const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v)&&[Object.prototype,null].includes(Object.getPrototypeOf(v));
const shape=(v,required,optional=[])=>object(v)&&required.every(k=>Object.hasOwn(v,k))&&Object.keys(v).every(k=>required.includes(k)||optional.includes(k));
const sha=(s)=>crypto.createHash('sha256').update(s).digest('hex');
function validateUrl(raw,kind){
 if(typeof raw!=='string'||raw.length>2048||!/^[\x21-\x7e]+$/.test(raw)||/[\\%?#]/.test(raw)) deny('UNAPPROVED_SOURCE','Expected a clean HTTPS Zebra source URL.');
 let u;
 try{u=new URL(raw);}catch{deny('UNAPPROVED_SOURCE','Invalid source URL.');}
 if(u.href!==raw||u.protocol!=='https:'||u.username||u.password||u.port||u.search||u.hash) deny('UNAPPROVED_SOURCE','Source URL must be canonical and must not carry credentials or query data.');
 if(u.pathname.split('/').some(s=>RESTRICTED.test(s)))deny('UNAPPROVED_SOURCE','This path is not a scoped public Zebra source.');
 if(kind==='forum' && u.hostname==='developer.zebra.com' && FORUM.test(u.pathname))return raw;
 if(kind==='techdocs' && u.hostname==='techdocs.zebra.com'){
  const segments=u.pathname.split('/').filter(Boolean);
  const file=segments.at(-1)||'';
  const extension=/\.([a-z]{2,})$/i.exec(file)?.[1]?.toLowerCase();
  if(DOC_PATH.test(u.pathname)&&!u.pathname.includes('//')&&segments.every(s=>s!=='.'&&s!=='..'&&!RESTRICTED.test(s))&&(!extension||extension==='html'))return raw;
 }
 deny('UNAPPROVED_SOURCE','This path is not a scoped public Zebra forum or TechDocs source.');
}
function protectedText(s,kind){
 return /-----BEGIN (?:[A-Z]+ )*PRIVATE KEY-----/.test(s)||
  /(?:^|\s)(?:password|api[_ -]?key|secret[_ -]?key|access[_ -]?token|client[_ -]?secret)\s*[:=]\s*['"]?[A-Za-z0-9+/_.-]{16,}/i.test(s)||
  (kind==='forum' && /(?:^|[^A-Za-z0-9+/])[A-Za-z0-9+/]{64,}={0,2}(?=$|[^A-Za-z0-9+/])/.test(s));
}
function validateCapture(value){
 const required=['schema_version','source_url','captured_at','title','source_kind','blocks','truncated'];
 if(!shape(value,required)||value.schema_version!==VERSION||!['techdocs','forum'].includes(value.source_kind)||typeof value.truncated!=='boolean') deny('CAPTURE_SCHEMA','Invalid Zebra browser capture structure.');
 const url=validateUrl(value.source_url,value.source_kind);
 const stamp=value.captured_at;
 if(typeof stamp!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(stamp)||!Number.isFinite(Date.parse(stamp))||new Date(stamp).toISOString()!==stamp) deny('CAPTURE_TIMESTAMP','Expected an exact UTC browser timestamp.');
 if(!nonempty(value.title,LIMIT.title)||!Array.isArray(value.blocks)||!value.blocks.length||value.blocks.length>LIMIT.blocks) deny('CAPTURE_LIMIT','Capture title or block count exceeds the local intake contract.');
 if(protectedText(value.title,value.source_kind))deny('SENSITIVE_TEXT','Potential credential or opaque forum value; nothing was imported.');
 let total=0;
 const blocks=value.blocks.map((b,i)=>{
  if(!shape(b,['kind','text'],['anchor','level'])||!BLOCK.has(b.kind)||!nonempty(b.text,LIMIT.block)) deny('CAPTURE_BLOCK','Invalid text block '+(i+1)+'.');
  if(protectedText(b.text,value.source_kind))deny('SENSITIVE_TEXT','Potential credential or opaque forum value; nothing was imported.');
  total+=Buffer.byteLength(b.text,'utf8');
  if(total>LIMIT.body) deny('CAPTURE_LIMIT','Combined text exceeds the local intake contract.');
  const block={kind:b.kind,text:b.text};
  if(Object.hasOwn(b,'anchor')){
   if(typeof b.anchor!=='string'||!ANCHOR.test(b.anchor)) deny('CAPTURE_BLOCK','Invalid noncanonical section anchor.');
   block.anchor=b.anchor;
  }
  if(Object.hasOwn(b,'level')){
   if(b.kind!=='heading'||!Number.isInteger(b.level)||b.level<1||b.level>6) deny('CAPTURE_BLOCK','Invalid heading level.');
   block.level=b.level;
  }
  return block;
 });
 return {schema_version:VERSION,source_url:url,captured_at:stamp,title:value.title,source_kind:value.source_kind,blocks,truncated:value.truncated};
}
function validateInput(value){
 if(!object(value)||(!Object.hasOwn(value,'capture')&&!Object.hasOwn(value,'section_scope')))
  return {capture:validateCapture(value),sectionScope:null};
 if(!shape(value,['capture','section_scope']))deny('CAPTURE_SECTION','Invalid section capture envelope.');
 const capture=validateCapture(value.capture);
 const scope=value.section_scope;
 if(capture.source_kind!=='techdocs'||!SCOPED_DOC.test(capture.source_url)||!capture.truncated||
    !shape(scope,['schema_version','heading_anchor','boundary','whole_article'])||
    scope.schema_version!==SECTION_SCOPE||scope.whole_article!==false||
    typeof scope.heading_anchor!=='string'||!ANCHOR.test(scope.heading_anchor)||
    !['next_heading','article_end','capture_limit'].includes(scope.boundary))
   deny('CAPTURE_SECTION','Expected a partial section of a versioned public TechDocs article.');
 const first=capture.blocks[0];
 if(capture.blocks.length<2||first.kind!=='heading'||first.anchor!==scope.heading_anchor||
    !first.level||capture.blocks.slice(1).some(b=>b.anchor===scope.heading_anchor))
   deny('CAPTURE_SECTION','Section blocks do not match the unique starting heading or section boundary.');
 return {capture,sectionScope:{schema_version:SECTION_SCOPE,heading_anchor:scope.heading_anchor,boundary:scope.boundary,whole_article:false}};
}
function documentVersion(url){
 const parts=new URL(url).pathname.split('/');
 const nested=parts[1]==='dcs'&&parts[2]==='rfid'&&parts[3]==='android';
 const version=parts[nested ? 4 : 2]||'';
 return /^(?:v)?\d+(?:[.-]\d+)+$/.test(version)?version:null;
}
function loadCapture(file,{allowSection=false}={}){
 try{
  const bytes=fs.statSync(file);
  if(!bytes.isFile()||bytes.size>LIMIT.file) deny('CAPTURE_LIMIT','Only a bounded local capture file is accepted.');
  const raw=fs.readFileSync(file);
  if(raw.length>LIMIT.file) deny('CAPTURE_LIMIT','Only a bounded local capture file is accepted.');
  let parsed;
  try{parsed=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw));}catch{deny('CAPTURE_JSON','Invalid UTF-8 or JSON capture.');}
  const checked=validateInput(parsed);
  if(checked.sectionScope&&!allowSection)deny('CAPTURE_SECTION','Section captures are accepted only as TechDocs inputs.');
  return checked.sectionScope?{capture:checked.capture,section_scope:checked.sectionScope}:checked.capture;
 }catch(e){
  if(e instanceof IntakeError)throw e;
  deny('CAPTURE_IO','Local capture could not be opened.');
 }
}
function intake({forum,techdocs,caseId=null}){
 const fInput=validateInput(forum),dInput=validateInput(techdocs);
 if(fInput.sectionScope)deny('CAPTURE_SECTION','Section captures are accepted only as TechDocs inputs.');
 const sectionScope=dInput.sectionScope;
 const captures=[fInput.capture,dInput.capture];
 if(captures[0].source_kind!=='forum'||captures[1].source_kind!=='techdocs') deny('CAPTURE_PAIR','Select one forum capture followed by one TechDocs capture.');
 if(caseId!==null&&(typeof caseId!=='string'||!CASE.test(caseId))) deny('CASE_ID','Invalid project case ID.');
 const [f,d]=captures;
 const id=caseId||'CAP-'+sha(f.source_url).slice(0,18);
 const docId='DOC-'+sha(d.source_url).slice(0,18);
 const pinned=captures.map(c=>({kind:c.source_kind,url:c.source_url,captured_at:c.captured_at,sha256:sha(JSON.stringify(c)),block_count:c.blocks.length,truncated:c.truncated}));
 if(sectionScope){
  pinned[1].section_scope=sectionScope;
  // The capture digest stays compatible with consumers of flat capture v1.
  pinned[1].section_envelope_sha256=sha(JSON.stringify({capture:d,section_scope:sectionScope}));
 }
 const runId='CAPTURE-'+sha(JSON.stringify([id,...pinned.map(r=>r.section_envelope_sha256??r.sha256)])).slice(0,24);
 const body=d.blocks.map(b=>b.text).join('\n\n');
 const version=documentVersion(d.source_url);
 const unknowns=['Verify forum author question versus replies and determine the exact question scope.','Confirm source fidelity, installed product and software versions, and whether the selected documentation applies.','Review public redistribution and model-use scope; this intake does not authorize either.'];
 if(!version)unknowns.push('No exact product-doc edition inferred from the source URL.');
 if(sectionScope)unknowns.push('Only the selected TechDocs section was captured; surrounding sections, media and original article fidelity remain unverified.');
 if(pinned.some(p=>p.truncated&&!p.section_scope)||sectionScope?.boundary==='capture_limit')unknowns.push('Capture truncated; verify the missing content before using it for any review.');
 return {
  schema:INTAKE,stage:'CAPTURE_REVIEW_REQUIRED',fictional_demo:false,record_kind:'PUBLIC_SOURCE_RESEARCH',document_source_kind:'browser_text_capture',
  run_id:runId,
  case:{id,question:null,question_title:f.title,known_facts:[],unknowns,document_reference:docId,source_status:'PUBLIC_URL_NOT_INDEPENDENTLY_VERIFIED',case_url:f.source_url,public_report_url:null,model_execution_status:'NOT_RUN'},
  document_snapshot:{name:d.title,type:'browser_text_capture',extension:'.txt',original_text:body,character_count:body.length,selected_paragraph:null,exact_match_count:0,customer_source_verified:false,source_version_from_url:version},
  evidence:[{id:'CAPTURE-FORUM',source_label:f.title,claim:null,scope_limit:'Captured title and visible blocks; author versus replies not yet reviewed.',public_url:f.source_url},{id:'CAPTURE-TECHDOCS',source_label:d.title,claim:null,scope_limit:sectionScope?'Partial text from a named section, not a verified article mirror or installed product version.':'Structured browser text, not a verified article mirror or installed product version.',public_url:d.source_url}],
  evidence_assessment:[],unknowns,next_checks:['Check capture content and product version before evidence adjudication.','Select an exact original paragraph only after source review.'],
  recorded_answers:[{id:'A',source:'NOT_RUN',output:'',human_scores:{},transfer_receipt:null},{id:'B',source:'NOT_RUN',output:'',human_scores:{},transfer_receipt:null}],
  reviewer_choice:null,failure_diagnosis:{status:'NOT_REVIEWED',category:null,notes:'',confirmed_root_cause:false},
  proposed_revision:null,patch_execution:{status:'NOT_RUN',result_copy:null,original_modified:false},
  heldout_evaluation:{questions:[],notes:'',real_model_test_performed:false},optional_search_experiment:null,
  developer_preview:{status:'CAPTURE_REVIEW_REQUIRED',draft_answer:null,video_generated:false,customer_study_performed:false},
  release:{status:'NOT_AUTHORIZED',publication:false,real_device_validation:'NOT_RUN',customer_acceptance:'NOT_RUN'},
  downstream_adapter:{schema:'documentation-revision/v1',mode:'capture_intake_before_revision',apply_allowed:false,export_to_handoff_allowed:false,teammate_private_code_connected:false},
  capture_binding:{schema:'zebra-capture-intake/v1',intake_status:'CAPTURE_REVIEW_REQUIRED',association:'USER_SELECTED_NOT_VERIFIED',captures:pinned,structured_sources:{forum:f,techdocs:d},network_calls:0,model_execution:'NOT_RUN'},
 };
}
function cli(args){
 if(args.length!==2&&args.length!==3)deny('USAGE','Usage: node classroom/capture-intake.cjs forum.json techdocs.json [case-id]');
 return intake({forum:loadCapture(args[0]),techdocs:loadCapture(args[1],{allowSection:true}),caseId:args[2]??null});
}
module.exports={intake,loadCapture,validateCapture,IntakeError};
if(require.main===module){
 try { process.stdout.write(JSON.stringify(cli(process.argv.slice(2)),null,2)+'\n'); }
 catch(e){
  const error=e instanceof IntakeError?{code:e.code,message:e.message}:{code:'INTERNAL_ERROR',message:'Local intake failed.'};
  process.stderr.write(JSON.stringify({schema:'zebra-capture-intake-error/v1',release:'NOT_AUTHORIZED',model_execution:'NOT_RUN',error})+'\n');process.exitCode=1;
 }
}
