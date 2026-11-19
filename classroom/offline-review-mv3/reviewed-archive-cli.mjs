import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {zipApprovedRevisionArchive} from './approved-revision-archive.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const fail=()=>{throw Error('Local reviewed archive inputs failed validation.');};
const utf=new TextDecoder('utf-8',{fatal:true});
const parse=bytes=>JSON.parse(utf.decode(bytes));
function local(filename,max) {
 if(typeof fs.constants.O_NOFOLLOW!=='number'||typeof fs.constants.O_NONBLOCK!=='number')fail();
 const fd=fs.openSync(filename,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW|fs.constants.O_NONBLOCK);
 try{
  const st=fs.fstatSync(fd);if(!st.isFile()||st.size>max)fail();
  const buf=Buffer.alloc(max+1);let off=0;
  while(off<buf.length){const n=fs.readSync(fd,buf,off,buf.length-off,null);if(!n)break;off+=n;}
  if(off>max)fail();
  return buf.subarray(0,off);
 }finally{fs.closeSync(fd);}
}
function selected(raw,kind) {
 const row=parse(raw);
 if(row?.schema_version!=='zebra-reviewed-mirror-page/v1'||row.capture?.source_kind!==kind||
    Object.keys(row).some(k=>!['schema_version','capture','discovered_links','link_discovery'].includes(k))||
    !Array.isArray(row.discovered_links)||row.discovered_links.length>20)fail();
 // This bounded mode intentionally builds only the two selected roots; no link edges are used.
 return row.capture;
}
export async function assembleSelectedArchive({forum,techdocs,grant,trustPin,receipt,baseline,workingCopy}) {
 const captures=[selected(forum,'forum'),selected(techdocs,'techdocs')],roots=captures.map(c=>c.source_url);
 const input={schema_version:'zebra-mirror-input/v1',allowed_origins:roots.map(url=>new URL(url).origin),roots,
  pages:captures.map(capture=>({capture,discovered_links:[],link_discovery:'unknown'})),
  budget:{maxPages:2,maxDepth:0,maxBytes:48_000,maxLinksPerPage:4}};
 // Prior r41 replay pinned a separate smaller archive budget (48k), preserve it for reproducible archives.
 const out=await zipApprovedRevisionArchive({input,grantBytes:grant,trustedGrantSha256:trustPin,
    receipt:parse(receipt),baselineBytes:baseline,workingCopyBytes:workingCopy});
 const buffer=Buffer.from(await out.zip.arrayBuffer());
 return {buffer,report:{schema:'zebra-local-reviewed-archive-check/v1',member_count:out.files.size,archive_hash:sha(buffer),
  members:Object.fromEntries([...out.files].map(([name,bytes])=>[name,sha(bytes)])),binding:out.manifest.local_revision_overlay,
  source_capture:'caller-selected local capture files; see archive coverage for truncation',
  forum_pairing:'UNVERIFIED_COMPANION_NOT_BOUND_TO_CASE',
  browser_extension_install:'NOT_RUN',model:'NOT_RUN',publication:'NOT_AUTHORIZED'}};
}
async function main(args){
 const [flag,dir,trustPin,output,...extra]=args;
 if(flag!=='--reviewed-local'||!dir||!output||extra.length||!/^[a-f0-9]{64}$/.test(trustPin??''))fail();
 if(!path.isAbsolute(dir)||fs.realpathSync(dir)!==dir||!fs.lstatSync(dir).isDirectory()||dir===path.parse(dir).root)fail();
 const read=(name,max)=>local(path.join(dir,name),max);
 const r=await assembleSelectedArchive({forum:read('forum.json',360_000),techdocs:read('techdocs.json',360_000),
   grant:read('grant.json',32_000),trustPin,receipt:read('receipt.json',32_000),
   baseline:read('baseline.html',500_000),workingCopy:read('working-copy.html',500_000)});
 fs.writeFileSync(output,r.buffer,{flag:'wx',mode:0o600});
 return r.report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{process.stdout.write(JSON.stringify(await main(process.argv.slice(2)),null,2)+'\n');}
 catch{process.stderr.write('Reviewed local archive was not generated. Check the selected inputs, independent pin, and unused ZIP path.\n');process.exitCode=1;}
}
