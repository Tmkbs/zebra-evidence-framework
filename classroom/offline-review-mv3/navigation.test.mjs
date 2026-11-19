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

test('index explains archive coverage using manifest facts without turning missing URLs into links',()=>{
 const missing=origin+'/oeminfo/1-0/guide/missing/';
 const orphan=origin+'/oeminfo/1-0/guide/orphan/';
 const a=row(root,'Root <b>', [['overview','Overview']], [child+'#setup',child+'#absent',missing]);
 a.capture.truncated=true;
 a.link_discovery='retained_link_limit';
 const result=build([a,second,row(orphan,'Not reachable',[[null,'Unreachable heading']])]);
 const index=result.files.get('index.html');
 assert.match(index,/2 page\(s\) rendered · 1 target\(s\) not supplied · 1 supplied snapshot\(s\) not reachable/);
 assert.match(index,/href="pages\/001.html">Root &lt;b&gt;/);
 assert.match(index,/Capture truncated/);
 assert.match(index,/retaining 20 links/);
 assert.match(index,/Section anchor not captured: 1/);
 assert.match(index,/Target not supplied: 1/);
 assert.match(index,/No link discovery status supplied/);
 assert.match(index,/Machine-readable coverage manifest/);
 assert.match(index,/not a diagnosis, revision, or model result/);
 assert.ok(index.includes('<code>'+missing+'</code>'));
 assert.doesNotMatch(index,/(?:href|src)="https?:/);
 assert.equal(result.manifest.pages[0].omitted_links.missing_fragment,1);
 assert.equal(result.manifest.missing[0].source_url,missing);
 assert.doesNotMatch(index,/Not reachable/);
});
test('empty archive reports the missing root rather than implying successful coverage',()=>{
 const result=build([]);
 const index=result.files.get('index.html');
 assert.match(index,/0 page\(s\) rendered/);
 assert.match(index,/No rendered snapshots/);
 assert.ok(index.includes('<code>'+root+'</code>'));
 assert.doesNotMatch(index,/href="pages\//);
});

test('archive readiness separates explicit roots, bounded links, text and excluded assets',()=>{
 const a=row(root,'Synthetic root', [['overview','Overview']], [child+'#setup']);
 a.capture.truncated=true;
 a.link_discovery='candidate_scan_limit';
 const view=build([a,second]);
 const q=view.manifest.coverage_readiness;
 assert.equal(q.status,'KNOWN_PARTIAL_CAPTURE');
 assert.deepEqual(q.requested_root_routes,{count:1,rendered:1,not_rendered:[]});
 assert.equal(q.linked_routes_rendered,1);
 assert.equal(q.text.truncated_pages,1);
 assert.equal(q.link_discovery.unknown_or_limited_pages,2);
 assert.equal(q.assets.status,'NOT_CAPTURED');
 assert.equal(q.independent_source_fidelity_verified,false);
 assert.equal(q.full_site_coverage_verified,false);
 assert.match(view.files.get('index.html'),/Known partial capture/);
 assert.match(view.files.get('index.html'),/1 of 1 requested root routes rendered; 1 linked route/);
 assert.match(view.files.get('index.html'),/Source images, stylesheets, attachments, and scripts were not captured/);
 const clean=build([row(root,'Synthetic root',[[null,'No omissions']])]).manifest.coverage_readiness;
 assert.equal(clean.status,'STRUCTURED_SNAPSHOT_ONLY');
 assert.equal(clean.full_site_coverage_verified,false);
 assert.equal(clean.link_discovery.unknown_or_limited_pages,1);
 assert.deepEqual(build([]).manifest.coverage_readiness.requested_root_routes,{count:1,rendered:0,not_rendered:[root]});
});
