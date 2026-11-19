import {boundedCopy,sha256 as sha} from './archive-bytes.mjs';
import {buildApprovedRevisionArchive} from './approved-revision-archive.mjs';
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
export async function assembleSelectedArchive({forum,techdocs,grant,trustPin,receipt,baseline,workingCopy,pairBytes,pairPin}) {
 forum=boundedCopy(forum,360_000,fail);
 techdocs=boundedCopy(techdocs,360_000,fail);
 grant=boundedCopy(grant,16_384,fail);
 if(pairBytes!==undefined||pairPin!==undefined)pairBytes=boundedCopy(pairBytes,8192,fail);
 receipt=boundedCopy(receipt,32_000,fail);
 const captures=[selected(forum,'forum'),selected(techdocs,'techdocs')],roots=captures.map(c=>c.source_url);
 const input={schema_version:'zebra-mirror-input/v1',allowed_origins:roots.map(url=>new URL(url).origin),roots,
  pages:captures.map(capture=>({capture,discovered_links:[],link_discovery:'unknown'})),
  budget:{maxPages:2,maxDepth:0,maxBytes:48_000,maxLinksPerPage:4}};
 // Prior r41 replay pinned a separate smaller archive budget (48k), preserve it for reproducible archives.
 const out=await buildApprovedRevisionArchive({input,grantBytes:grant,trustedGrantSha256:trustPin,
    receipt:parse(receipt),baselineBytes:baseline,workingCopyBytes:workingCopy});
 let pair;
 if(pairBytes!==undefined||pairPin!==undefined){
  pair=await checkReviewedPair({pairBytes,pin:pairPin,grantBytes:grant,forum:captures[0],techdocs:captures[1],binding:out.manifest.local_revision_overlay});
  out.manifest.local_case_source_pair=pair;
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
