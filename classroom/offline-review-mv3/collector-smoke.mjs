import assert from 'node:assert/strict';
import {loadCollection,bindCollector} from './extension/collector.js';
const origin='https://techdocs.zebra.com/oeminfo/1-0/guide/';
const root=origin+'a/', child=origin+'b/', missing=origin+'c/';
function asFile(url,targets,title='Page'){
 const s=JSON.stringify({schema_version:'zebra-reviewed-mirror-page/v1',capture:{schema_version:'zebra-doc-capture/v1',
  source_url:url,source_kind:'techdocs',captured_at:'2026-11-19T12:00:00.000Z',title,truncated:false,
  blocks:[{kind:'paragraph',text:'<script>literal text only</script>'}]},
  discovered_links:targets.map(target_url=>({target_url,label:'Review label'}))});
 return new Blob([s]);
}
let read=0;
await assert.rejects(loadCollection(root,[{size:1,text:async()=>{read++;}}, {size:360001}]),/size limit/);
assert.equal(read,0);
function element(){
 const handlers=new Map();
 return {children:[], textContent:'', value:'', disabled:false,hidden:true,
  set innerHTML(v){throw new Error('unsafe HTML');}, append(...items){this.children.push(...items);},
  replaceChildren(...items){this.children=items;},addEventListener(event,cb){handlers.set(event,cb);},
  async trigger(event){return handlers.get(event)?.({preventDefault(){}});}
 };
}
const elements=Object.fromEntries(['root','files','review','coverage','pages','approved','export','status','selection','clear'].map(x=>[x,element()]));
elements.root.value=root;
elements.files.files=[asFile(child,[]),asFile(root,[child,missing],'Review title')];
let deliver;
const doc={getElementById:id=>elements[id],createElement:element};
bindCollector(doc,{download:(_,blob)=>{deliver=blob;}});
await elements.selection.trigger('submit');
assert.equal(elements.export.disabled,true);
const view=JSON.stringify([elements.coverage,elements.pages]);
for(const literal of [missing,'Review title','Review label','<script>literal text only</script>'])assert.ok(view.includes(literal));
await elements.export.trigger('click');
assert.equal(deliver,undefined);
elements.approved.checked=true;
await elements.approved.trigger('change');
await elements.export.trigger('click');
assert.equal(deliver.type,'application/zip');
assert.equal(elements.pages.children.length,0);
assert.equal(elements.export.disabled,true);
assert.equal(elements.approved.checked,false);

let resolveLoad;
bindCollector(doc,{filesToCollection:()=>new Promise(resolve=>{resolveLoad=resolve;})});
const pending=elements.selection.trigger('submit');
await elements.clear.trigger('click');
resolveLoad(null);
await pending;
assert.equal(elements.review.hidden,true);
assert.match(elements.status.textContent,/discarded/);
console.log('Collector fixture: pre-read limits, exact review, omissions, gated ZIP, clear race passed.');
