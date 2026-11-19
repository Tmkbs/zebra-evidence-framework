import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

import {assembleSelectedArchive} from './reviewed-archive-portable.mjs';
export {assembleSelectedArchive};

const fail=()=>{throw Error('Local reviewed archive inputs failed validation.');};
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
async function main(args){
 const [flag,dir,trustPin,output,...extra]=args;
 const paired=flag==='--paired-local';
 if((!paired&&flag!=='--reviewed-local')||!dir||!output||extra.length!==(paired?1:0)||!/^[a-f0-9]{64}$/.test(trustPin??''))fail();
 if(!path.isAbsolute(dir)||fs.realpathSync(dir)!==dir||!fs.lstatSync(dir).isDirectory()||dir===path.parse(dir).root)fail();
 const read=(name,max)=>local(path.join(dir,name),max);
 const r=await assembleSelectedArchive({forum:read('forum.json',360_000),techdocs:read('techdocs.json',360_000),
   grant:read('grant.json',32_000),trustPin,receipt:read('receipt.json',32_000),
   baseline:read('baseline.html',500_000),workingCopy:read('working-copy.html',500_000),
   ...(paired?{pairBytes:read('pair.json',8192),pairPin:extra[0]}:{})});
 fs.writeFileSync(output,r.buffer,{flag:'wx',mode:0o600});
 return r.report;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{process.stdout.write(JSON.stringify(await main(process.argv.slice(2)),null,2)+'\n');}
 catch{process.stderr.write('Reviewed local archive was not generated. Check the selected inputs, independent pin, and unused ZIP path.\n');process.exitCode=1;}
}
