import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

class Element {
  constructor(){this.listeners={};this.children=[];this.checked=false;this.value='';}
  addEventListener(name,fn){this.listeners[name]=fn;}
  replaceChildren(...nodes){this.children=nodes;}
  async emit(name){await this.listeners[name]?.();}
  click(){this.clicked=true;}
  remove(){}
  append(){}
}
let pageSerial=0;
const makePage=async (href,{delay}={})=>{
 const html=await readFile(new URL('../popup.html',import.meta.url),'utf8');
 const nodes=Object.fromEntries([...html.matchAll(/ id="([^"]+)"/g)].map(m=>[m[1],new Element()]));
 let expectedURL=href, calls=0;
 globalThis.document={getElementById:id=>nodes[id],createElement:()=>new Element(),body:new Element()};
 globalThis.chrome={
   tabs:{query:async()=>[{id:7,url:expectedURL}]},
   scripting:{executeScript:async request=>{
     calls++; const [source,,{sectionAnchor}]=request.args;
     assert.equal(request.world,'ISOLATED');
     assert.deepEqual(request.target,{tabId:7,frameIds:[0]});
     if(delay)await delay;
     if(!sectionAnchor)return [{frameId:0,result:{capture:{schema_version:'zebra-doc-capture/v1',source_url:source.url,
       source_kind:'techdocs',captured_at:'2026-11-20T00:00:00.000Z',title:'Public documentation',
       blocks:[{kind:'paragraph',text:'Public test content.'}],truncated:false},discovered_links:[]}}];
     return [{frameId:0,result:{capture:{
       schema_version:'zebra-doc-capture/v1',source_url:source.url,source_kind:'techdocs',
       captured_at:'2026-11-20T00:00:00Z',title:'Public documentation',
       blocks:[{kind:'heading',text:'Selected title',anchor:sectionAnchor,level:2},{kind:'paragraph',text:'Public test content.'}],
       truncated:true},section_scope:{schema_version:'zebra-section-scope/v1',heading_anchor:sectionAnchor,boundary:'next_heading',whole_article:false}}}];
   }}
 };
 await import('../popup.js?'+(++pageSerial));
 await new Promise(resolve=>setImmediate(resolve));
 return {nodes,get calls(){return calls;},switchPage(url){expectedURL=url;}};
};
test('scoped popup keeps partial evidence separate from full-page mirrors and refuses tab drift',async()=>{
 const href='https://techdocs.zebra.com/stagenow/3-1/csp/ui/';
 const page=await makePage(href); const n=page.nodes;
 const section=n['capture-section'], input=n['section-anchor'], save=n['save-section'];
 assert.equal(n['section-controls'].hidden,false);
 input.value='set-default-input-method';await input.emit('input');
 assert.equal(section.disabled,true);
 await section.emit('click');assert.equal(page.calls,0);
 n.public.checked=true;await n.public.emit('change');
 assert.equal(section.disabled,false);
 await section.emit('click');assert.equal(page.calls,1);
 assert.equal(n.captureTitle.textContent,'Partial capture: #set-default-input-method');
 assert.equal(save.disabled,true);
 n.reviewed.checked=true;await n.reviewed.emit('change');
 assert.equal(save.disabled,false);
 assert.ok(['save','mirror','collection-entry'].every(key=>n[key].disabled));
 input.value='set-default-input-method-1';await input.emit('input');
 assert.equal(save.disabled,true);
 assert.equal(n.preview.hidden,true);
 page.switchPage(href.replace('3-1','3-2'));
 await section.emit('click');
 assert.equal(page.calls,1);
 assert.match(n.status.textContent,/No section saved/);
});
test('forum page hides the section control',async()=>{
 const page=await makePage('https://developer.zebra.com/content/public-example');
 assert.equal(page.nodes['section-controls'].hidden,true);
 assert.equal(page.nodes['capture-section'].disabled,true);
});

for(const key of ['capture','capture-section']){
 test('discard while '+key+' is pending prevents result or status resurrection',async()=>{
  let release;
  const delay=new Promise(resolve=>{release=resolve;});
  const page=await makePage('https://techdocs.zebra.com/stagenow/3-1/csp/ui/',{delay});
  const n=page.nodes;
  n.public.checked=true;await n.public.emit('change');
  n['section-anchor'].value='set-default-input-method';await n['section-anchor'].emit('input');
  const pending=n[key].emit('click');
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(page.calls,1);
  await n.clear.emit('click');
  assert.equal(n.status.textContent,'Capture discarded.');
  assert.equal(n[key].disabled,true);
  release();await pending;
  assert.equal(n.status.textContent,'Capture discarded.');
  assert.equal(n.preview.hidden,true);
  assert.equal(n.captureTitle.textContent,'');
  assert.equal(n.reviewed.disabled,true);
  assert.ok(['save','save-section','mirror','collection-entry'].every(id=>n[id].disabled));
  assert.equal(n[key].disabled,false);
  await n[key].emit('click');
  assert.equal(page.calls,2);
  assert.equal(n.preview.hidden,false);
 });
}
