import {assembleSelectedArchive} from './reviewed-archive-portable.mjs';
const form=document.querySelector('#reviewed'), status=document.querySelector('#status'), archive=document.querySelector('#archive');
const sizes={forum:360_000,techdocs:360_000,grant:16_384,pairBytes:8192,baseline:500_000,workingCopy:500_000,receipt:32_000};
let objectUrl, generation=0;
function clear(){
  generation++;
  if(objectUrl)URL.revokeObjectURL(objectUrl);
  objectUrl=undefined;
  archive.removeAttribute('href');archive.hidden=true;status.textContent='';
}
form.addEventListener('input',clear);
form.addEventListener('change',clear);
form.addEventListener('submit',async event=>{
  event.preventDefault();clear();
  const current=generation, data=new FormData(form);
  status.textContent='Checking the selected files and reviewer pins…';
  try{
    if(!globalThis.crypto?.subtle)throw Error('Secure browser context required.');
    const trustPin=data.get('trustPin'),pairPin=data.get('pairPin');
    if(![trustPin,pairPin].every(pin=>typeof pin==='string'&&/^[a-f0-9]{64}$/.test(pin)))throw Error('Two pins required.');
    const selected=Object.fromEntries(await Promise.all(Object.entries(sizes).map(async ([key,max])=>{
      const file=data.get(key);
      if(!(file instanceof File)||!file.size||file.size>max)throw Error('Missing or oversized input.');
      return [key,new Uint8Array(await file.arrayBuffer())];
    })));
    const {buffer,report}=await assembleSelectedArchive({...selected,trustPin,pairPin});
    if(current!==generation)return;
    objectUrl=URL.createObjectURL(new Blob([buffer],{type:'application/zip'}));
    archive.href=objectUrl;archive.hidden=false;
    status.textContent=`ZIP ready: ${report.member_count} files. SHA-256: ${report.archive_hash}. Local only; not published.`;
  }catch{
    if(current!==generation)return;
    status.textContent='ZIP was not generated. Check the selected files, both review pins, and file size limits.';
  }
});
window.addEventListener('pagehide',clear);
