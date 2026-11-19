import {readActiveTab} from './capture.js';
import {createCaptureMirrorSession} from './session.js';
import {mirrorZip} from './zip.js';
import {describeLinkDiscovery} from './engine.js';

const el=id=>document.getElementById(id);
const permit=el('public'), capture=el('capture'), save=el('save'), status=el('status'), review=el('reviewed'), zip=el('mirror');
const entry=el('collection-entry');
let selected=null, session=null, result=null, busy=false;
const sync=()=>{
  capture.disabled=busy||!selected||!permit.checked;
  permit.disabled=busy||!selected;
  review.disabled=busy||!result||!permit.checked;
  save.disabled=zip.disabled=entry.disabled=review.disabled||!review.checked;
};
const discard=()=>{
  session?.clear();result=null;review.checked=false;
  el('preview').hidden=true;el('blocks').replaceChildren();
  el('links').hidden=true;el('links').replaceChildren();el('linkCount').textContent='';el('captureTitle').textContent='';
  sync();
};
const item=value=>{const i=document.createElement('li');i.textContent=value;return i;};
function download(blob, filename) {
  const url=URL.createObjectURL(blob), a=document.createElement('a');
  a.href=url;a.download=filename;document.body.append(a);
  try{a.click();}finally{a.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);}
}
permit.addEventListener('change',()=>{if(!permit.checked)discard();sync();});
review.addEventListener('change',sync);
el('clear').addEventListener('click',()=>{discard();status.textContent='Capture discarded.';});
capture.addEventListener('click',async()=>{
  if(capture.disabled)return;
  discard();busy=true;sync();status.textContent='Reading this approved page…';
  try {
    result=await session.capture({expected:selected,approved:permit.checked});
    el('captureTitle').textContent='Captured title: '+result.packet.title;
    el('blocks').replaceChildren(...result.packet.blocks.map(b=>item(b.kind.replaceAll('_',' ')+': '+b.text)));
    el('links').replaceChildren(...result.links.map(link=>item((link.label ?? link.target_url)+' | '+link.target_url)));
    el('links').hidden=!result.links.length;
    el('linkCount').textContent=result.links.length+' same-origin link(s) found; linked pages are not fetched. '+describeLinkDiscovery(result.link_discovery);
    el('preview').hidden=false;el('preview').open=true;
    status.textContent=result.packet.truncated?'Capture was truncated. Inspect before export.':'Capture ready. Inspect before export.';
  } catch {
    discard();status.textContent='Capture stopped or discarded. Verify the public page and try again.';
  } finally{busy=false;sync();}
});
save.addEventListener('click',()=>{
  if(save.disabled)return;
  download(new Blob([JSON.stringify(result.packet,null,2)+'\n'],{type:'application/json;charset=utf-8'}),'zebra-public-capture.json');
  status.textContent='JSON download requested. Check the browser downloads.';
});
entry.addEventListener('click',()=>{
  if(entry.disabled)return;
  const envelope={schema_version:'zebra-reviewed-mirror-page/v1',capture:result.packet,discovered_links:result.links,...(result.link_discovery===undefined?{}:{link_discovery:result.link_discovery})};
  download(new Blob([JSON.stringify(envelope)+'\n'],{type:'application/json;charset=utf-8'}),'zebra-reviewed-mirror-page.json');
  status.textContent='Collection file download requested. Check browser downloads.';
});
zip.addEventListener('click',()=>{
  if(zip.disabled)return;
  try {
    session.stage({token:result.token,approved:review.checked});
    const output=session.build({approved:review.checked});
    download(mirrorZip(output.files),'zebra-public-offline-snapshot.zip');discard();
    status.textContent='Offline ZIP download requested. Extract it and open index.html.';
  } catch {
    discard();status.textContent='Could not build the offline ZIP. Recapture and try again.';
  }
});
(async()=>{
  try {
    selected=await readActiveTab(chrome);
    session=createCaptureMirrorSession(chrome,{roots:[selected.source.url]});
    el('target').textContent=selected.source.url;
  }catch {
    selected=null;el('target').textContent='Unsupported active tab.';
    status.textContent='Open an official public Zebra TechDocs article or forum topic.';
  } finally{sync();}
})();
