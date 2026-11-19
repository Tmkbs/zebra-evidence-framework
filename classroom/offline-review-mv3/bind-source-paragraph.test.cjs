'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),{createHash}=require('node:crypto');
const {validateCapture}=require('../capture-intake.cjs');
const {bindSourceParagraph}=require('./bind-source-paragraph.cjs');
const sha=s=>createHash('sha256').update(s).digest('hex');
const url='https://techdocs.zebra.com/datawedge/7-3/guide/api/scannerinputplugin/';
const cap={schema_version:'zebra-doc-capture/v1',source_kind:'techdocs',source_url:url,
 captured_at:'2026-11-19T00:00:00.000Z',title:'Synthetic target fixture',truncated:true,blocks:[
  {kind:'heading',level:3,anchor:'parameters',text:'Parameters'},{kind:'list_item',text:'Intro'},
  {kind:'paragraph',text:'Important: A   scoped detail.'},{kind:'heading',level:3,anchor:'other',text:'Other'},
  {kind:'paragraph',text:'Important: A scoped detail.'}]};
const sourceProof={schema:'zebra-source-paragraph-before-locator/v1',status:'STRUCTURAL_SOURCE_MATCH_ONLY',
 source_sha256:'a'.repeat(64),source_paragraph_dom_sha256:'b'.repeat(64),native_source_anchor:null,
 captured_locator_bound:false,operation_authorized:false,write_performed:false,publication:'NOT_AUTHORIZED',
 locator:{section_anchor:'parameters',block_kind:'paragraph',section_block_index:1,block_sha256:sha('Important: A scoped detail.')}};
const args={capture:cap,sourceProof,expectedCaptureSha256:sha(JSON.stringify(validateCapture(cap))),
 expectedSourceUrl:url,expectedSourceSha256:sourceProof.source_sha256,expectedSourceProofSha256:sha(JSON.stringify(sourceProof))};
test('matches unanchored paragraph only in exact pinned section and keeps scope/status explicit',()=>{
 const v=bindSourceParagraph(args);
 assert.equal(v.block_index_zero_based,2);
 assert.equal(v.native_capture_anchor,null);
 assert.equal(v.capture_truncated,true);
 assert.equal(v.operation_authorized,false);
});
test('rejects pin drift, same-text ambiguity and a different section position',()=>{
 assert.throws(()=>bindSourceParagraph({...args,expectedCaptureSha256:'0'.repeat(64)}));
 assert.throws(()=>bindSourceParagraph({...args,expectedSourceSha256:'0'.repeat(64)}));
 assert.throws(()=>bindSourceParagraph({...args,sourceProof:{...sourceProof,locator:{...sourceProof.locator,section_block_index:2}}}));
 const duplicate={...cap,blocks:[...cap.blocks.slice(0,3),cap.blocks[2],...cap.blocks.slice(3)]};
 assert.throws(()=>bindSourceParagraph({...args,capture:duplicate,expectedCaptureSha256:sha(JSON.stringify(validateCapture(duplicate)))}));
});

test('rejects extra outer and locator fields even when the supplied proof hash matches',()=>{
 for(const altered of [
  {...sourceProof,approved:true},
  {...sourceProof,guessed_source:'synthetic unsupported guess'},
  {...sourceProof,locator:{...sourceProof.locator,approved:true}},
 ]){
  assert.throws(()=>bindSourceParagraph({...args,sourceProof:altered,
   expectedSourceProofSha256:sha(JSON.stringify(altered))}),/cannot be bound/);
 }
});
