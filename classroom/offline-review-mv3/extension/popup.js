import {readActiveTab,captureSectionActive} from './capture.js';
import {createCaptureMirrorSession} from './session.js';
import {mirrorZip} from './zip.js';
import {describeLinkDiscovery} from './engine.js';

const el=id=>document.getElementById(id);
const permit=el('public'), capture=el('capture'), save=el('save'), status=el('status'), review=el('reviewed'), zip=el('mirror');
const entry=el('collection-entry');
const sectionPanel=el('section-controls'), sectionInput=el('section-anchor'), sectionCapture=el('capture-section'), sectionSave=el('save-section');
const anchorOK=()=>/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$/.test(sectionInput.value);
let selected=null, session=null, result=null, sectionResult=null, sectionCapable=false, busy=false, generation=0;
const sync=()=>{
  capture.disabled=busy||!selected||!permit.checked;
  permit.disabled=busy||!selected;
  review.disabled=busy||!(result||sectionResult)||!permit.checked;
  save.disabled=zip.disabled=entry.disabled=review.disabled||!review.checked||!result;
  sectionInput.disabled=busy||!permit.checked;
  sectionCapture.disabled=sectionInput.disabled||!sectionCapable||!anchorOK();
  sectionSave.disabled=review.disabled||!review.checked||!sectionResult;
};
const discard=()=>{
  ++generation;
  session?.clear();result=null;sectionResult=null;review.checked=false;
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
sectionInput.addEventListener('input',()=>{
  if(sectionResult){discard();status.textContent='Selection changed. Capture the new section before saving.';}
  sync();
});
el('clear').addEventListener('click',()=>{discard();status.textContent='Capture discarded.';});
capture.addEventListener('click',async()=>{
  if(capture.disabled)return;
  discard();const current=generation;busy=true;sync();status.textContent='Reading this approved page…';
  try {
    const captured=await session.capture({expected:selected,approved:permit.checked});
    if(current!==generation)return;
    result=captured;
    el('captureTitle').textContent='Captured title: '+result.packet.title;
    el('blocks').replaceChildren(...result.packet.blocks.map(b=>item(b.kind.replaceAll('_',' ')+': '+b.text)));
    el('links').replaceChildren(...result.links.map(link=>item((link.label ?? link.target_url)+' | '+link.target_url)));
    el('links').hidden=!result.links.length;
    el('linkCount').textContent=result.links.length+' same-origin link(s) found; linked pages are not fetched. '+describeLinkDiscovery(result.link_discovery);
    el('preview').hidden=false;el('preview').open=true;
    status.textContent=result.packet.truncated?'Capture was truncated. Inspect before export.':'Capture ready. Inspect before export.';
  } catch {
    if(current!==generation)return;
    discard();status.textContent='Capture stopped or discarded. Verify the public page and try again.';
  } finally{busy=false;sync();}
});
sectionCapture.addEventListener('click',async()=>{
  if(sectionCapture.disabled)return;
  const sectionAnchor=sectionInput.value;
  discard();const current=generation;busy=true;sync();status.textContent='Reading the approved section in this tab…';
  try{
    const captured=await captureSectionActive(chrome,{...selected,sectionAnchor},{approved:permit.checked,sectionAnchor});
    if(current!==generation)return;
    sectionResult=captured;
    el('captureTitle').textContent='Partial capture: #'+sectionResult.section_scope.heading_anchor;
    el('blocks').replaceChildren(...sectionResult.capture.blocks.map(b=>item(b.kind.replaceAll('_',' ')+': '+b.text)));
    el('linkCount').textContent='No links were collected. This is not the whole document.';
    el('preview').hidden=false;el('preview').open=true;
    status.textContent=sectionResult.section_scope.boundary==='capture_limit'
      ?'The section exceeded a capture limit. Inspect this partial excerpt before you save.'
      :'Section captured. Inspect the partial evidence before you save.';
  }catch{
    if(current!==generation)return;
    discard();status.textContent='No section saved. Check the exact heading ID and that the active tab has not changed.';
  }finally{busy=false;sync();}
});
sectionSave.addEventListener('click',()=>{
  if(sectionSave.disabled)return;
  download(new Blob([JSON.stringify(sectionResult,null,2)+'\n'],{type:'application/json;charset=utf-8'}),'zebra-partial-section-capture.json');
  status.textContent='Partial capture download requested. Check the browser downloads.';
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
    sectionCapable=selected.source.kind==='techdocs'&&/^https:\/\/techdocs\.zebra\.com\/[a-z][a-z0-9-]*\/\d{1,4}(?:-\d{1,4}){1,4}\//.test(selected.source.url);
    sectionPanel.hidden=!sectionCapable;
    session=createCaptureMirrorSession(chrome,{roots:[selected.source.url]});
    el('target').textContent=selected.source.url;
  }catch {
    selected=null;el('target').textContent='Unsupported active tab.';
    status.textContent='Open an official public Zebra TechDocs article or forum topic.';
  } finally{sync();}
})();
