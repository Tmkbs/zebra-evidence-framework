import {captureActive,readActiveTab} from './capture.js';

const el=id=>document.getElementById(id);
const permit=el('public'), capture=el('capture'), save=el('save'), status=el('status');
let selected=null, packet=null;
const reset=()=>{packet=null;save.disabled=true;el('preview').hidden=true;el('blocks').replaceChildren();};
async function init() {
  try{
    selected=await readActiveTab(chrome);
    el('target').textContent=selected.source.url;
    permit.disabled=false;
  }catch(e){
    selected=null;
    el('target').textContent='Unsupported active tab.';
    status.textContent=e.message;
  }
}
permit.addEventListener('change',()=>{
  capture.disabled=!permit.checked;
  if(!permit.checked)reset();
});
capture.addEventListener('click',async()=>{
  if(!selected||!permit.checked||capture.disabled)return;
  reset();capture.disabled=true;permit.disabled=true;
  status.textContent='Reading the authorized public article…';
  try{
    const result=await captureActive(chrome,selected);
    if(result.source_url!==selected.source.url)throw new Error('The active page changed. Reopen the extension.');
    packet=result;
    const items=packet.blocks.map(b=>{
      const item=document.createElement('li');
      const label=document.createElement('strong');
      label.textContent=b.kind.replaceAll('_',' ')+': ';
      item.append(label,document.createTextNode(b.text));
      return item;
    });
    el('blocks').replaceChildren(...items);
    el('preview').hidden=false;el('preview').open=true;save.disabled=false;
    status.textContent=packet.truncated
      ? 'Only part of the article was captured (size limit). Inspect before saving.'
      : `Captured ${items.length} text blocks. Inspect before saving.`;
  }catch(e){
    status.textContent='Capture stopped. Use a supported public article in the same tab and try again.';
    reset();
  }finally{permit.disabled=false;capture.disabled=!permit.checked;}
});
save.addEventListener('click',()=>{
  if(!packet||!permit.checked)return;
  const blob=new Blob([JSON.stringify(packet,null,2)+'\n'],{type:'application/json;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const download=document.createElement('a');
  download.href=url;download.download='zebra-doc-capture-'+packet.source_kind+'-'+packet.captured_at.slice(0,10)+'.json';
  document.body.append(download);
  download.click();download.remove();
  setTimeout(()=>URL.revokeObjectURL(url),2000);
  status.textContent='Requested a local download. Check the browser’s downloads to confirm.';
});
init();
