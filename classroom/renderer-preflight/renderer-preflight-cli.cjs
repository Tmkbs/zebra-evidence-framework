'use strict';
const fs=require('node:fs'),path=require('node:path');
const {createRendererPreflight}=require('./renderer-preflight.cjs');
const utf=new TextDecoder('utf-8',{fatal:true});
function localFile(filename,limit) {
 if(typeof fs.constants.O_NOFOLLOW!=='number'||typeof fs.constants.O_NONBLOCK!=='number')throw Error('Unsupported file checks');
 const fd=fs.openSync(filename,fs.constants.O_RDONLY|fs.constants.O_NOFOLLOW|fs.constants.O_NONBLOCK);
 try {
  const st=fs.fstatSync(fd);
  if(!st.isFile()||st.size>limit)throw Error('Invalid input size or type');
  const buf=Buffer.alloc(limit+1);
  let n=0;
  while(n<buf.length){const k=fs.readSync(fd,buf,n,buf.length-n,null);if(!k)break;n+=k;}
  if(n>limit)throw Error('Input exceeds read limit');
  return utf.decode(buf.subarray(0,n));
 }finally{fs.closeSync(fd);}
}
function validateRoot(input) {
 if(!path.isAbsolute(input)||path.normalize(input)!==input||!fs.lstatSync(input).isDirectory()||
    fs.realpathSync(input)!==input||input===path.parse(input).root)throw Error('Use a canonical dedicated input directory');
 return input;
}
function main(args,env=process.env) {
 if(args.length!==2||args[0]!=='--reviewed-local')throw Error('Explicit local review flag required');
 const input=validateRoot(args[1]);
 const adapter=env.ZEBRA_LOCAL_RENDERER_ADAPTER;
 if(!adapter||!path.isAbsolute(adapter)||path.extname(adapter)!=='.cjs'||
    !fs.lstatSync(adapter).isFile()||fs.realpathSync(adapter)!==adapter||
    adapter.startsWith(input+path.sep))throw Error('Select a separately trusted pure app adapter');
 const parse=(name,max)=>JSON.parse(localFile(path.join(input,name),max));
 const trustedBaseline=parse('baseline.json',350_000);
 const handoff=parse('handoff.json',650_000);
 const originalHtml=localFile(path.join(input,'original.html'),500_000);
 return createRendererPreflight(require(adapter))({handoff,trustedBaseline,originalHtml});
}
if(require.main===module){
 try {
  const out=main(process.argv.slice(2));
  process.stdout.write(JSON.stringify(out)+'\n');
  if(out.result!=='LOCAL_COPY_RENDERER_ACCEPTS_PINNED_BINDINGS')process.exitCode=1;
 }catch{
  process.stderr.write(JSON.stringify({schema:'zebra-renderer-preflight-error/v1',error:'LOCAL_INPUT_REJECTED',
   write_performed:false,apply_allowed:false,merge_allowed:false})+'\n');
  process.exitCode=1;
 }
}
module.exports={main};
