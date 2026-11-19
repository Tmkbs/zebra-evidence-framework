import test from 'node:test';
import assert from 'node:assert/strict';
import {buildMirror} from './extension/engine.js';
import {mirrorZip} from './extension/zip.js';

const origin='https://techdocs.zebra.com';
const root=origin+'/oeminfo/1-0/guide/a/', child=origin+'/oeminfo/1-0/guide/b/';
function row(url,title,anchors,links=[]){
 return {capture:{schema_version:'zebra-doc-capture/v1',source_url:url,source_kind:'techdocs',captured_at:'2026-11-19T12:00:00.000Z',
  title,truncated:false,blocks:anchors.map(([anchor,text])=>({kind:'heading',level:2,...(anchor?{anchor}:{}),text}))},
  discovered_links:links.map(target_url=>({target_url,label:'Related section'}))};
}
const build=pages=>buildMirror({schema_version:'zebra-mirror-input/v1',allowed_origins:[origin],roots:[root],pages});
const first=row(root,'Root', [['overview','Literal <b> overview'],[null,'Unanchored']], [child+'#setup',child+'#unknown']);
const second=row(child,'Child <img>', [['setup','Setup']]);
test('offline navigation uses stable relative files and only actual source section anchors', async()=>{
 const a=build([first,second]), b=build([second,first]);
 assert.deepEqual([...a.files],[...b.files]);
 const firstPage=a.files.get('pages/001.html'),secondPage=a.files.get('pages/002.html');
 assert.match(firstPage,/rel="next" href="002.html">Next snapshot:<span> Child &lt;img&gt;/);
 assert.match(secondPage,/rel="prev" href="001.html">Previous snapshot:/);
 assert.doesNotMatch(firstPage,/rel="prev"/);
 assert.doesNotMatch(secondPage,/rel="next"/);
 assert.match(firstPage,/Snapshot 1 of 2 · Archive order, not original site order/);
 assert.match(firstPage,/href="#overview">Literal &lt;b&gt; overview/);
 assert.match(firstPage,/id="overview"/);
 assert.doesNotMatch(firstPage,/#Unanchored/);
 assert.match(firstPage,/href="002.html#setup"/);
 assert.doesNotMatch(firstPage,/href="002.html#unknown"/);
 assert.equal(a.manifest.pages[0].omitted_links.missing_fragment,1);
 for(const markup of [firstPage,secondPage]){
   assert.match(markup,/href="\.\.\/index.html"/);
   assert.match(markup,/href="\.\.\/manifest.json"/);
   assert.doesNotMatch(markup,/(?:href|src)="(?:javascript:|https?:|\/\/)/i);
   assert.match(markup,/default-src 'none'/);
 }
 const one=Buffer.from(await mirrorZip(a.files).arrayBuffer());
 const two=Buffer.from(await mirrorZip(b.files).arrayBuffer());
 assert.deepEqual(one,two);
});
test('single-page archive links only to its package index and coverage when unanchored',()=>{
 const markup=build([row(root,'Root',[[null,'Just a heading']])]).files.get('pages/001.html');
 assert.doesNotMatch(markup,/rel="(?:next|prev)"|Captured sections/);
 assert.match(markup,/Snapshot 1 of 1/);
});
