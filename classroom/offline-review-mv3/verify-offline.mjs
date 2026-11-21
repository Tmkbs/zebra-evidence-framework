import {isDeepStrictEqual} from 'node:util';
import captureIntake from '../capture-intake.cjs';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {COLLECTION_LIMITS,previewCollection} from './extension/collect.js';

const fail=()=>{throw new Error('Extracted offline output differs from the reviewed collection or is not safely readable.');};
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const guardFlags=[fs.constants.O_NONBLOCK,fs.constants.O_NOFOLLOW];
const guarded=guardFlags.every(v=>Number.isInteger(v)&&v>0);
const flags=guarded?fs.constants.O_RDONLY|guardFlags[0]|guardFlags[1]:null;
function read(file,limit) {
 if(!guarded)fail();
 const fd=fs.openSync(file,flags);
 try {
  const stat=fs.fstatSync(fd);
  if(!stat.isFile()||stat.size>limit)fail();
  const buf=Buffer.alloc(limit+1);
  let n=0;
  while(n<buf.length){const step=fs.readSync(fd,buf,n,buf.length-n,null);if(!step)break;n+=step;}
  if(n>limit)fail();
  return buf.subarray(0,n);
 } finally {fs.closeSync(fd);}
}
function list(dir,expected) {
 if(!fs.lstatSync(dir).isDirectory())fail();
 const parent=fs.opendirSync(dir);
 const seen=new Set();
 try {
  for(let d;(d=parent.readSync());){
   if(!expected.has(d.name)||seen.has(d.name)||d.isSymbolicLink())fail();
   if(d.name==='pages'?!d.isDirectory():!d.isFile())fail();
   seen.add(d.name);
  }
 } finally {parent.closeSync();}
 if(seen.size!==expected.size)fail();
}
function bindRun(record,collection) {
 const source=record?.capture_binding?.structured_sources;
 if(record?.schema!=='zebra-doc-capture-intake/v1'||!source||typeof record?.case?.id!=='string')fail();
 const expected=captureIntake.intake({forum:source.forum,techdocs:source.techdocs,caseId:record.case.id});
 if(!isDeepStrictEqual(expected,record))fail();
 const pair=expected.capture_binding.captures.find(c=>c.kind==='techdocs');
 const pages=collection.pages.filter(p=>p.capture.source_url===pair.url);
 if(pages.length!==1)fail();
 const cap=captureIntake.validateCapture(pages[0].capture);
 if(hash(JSON.stringify(cap))!==pair.sha256)fail();
 return {schema:'zebra-offline-intake-link/v1',status:'TECHDOCS_CAPTURE_DIGEST_MATCH',
  case_id:expected.case.id,run_id:expected.run_id,source_url:pair.url,capture_sha256:pair.sha256,
  source_version_from_url:expected.document_snapshot.source_version_from_url,
  intake_stage:expected.stage,model_execution:'NOT_RUN',apply_allowed:false};
}
export function verifyOffline({root,entryFiles,outputDir,approved=false,intakePath=null}) {
 if(approved!==true||!Array.isArray(entryFiles)||entryFiles.length<1||entryFiles.length>COLLECTION_LIMITS.pages)
  throw new Error('Supply only an explicitly reviewed local collection.');
 const decoder=new TextDecoder('utf-8',{fatal:true});
 let total=0;
 const entries=entryFiles.map(file=>{
  const bytes=read(file,Math.min(COLLECTION_LIMITS.entryBytes,COLLECTION_LIMITS.inputBytes-total));
  total+=bytes.length;
  return decoder.decode(bytes);
 });
 const collection=previewCollection(root,entries);
 const {files,manifest}=collection.export({approved:true});
 const link=intakePath===null?null:bindRun(JSON.parse(decoder.decode(read(intakePath,1_000_000))),collection.preview());
 const top=new Set(), articles=new Set();
 for(const name of files.keys()){
  if(/^pages\/\d{3}\.html$/u.test(name))articles.add(name.slice(6));
  else if(['index.html','site.css','manifest.json'].includes(name))top.add(name);
  else fail();
 }
 if(articles.size)top.add('pages');
 list(outputDir,top);
 if(articles.size)list(path.join(outputDir,'pages'),articles);
 const verified=[];
 for(const [name,text] of files){
  const expected=Buffer.from(text,'utf8');
  const actual=read(path.join(outputDir,name),expected.length);
  if(!expected.equals(actual))fail();
  verified.push({path:name,sha256:hash(actual),bytes:actual.length});
 }
 return {schema:'zebra-offline-artifact-verification/v1',status:'BYTE_MATCH_TO_REVIEWED_LOCAL_COLLECTION',
  root:manifest.roots[0],file_count:verified.length,files:verified,
  browser_origin_authenticated:false,zip_container_validated:false,model_execution:'NOT_RUN',...(link?{intake_link:link}:{})};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  const [flag,outputDir,root,...entryFiles]=process.argv.slice(2);
  if(flag!=='--reviewed-local'||!outputDir||!root)throw new Error('Usage.');
  let intakePath=null;
  if(entryFiles.length>=3&&entryFiles.at(-2)==='--intake-record')intakePath=entryFiles.splice(-2)[1];
  process.stdout.write(JSON.stringify(verifyOffline({root,entryFiles,outputDir,approved:true,intakePath}),null,2)+'\n');
 }catch{
  process.stderr.write('Offline verification failed. Supply --reviewed-local <extracted-directory> <exact-root-url> <collection.json> [...] [--intake-record intake.json] and check the exact exported files.\n');
  process.exitCode=1;
 }
}
