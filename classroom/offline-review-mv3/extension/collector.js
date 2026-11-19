import {COLLECTION_LIMITS,previewCollection} from './collect.js';
import {mirrorZip} from './zip.js';
import {describeLinkDiscovery} from './engine.js';

export async function loadCollection(root,files){
  const list=Array.from(files);
  if(!list.length||list.length>COLLECTION_LIMITS.pages)throw new Error('Select 1–12 local collection JSON files.');
  let size=0;
  for(const file of list) if(!Number.isSafeInteger(file.size)||file.size<1||file.size>COLLECTION_LIMITS.entryBytes||
      (size+=file.size)>COLLECTION_LIMITS.inputBytes)throw new Error('Selected files exceed the collection size limit.');
  const texts=[];
  for(const file of list)texts.push(await file.text());
  return previewCollection(root,texts);
}

export function bindCollector(doc,{filesToCollection=loadCollection,makeZip=mirrorZip,download=downloadLocal}={}){
  const el=id=>doc.getElementById(id);
  const root=el('root'),files=el('files'),review=el('review'),coverage=el('coverage'),pages=el('pages'),approved=el('approved'), save=el('export'),status=el('status');
  let staged=null, epoch=0;
  function node(tag,value){
    const n=doc.createElement(tag);
    if(value!==undefined)n.textContent=value;
    return n;
  }
  function invalidate(message=''){
    ++epoch; staged=null; approved.checked=false; save.disabled=true;
    review.hidden=true; pages.replaceChildren(); coverage.replaceChildren(); status.textContent=message;
  }
  function show(session){
    const manifest=session.coverage(), data=session.preview();
    coverage.replaceChildren(node('p',manifest.captured_pages+' page(s). '+manifest.completeness));
    for(const row of manifest.pages){
      const counts=Object.entries(row.omitted_links).filter(([,n])=>n).map(([kind,n])=>kind.replaceAll('_',' ')+': '+n);
      coverage.append(node('p',row.source_url+' — '+(row.capture_truncated?'capture truncated; ':'')+(counts.join(', ')||'no recorded omissions among supplied links')+' — '+describeLinkDiscovery(row.link_discovery)));
    }
    if(manifest.missing.length){
      const list=node('ul');
      for(const missing of manifest.missing) list.append(node('li',missing.source_url));
      coverage.append(node('p','Missing linked pages:'),list);
    }
    for(const row of data.pages){
      const p=row.capture, details=node('details');details.open=true;
      details.append(node('summary',p.title),node('p',p.source_url+' — captured '+p.captured_at));
      for(const b of p.blocks)details.append(node('p',b.kind+(b.anchor?' — #'+b.anchor:'')),node('pre',b.text));
      if(row.discovered_links.length){
        const links=node('ul');
        for(const link of row.discovered_links)links.append(node('li',(link.label===undefined?'No captured link label':link.label)+' — '+link.target_url));
        details.append(node('p','Discovered links (not fetched):'),links);
      }
      pages.append(details);
    }
    review.hidden=false;
  }
  root.addEventListener('input',()=>invalidate());
  files.addEventListener('change',()=>invalidate());
  el('clear').addEventListener('click',()=>{root.value='';files.value='';invalidate('Selection discarded.');});
  el('selection').addEventListener('submit',async event=>{
    event.preventDefault();invalidate('Validating selected local files…'); const pending=epoch;
    try{
      const result=await filesToCollection(root.value,files.files);
      if(pending!==epoch)return;
      show(result);staged=result;status.textContent='Review the collection and coverage before saving.';
    }catch{
      if(pending===epoch)invalidate('Could not load the selection. Check file size, format, official root URL, and same-origin links.');
    }
  });
  approved.addEventListener('change',()=>{save.disabled=!staged||!approved.checked;});
  save.addEventListener('click',()=>{
    if(save.disabled||!staged||!approved.checked)return;
    try {
      download(doc,makeZip(staged.export({approved:true}).files));
      invalidate('Download requested. Check browser downloads.');
      files.value='';root.value='';
    } catch {invalidate('Could not build or request the ZIP. Reload your selection and try again.');}
  });
}

function downloadLocal(doc,blob){
  const url=URL.createObjectURL(blob),link=doc.createElement('a');
  link.href=url;link.download='zebra-public-offline-collection.zip';doc.body.append(link);
  try{link.click();}finally{link.remove();setTimeout(()=>URL.revokeObjectURL(url),2000);}
}
if(typeof document!=='undefined')bindCollector(document);
