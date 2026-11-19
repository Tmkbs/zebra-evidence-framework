import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
class Element {
  handlers={};children=[];checked=false;disabled=false;hidden=false;
  addEventListener(type,callback){this.handlers[type]=callback;}
  replaceChildren(...children){this.children=children;}
}
const html=await readFile(new URL('./extension/popup.html',import.meta.url),'utf8');
const els=Object.fromEntries([...html.matchAll(/id="([^"]+)"/g)].map(([,id])=>[id,new Element()]));
globalThis.document={getElementById:id=>els[id],createElement:()=>new Element()};
const url='https://techdocs.zebra.com/datawedge/15-0/guide/api/softscantrigger/';
globalThis.chrome={tabs:{query:async()=>[{id:42,url}]},scripting:{executeScript:async()=>[{frameId:0,result:{
  capture:{schema_version:'zebra-doc-capture/v1',source_url:url,source_kind:'techdocs',
    captured_at:'2026-11-19T12:00:00.000Z',title:'<title>Review exact title</title>',truncated:false,
    blocks:[{kind:'paragraph',text:'line one\nline two'}]},
  discovered_links:[{target_url:url+'#anchor',label:'<b>Review exact label</b>'}]
}}]}};
await import('./extension/popup.js');
await new Promise(resolve=>setImmediate(resolve));
els.public.checked=true;
els.public.handlers.change();
await els.capture.handlers.click();
assert.equal(els.captureTitle.textContent,'Captured title: <title>Review exact title</title>');
assert.equal(els.links.children[0].textContent,'<b>Review exact label</b> | '+url+'#anchor');
assert.equal(els.blocks.children[0].textContent,'paragraph: line one\nline two');
assert.equal(els.mirror.disabled,true);
els.reviewed.checked=true;
els.reviewed.handlers.change();
assert.equal(els.mirror.disabled,false);
els.clear.handlers.click();
assert.equal(els.captureTitle.textContent,'');
assert.equal(els.links.children.length,0);
assert.equal(els.mirror.disabled,true);
console.log('Approval pane exposes exact captured title, text and supplied link labels; clear resets approval.');
