'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {verifyMirrorManifest}=require('./verify-mirror-manifest.cjs');
const source_url='https://techdocs.zebra.com/datawedge/15-0/guide/input/barcode/';
const capture={source_kind:'techdocs',source_url,captured_at:'2026-11-19T12:00:00.000Z',blocks:[{}],truncated:false};
const fixture=()=>({schema_version:'zebra-offline-site/v1',allowed_origins:[new URL(source_url).origin],roots:[source_url],captured_pages:1,pages:[{
 source_url,source_kind:'techdocs',captured_at:capture.captured_at,blocks:1,capture_truncated:false,path:'pages/001.html'}]});
test('correlates bounded metadata without claiming content authentication',()=>{
 const out=verifyMirrorManifest(fixture(),capture);
 assert.equal(out.mirror_content_authenticated,false);
 assert.equal(out.status,'METADATA_MATCH_ONLY');
 assert.match(out.manifest_record_sha256,/^[a-f0-9]{64}$/);
});
test('rejects changed source fields and unsafe or duplicate paths',()=>{
 for(const delta of [{path:'../secret'},{blocks:2},{capture_truncated:true},{source_kind:'forum'},{captured_at:'older'},{source_url:source_url.slice(0,-1)}])
  assert.throws(()=>{const m=fixture();Object.assign(m.pages[0],delta);verifyMirrorManifest(m,capture);});
 const m=fixture();m.captured_pages=2;m.pages.push({...m.pages[0],source_url:source_url+'other/'});
 assert.throws(()=>verifyMirrorManifest(m,capture));
});
