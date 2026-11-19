'use strict';
const fs=require('node:fs');
const LIMIT=160_000;
const deps=require('../capture-intake.cjs');
const adapter=require('./reviewed-pair.cjs').createReviewedPairAdapter(deps);
const HASH=/^[0-9a-f]{64}$/;
const args=process.argv.slice(2);
const USAGE='Use inspect <capture.json> <exact-public-url>, or intake --approve-local <forum.json> <forum-url> <reviewed-forum-sha256> <techdocs.json> <techdocs-url> <reviewed-techdocs-sha256> [case-id].';
class CliError extends Error {
 constructor(code,message){super(message);this.code=code;}
}
function load(path) {
 let fd;
 try{
  fd=fs.openSync(path,fs.constants.O_RDONLY|fs.constants.O_NONBLOCK|fs.constants.O_NOFOLLOW);
  const st=fs.fstatSync(fd);
  if(!st.isFile()||st.size>LIMIT)throw new CliError('CAPTURE_LIMIT','Only a bounded regular local capture file is accepted.');
  const buf=Buffer.alloc(LIMIT+1);
  let n=0;
  while(n<buf.length){
   const next=fs.readSync(fd,buf,n,buf.length-n,null);if(!next)break;n+=next;
  }
  if(n>LIMIT)throw new CliError('CAPTURE_LIMIT','Only a bounded regular local capture file is accepted.');
  try{return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(buf.subarray(0,n)));}
  catch{throw new CliError('CAPTURE_JSON','Invalid UTF-8 or JSON capture.');}
 }catch(e){if(e instanceof CliError)throw e;throw new CliError('CAPTURE_IO','Local capture could not be safely opened.');}
 finally{if(fd!==undefined)fs.closeSync(fd);}
}
function run() {
 if(args[0]==='inspect'&&args.length===3) {
  const packet=deps.validateCapture(load(args[1]));
  return {schema:'zebra-local-capture-preview/v1',...adapter.inspect(packet,args[2]),blocks:packet.blocks,
   source_status:'PUBLIC_URL_NOT_INDEPENDENTLY_VERIFIED',model_execution_status:'NOT_RUN',approved_for_local_intake:false};
 }
 if(args[0]!=='intake'||args[1]!=='--approve-local'||![8,9].includes(args.length)||
   !HASH.test(args[4])||!HASH.test(args[7]))throw new CliError('USAGE',USAGE);
 const entry=(path,source_url,sha256)=>({packet:load(path),review:{source_url,sha256,approved_for_local_intake:true}});
 return adapter.run({forum:entry(...args.slice(2,5)),techdocs:entry(...args.slice(5,8)),caseId:args[8]??null});
}
try{process.stdout.write(JSON.stringify(run(),null,2)+'\n');}
catch(err){
 const known=err instanceof CliError||err instanceof deps.IntakeError;
 process.stderr.write(JSON.stringify({schema:'zebra-capture-intake-error/v1',release:'NOT_AUTHORIZED',model_execution:'NOT_RUN',
  error:{code:known?err.code:'INTAKE_REJECTED',message:known?err.message:'Capture approval, source URL, digest or result contract failed.'}})+'\n');
 process.exitCode=1;
}
