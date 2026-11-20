import {boundedCopy,sha256 as sha} from './archive-bytes.mjs';
import {buildApprovedRevisionArchive} from './approved-revision-archive.mjs';
import {normalizeCapture} from './engine.js';
import {checkReviewedPair} from './reviewed-pair.mjs';
import {mirrorZip} from './zip.js';

const fail=()=>{throw Error('Local reviewed archive inputs failed validation.');};
const utf=new TextDecoder('utf-8',{fatal:true});
const parse=bytes=>JSON.parse(utf.decode(bytes));

function selected(raw,kind) {
 const row=parse(raw);
 if(row?.schema_version!=='zebra-reviewed-mirror-page/v1'||row.capture?.source_kind!==kind||
    Object.keys(row).some(k=>!['schema_version','capture','discovered_links','link_discovery'].includes(k))||
    !Array.isArray(row.discovered_links)||row.discovered_links.length>20)fail();
 // This bounded mode intentionally builds only the two selected roots; no link edges are used.
 return row.capture;
}
const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&
 Object.keys(value).length===keys.length&&keys.every(k=>Object.hasOwn(value,k));

export function normalizeScopedArchiveInput(forumValue,techdocsValue){
 const fields=['schema_version','source_url','captured_at','title','source_kind','blocks','truncated'];
 const packet=value=>{
  if(!exact(value,fields))fail();
  const cap=normalizeCapture(value);
  const blocks=cap.blocks.map(({kind,text,anchor,level})=>({kind,text,
   ...(anchor===undefined?{}:{anchor}),...(level===undefined?{}:{level})}));
  return {...cap,blocks};
 };
 if(!exact(techdocsValue,['capture','section_scope']))fail();
 const forum=packet(forumValue), techdocs=packet(techdocsValue.capture), scope=techdocsValue.section_scope;
 if(forum.source_kind!=='forum'||techdocs.source_kind!=='techdocs'||!techdocs.truncated||
    !/^https:\/\/techdocs\.zebra\.com\/(?:[a-z][a-z0-9-]*|dcs\/rfid\/android)\/\d{1,4}(?:-\d{1,4}){1,4}\//.test(techdocs.source_url)||
    !exact(scope,['schema_version','heading_anchor','boundary','whole_article'])||
    scope.schema_version!=='zebra-section-scope/v1'||scope.whole_article!==false||
    typeof scope.heading_anchor!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$/.test(scope.heading_anchor)||
    !['next_heading','article_end','capture_limit'].includes(scope.boundary))fail();
 // Older flat scoped exports may encode a quoted/list heading as a structural heading.
 // They stay readable by intake but this archive mode requires unambiguous boundaries; recapture with the scoped serializer.
 const first=techdocs.blocks[0];
 if(techdocs.blocks.length<2||first.kind!=='heading'||!first.level||first.anchor!==scope.heading_anchor||
    techdocs.blocks.slice(1).some(b=>b.anchor===scope.heading_anchor||(b.kind==='heading'&&b.level<=first.level)))fail();
 return {forum,techdocs,scope:{schema_version:scope.schema_version,heading_anchor:scope.heading_anchor,
   boundary:scope.boundary,whole_article:false}};
}
export async function assembleSelectedArchive({forum,techdocs,grant,trustPin,receipt,baseline,workingCopy,pairBytes,pairPin,excerptViews=false}) {
 forum=boundedCopy(forum,360_000,fail);
 techdocs=boundedCopy(techdocs,360_000,fail);
 grant=boundedCopy(grant,16_384,fail);
 if(pairBytes!==undefined||pairPin!==undefined)pairBytes=boundedCopy(pairBytes,8192,fail);
 receipt=boundedCopy(receipt,32_000,fail);
 const docValue=parse(techdocs),isScoped=docValue&&Object.hasOwn(docValue,'section_scope');
 if(isScoped&&(pairBytes===undefined||pairPin===undefined))fail();
 const scoped=isScoped?normalizeScopedArchiveInput(parse(forum),docValue):null;
 const captures=scoped?[scoped.forum,scoped.techdocs]:[selected(forum,'forum'),selected(techdocs,'techdocs')];
 const roots=captures.map(c=>c.source_url);
 const input={schema_version:'zebra-mirror-input/v1',allowed_origins:roots.map(url=>new URL(url).origin),roots,
  pages:captures.map(capture=>({capture,discovered_links:[],link_discovery:'unknown'})),
  budget:{maxPages:2,maxDepth:0,maxBytes:48_000,maxLinksPerPage:4}};
 // Prior r41 replay pinned a separate smaller archive budget (48k), preserve it for reproducible archives.
 const out=await buildApprovedRevisionArchive({input,grantBytes:grant,trustedGrantSha256:trustPin,
    receipt:parse(receipt),baselineBytes:baseline,workingCopyBytes:workingCopy,excerptViews});
 let pair;
 if(pairBytes!==undefined||pairPin!==undefined){
  pair=await checkReviewedPair({pairBytes,pin:pairPin,grantBytes:grant,forum:captures[0],techdocs:captures[1],binding:out.manifest.local_revision_overlay,scope:scoped?.scope});
  out.manifest.local_case_source_pair=pair;
  if(scoped)out.manifest.local_scoped_capture=pair.scoped_capture;
  out.files.set('manifest.json',JSON.stringify(out.manifest,null,2)+'\n');
 }
 const bytes=new Uint8Array(await mirrorZip(out.files).arrayBuffer());
 return {buffer:bytes,report:{schema:'zebra-local-reviewed-archive-check/v1',member_count:out.files.size,archive_hash:await sha(bytes),
  members:Object.fromEntries(await Promise.all([...out.files].map(async ([name,content])=>[name,await sha(content)]))),binding:out.manifest.local_revision_overlay,
  source_capture:'caller-selected local capture files; see archive coverage for truncation',
  forum_pairing:pair?'EXACT_LOCAL_PAIR_PIN_MATCHED':'UNVERIFIED_COMPANION_NOT_BOUND_TO_CASE',
  ...(pair?{source_pair:pair}:{}),
  browser_extension_install:'NOT_RUN',model:'NOT_RUN',publication:'NOT_AUTHORIZED'}};
}

export const archiveCheckReceiptText=report=>JSON.stringify(report,null,2)+'\n';
