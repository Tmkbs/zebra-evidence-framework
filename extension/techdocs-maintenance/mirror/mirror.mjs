import {promises as fs} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {buildMirror} from './engine.js';

async function main(args){
 if(args.length!==2)throw new Error('Usage: node mirror.mjs <input.json> <new output directory>');
 const [input,folder]=args;
 const st=await fs.stat(input);
 if(!st.isFile()||st.size>8_000_000)throw new Error('Provide a regular capture bundle under 8 MB.');
 const raw=await fs.readFile(input);
 if(raw.length>8_000_000)throw new Error('Capture grew beyond the file limit.');
 const {files,manifest}=buildMirror(JSON.parse(raw.toString('utf8')));
 const out=resolve(folder);
 await fs.mkdir(out); // exclusive: never replace an existing output directory
 for(const [name,body] of files){
  if(!/^(?:index\.html|manifest\.json|site\.css|pages\/[0-9]{3}\.html)$/.test(name))throw new Error('invalid generated file path');
  const path=resolve(out,name);
  await fs.mkdir(dirname(path),{recursive:true});
  await fs.writeFile(path,body,{encoding:'utf8',flag:'wx'});
 }
 console.log(JSON.stringify({captured_pages:manifest.captured_pages,missing:manifest.missing.length}));
}
main(process.argv.slice(2)).catch(e=>{console.error(e.message);process.exitCode=1;});
