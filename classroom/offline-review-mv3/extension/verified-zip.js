import {checkSource,techDocsEdition} from './capture.js';

const SHA=/^[0-9a-f]{64}$/u;
const ID=/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$/u;
const valid=(s,re)=>typeof s==='string'&&s.trim()===s&&re.test(s);
const fail=()=>{throw new Error('The local files do not match the pinned archive receipt.');};
const digest=async bytes=>Array.from(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&
 Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
const frozenFile=(name,size,limit)=>name&&Number.isSafeInteger(size)&&size>0&&size<=limit;

export async function verifyLocalZip({receiptFile,zipFile,expectedReceiptSha256}={}){
 if(!valid(expectedReceiptSha256,SHA)||!frozenFile(receiptFile,receiptFile?.size,64_000)||!frozenFile(zipFile,zipFile?.size,25_010_000))fail();
 const receiptBytes=await receiptFile.arrayBuffer();
 if(receiptBytes.byteLength!==receiptFile.size||await digest(receiptBytes)!==expectedReceiptSha256)fail();
 let r;
 try{r=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(receiptBytes));}catch{fail();}
 const b=r?.binding;
 if(r?.schema!=='zebra-local-reviewed-archive-check/v1'||r.publication!=='NOT_AUTHORIZED'||r.model!=='NOT_RUN'||
    !valid(r.archive_hash,SHA)||typeof b!=='object'||b===null||b.schema!=='zebra-archive-revision-overlay/v1'||
    b.publication!=='NOT_AUTHORIZED'||b.reviewer_authenticated!==false||b.rendered_working_copy_embedded!==false||
    !valid(b.case_id,/^[A-Za-z0-9_-]{1,100}$/u)||!valid(b.run_id,/^CAPTURE-[a-f0-9]{24}$/u)||
    !valid(b.target_anchor,ID)||!valid(b.capture_sha256,SHA)||!valid(b.working_copy_sha256,SHA)||
    !valid(b.source_version,/^[0-9]{1,4}(?:-[0-9]{1,4}){1,4}$/u)||
    !valid(b.archive_path,/^pages\/\d{3}\.html#[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$/u)||
    b.archive_path.split('#')[1]!==b.target_anchor)fail();
 const src=checkSource(b.source_url);
 if(src.kind!=='techdocs'||src.url!==b.source_url||techDocsEdition(src.url)!==b.source_version)fail();
 const pair=r.source_pair;
 let pairedForum=null, scopedCapture;
 if(r.forum_pairing==='EXACT_LOCAL_PAIR_PIN_MATCHED'){
  if(!pair||!['zebra-local-case-source-pair-binding/v1','zebra-local-case-source-pair-binding/v2'].includes(pair.schema)||pair.case_id!==b.case_id||
     pair.run_id!==b.run_id||pair.techdocs_url!==src.url||pair.techdocs_capture_sha256!==b.capture_sha256||
     !valid(pair.forum_capture_sha256,SHA)||!valid(pair.pair_pin_sha256,SHA)||!valid(pair.grant_sha256,SHA)||
     pair.publication!=='NOT_AUTHORIZED'||pair.reviewer_authenticated!==false)fail();
  const forum=checkSource(pair.forum_url);
  if(forum.kind!=='forum'||forum.url!==pair.forum_url)fail();
  if(pair.schema==='zebra-local-case-source-pair-binding/v2'){
   const sc=pair.scoped_capture, scope=sc?.section_scope, loc=b.captured_paragraph_before_locator;
   if(!exact(pair,['schema','case_id','run_id','pair_pin_sha256','grant_sha256','forum_url','techdocs_url','forum_capture_sha256',
       'techdocs_capture_sha256','scoped_capture','publication','reviewer_authenticated'])||
      !exact(sc,['schema','section_scope','section_envelope_sha256'])||sc.schema!=='zebra-local-scoped-capture-binding/v1'||
      !valid(sc.section_envelope_sha256,SHA)||
      !exact(scope,['schema_version','heading_anchor','boundary','whole_article'])||scope.schema_version!=='zebra-section-scope/v1'||
      !valid(scope.heading_anchor,ID)||scope.whole_article!==false||!['next_heading','article_end','capture_limit'].includes(scope.boundary)||
      !exact(loc,['section_anchor','block_kind','section_block_index','block_sha256','native_capture_anchor'])||
      loc.section_anchor!==scope.heading_anchor||b.source_anchor!==scope.heading_anchor||b.target_anchor===scope.heading_anchor||
      loc.block_kind!=='paragraph'||!Number.isInteger(loc.section_block_index)||loc.section_block_index<0||loc.section_block_index>=120||
      !valid(loc.block_sha256,SHA)||(loc.native_capture_anchor!==null&&!valid(loc.native_capture_anchor,ID)))fail();
   const runDigest=await digest(new TextEncoder().encode(JSON.stringify([b.case_id,pair.forum_capture_sha256,sc.section_envelope_sha256])));
   if(b.run_id!=='CAPTURE-'+runDigest.slice(0,24))fail();
   scopedCapture=Object.freeze({headingAnchor:scope.heading_anchor,boundary:scope.boundary,sectionEnvelopeSha256:sc.section_envelope_sha256});
  }else if(Object.hasOwn(pair,'scoped_capture'))fail();
  pairedForum=forum.url;
 }else if(pair!==undefined||(r.forum_pairing!==undefined&&r.forum_pairing!=='UNVERIFIED_COMPANION_NOT_BOUND_TO_CASE'))fail();
 const zipBytes=await zipFile.arrayBuffer();
 if(zipBytes.byteLength!==zipFile.size||await digest(zipBytes)!==r.archive_hash)fail();
 return Object.freeze({caseId:b.case_id,runId:b.run_id,edition:b.source_version,sourceUrl:src.url,archivePath:b.archive_path,
   archiveSha256:r.archive_hash,pairedForum,...(scopedCapture?{scopedCapture}:{}),blob:new Blob([zipBytes],{type:'application/zip'})});
}

export function bindVerifiedZip(doc,{verify=verifyLocalZip,save=saveLocal}={}){
 const el=id=>doc.getElementById(id);
 const receipt=el('receipt'),zip=el('zip'),pin=el('receipt-pin'),form=el('inputs'),status=el('status'),summary=el('summary'),button=el('save');
 let state=null,epoch=0;
 function invalidate(message=''){
  epoch++;state=null;button.disabled=true;summary.textContent='';status.textContent=message;
 }
 for(const field of [receipt,zip,pin])field.addEventListener('input',()=>invalidate());
 el('clear').addEventListener('click',()=>{
  for(const f of [receipt,zip,pin])f.value='';
  invalidate('Selection discarded.');
 });
 form.addEventListener('submit',async event=>{
  event.preventDefault();invalidate('Checking local file digests…');const round=epoch;
  try{
   const result=await verify({receiptFile:receipt.files[0],zipFile:zip.files[0],expectedReceiptSha256:pin.value});
   if(round!==epoch)return;
   state=result;
   summary.textContent=[result.caseId,result.runId,'Edition '+result.edition,result.sourceUrl,
    'Receipt-reported archive location: '+result.archivePath,'ZIP SHA-256: '+result.archiveSha256,
    ...(result.scopedCapture?['Partial TechDocs section (receipt): #'+result.scopedCapture.headingAnchor,'Capture boundary: '+result.scopedCapture.boundary,
      'Section envelope SHA-256: '+result.scopedCapture.sectionEnvelopeSha256]:[])].join('\n');
   status.textContent='Exact ZIP bytes match the pinned receipt. '+(result.pairedForum?'The receipt reports a pinned forum pair: '+result.pairedForum+'. ':'The accompanying forum capture is not bound to the reviewed case. ')+'Archive structure and reviewer identity were not checked.';
   button.disabled=false;
  }catch{if(round===epoch)invalidate('Verification failed. Check the independent receipt pin and the two local files.');}
 });
 button.addEventListener('click',()=>{
  if(!state||button.disabled)return;
  try{save(doc,state.blob);invalidate('Download requested. Check browser downloads.');}
  catch{invalidate('Could not request the download. Verify the files again.');}
 });
}
function saveLocal(doc,blob){
 const url=URL.createObjectURL(blob),a=doc.createElement('a');
 a.href=url;a.download='zebra-local-reviewed-revision.zip';doc.body.append(a);
 try{a.click();}finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);}
}
if(typeof document!=='undefined')bindVerifiedZip(document);
