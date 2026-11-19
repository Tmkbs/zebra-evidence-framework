'use strict';
const fs=require('node:fs');
const LIMIT=160_000;
const deps=require('../capture-intake.cjs');
const adapter=require('./reviewed-pair.cjs').createReviewedPairAdapter(deps);
const {verifyMirrorManifest}=require('./verify-mirror-manifest.cjs');
const HASH=/^[0-9a-f]{64}$/;
const args=process.argv.slice(2);
const USAGE='Use inspect <capture-or-collection.json> <exact-public-url>, or intake --approve-local <forum.json> <forum-url> <reviewed-forum-sha256> <techdocs.json> <techdocs-url> <reviewed-techdocs-sha256> [case-id]; append --mirror-manifest <extracted-manifest.json> for metadata correlation.';
class CliError extends Error {
 constructor(code,message){super(message);this.code=code;}
}
function load(path,limit=LIMIT,collectionAware=false) {
 let fd;
 try{
  const {O_RDONLY,O_NONBLOCK,O_NOFOLLOW}=fs.constants;
  if(![O_NONBLOCK,O_NOFOLLOW].every(n=>Number.isInteger(n)&&n>0&&n<=0x7fffffff)||
     (O_NONBLOCK&O_NOFOLLOW)!==0)throw new CliError('UNSUPPORTED_FILE_GUARD','Local file protection is unavailable on this host.');
  fd=fs.openSync(path,O_RDONLY|O_NONBLOCK|O_NOFOLLOW);
  const st=fs.fstatSync(fd);
  if(!st.isFile()||st.size>limit)throw new CliError('CAPTURE_LIMIT','Only a bounded regular local capture file is accepted.');
  const buf=Buffer.alloc(limit+1);
  let n=0;
  while(n<buf.length){
   const next=fs.readSync(fd,buf,n,buf.length-n,null);if(!next)break;n+=next;
  }
  if(n>limit)throw new CliError('CAPTURE_LIMIT','Only a bounded regular local capture file is accepted.');
  let decoded;
  try{decoded=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(buf.subarray(0,n)));}
  catch{throw new CliError('CAPTURE_JSON','Invalid UTF-8 or JSON capture.');}
  if(collectionAware&&n>LIMIT&&decoded?.schema_version!=='zebra-reviewed-mirror-page/v1')
   throw new CliError('CAPTURE_LIMIT','Only a bounded regular local capture file is accepted.');
  return decoded;
 }catch(e){if(e instanceof CliError)throw e;throw new CliError('CAPTURE_IO','Local capture could not be safely opened.');}
 finally{if(fd!==undefined)fs.closeSync(fd);}
}
function loadCapture(path) {
 const packet=load(path,360_000,true);
 if(packet?.schema_version!=='zebra-reviewed-mirror-page/v1')return deps.validateCapture(packet);
 const keys=Object.keys(packet), has=(k)=>Object.hasOwn(packet,k);
 if(!has('capture')||!has('discovered_links')||keys.some(k=>!['schema_version','capture','discovered_links','link_discovery'].includes(k))||
   !Array.isArray(packet.discovered_links)||packet.discovered_links.length>20||
   (has('link_discovery')&&!['filtered_scan_finished','retained_link_limit','candidate_scan_limit','unknown'].includes(packet.link_discovery)))
  throw new CliError('COLLECTION_ENVELOPE','Invalid reviewed mirror page envelope.');
 // Link discovery fields are archive metadata only. They are not reviewed intake evidence,
 // are never followed, and are neither echoed nor included in the canonical packet digest.
 return deps.validateCapture(packet.capture);
}
function run() {
 if(args[0]==='inspect'&&args.length===3) {
  const packet=loadCapture(args[1]);
  return {schema:'zebra-local-capture-preview/v1',...adapter.inspect(packet,args[2]),blocks:packet.blocks,
   source_status:'PUBLIC_URL_NOT_INDEPENDENTLY_VERIFIED',model_execution_status:'NOT_RUN',approved_for_local_intake:false};
 }
 let mirrorPath=null;
 if(args[0]==='intake'&&args.length>=10&&args.at(-2)==='--mirror-manifest'){
  mirrorPath=args.at(-1);args.splice(-2);
 }
 if(args[0]!=='intake'||args[1]!=='--approve-local'||![8,9].includes(args.length)||
   !HASH.test(args[4])||!HASH.test(args[7]))throw new CliError('USAGE',USAGE);
 const entry=(path,source_url,sha256)=>({packet:loadCapture(path),review:{source_url,sha256,approved_for_local_intake:true}});
 const forum=entry(...args.slice(2,5)),techdocs=entry(...args.slice(5,8));
 const intake=adapter.run({forum,techdocs,caseId:args[8]??null});
 if(mirrorPath===null)return intake;
 const mirror=verifyMirrorManifest(load(mirrorPath),deps.validateCapture(techdocs.packet));
 return {schema:'zebra-correlated-intake/v1',mirror,intake};
}
try{process.stdout.write(JSON.stringify(run(),null,2)+'\n');}
catch(err){
 const known=err instanceof CliError||err instanceof deps.IntakeError;
 process.stderr.write(JSON.stringify({schema:'zebra-capture-intake-error/v1',release:'NOT_AUTHORIZED',model_execution:'NOT_RUN',
  error:{code:known?err.code:'INTAKE_REJECTED',message:known?err.message:'Capture approval, source URL, digest or result contract failed.'}})+'\n');
 process.exitCode=1;
}
