import test from 'node:test';
import assert from 'node:assert/strict';
import {previewCollection} from './extension/collect.js';

const root='https://techdocs.zebra.com/oeminfo/latest/guide/a/';
const child='https://techdocs.zebra.com/oeminfo/latest/guide/b/';
const external='https://developer.zebra.com/content/barcode';
function packet(url, links=[]){
 return JSON.stringify({schema_version:'zebra-reviewed-mirror-page/v1',
  capture:{schema_version:'zebra-doc-capture/v1',source_url:url,source_kind:'techdocs',captured_at:'2026-11-19T12:00:00.000Z',
    title:'Public fixture',truncated:false,blocks:[{kind:'paragraph',text:'Versioned document fixture'}]},
  discovered_links:links.map(target_url=>({target_url,label:'Read the second page'}))});
}
test('export requires approval and isolates displayed review state',()=>{
 const session=previewCollection(root,[packet(child),packet(root,[child])]);
 assert.equal(session.preview().pages.length,2);
 assert.throws(()=>session.export(),/approve/);
 session.preview().pages.length=0;
 assert.equal(session.export({approved:true}).manifest.captured_pages,2);
 assert.match(session.export({approved:true}).files.get('pages/001.html'),/href="002.html"/);
});
test('rejects orphaned, duplicate, query-bearing and cross-origin data',()=>{
 assert.throws(()=>previewCollection(root,[packet(root),packet(child)]),/reachable/);
 assert.throws(()=>previewCollection(root,[packet(root),packet(root)]),/Duplicate/);
 assert.throws(()=>previewCollection(root,[packet(root,[external])]),/scope/);
 assert.throws(()=>previewCollection(root,[packet(root,[child+'?token=ignored'])]),/HTTPS/);
 assert.throws(()=>previewCollection(root,[packet(child)]),/root page/);
});
test('historical single-page capture packets and over-cap selections fail closed',()=>{
 assert.throws(()=>previewCollection(root,[JSON.stringify(JSON.parse(packet(root)).capture)]),/envelope/);
 assert.throws(()=>previewCollection(root,Array(13).fill(packet(root))),/number/);
});

test('round trips the optional label emitted for image-only or icon links',()=>{
 const entry=JSON.parse(packet(root,[child]));
 delete entry.discovered_links[0].label;
 const session=previewCollection(root,[JSON.stringify(entry),packet(child)]);
 assert.deepEqual(session.preview().pages[0].discovered_links,[{target_url:child}]);
 const html=session.export({approved:true}).files.get('pages/001.html');
 assert.match(html,/href="002.html">https:\/\/techdocs\.zebra\.com\//);
 assert.throws(()=>previewCollection(root,[JSON.stringify({...entry,discovered_links:[{target_url:child,label:null}]}),packet(child)]),/Invalid discovered/);
 assert.throws(()=>previewCollection(root,[JSON.stringify({...entry,discovered_links:[{target_url:child,extra:'unexpected'}]}),packet(child)]),/Invalid discovered/);
});
