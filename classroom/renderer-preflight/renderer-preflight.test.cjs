'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fixture=require('./synthetic-fixture.cjs');
const {createRendererPreflight}=require('./renderer-preflight.cjs');
const flags=['write_performed','apply_allowed','merge_allowed','model_invoked'];
test('portable guard omits renderer attestations, source content and reusable output',()=>{
 const request=fixture(), t=request.trustedBaseline;
 const guard=createRendererPreflight({applyReturn:()=>({html:'secret result',receipt:{
  schema:'practicum-framework-return/v1',original_modified:false,publication:'NOT_AUTHORIZED',
  case_id:t.case_id,source_sha256:t.source_sha256,source_paragraph_id:t.source_paragraph_id,
  framework_commit:t.framework_commit,practicum_commit:t.practicum_commit,model_execution:'NOT_RUN',
  review_attestation:'do not propagate'}})});
 const result=guard(request);
 assert.equal(result.result,'LOCAL_COPY_RENDERER_ACCEPTS_PINNED_BINDINGS');
 assert.equal(result.source_version,t.source_version);
 for(const key of flags)assert.equal(result[key],false);
 for(const key of ['html','receipt','renderer_review_attestation'])assert.equal(result[key],undefined);
 request.handoff.schema='zebra-doc-capture-intake/v1';
 assert.equal(guard(request).result,'CAPTURE_PRE_REVIEW_NOT_A_REVISION');
});
test('unbound renderer receipt does not pass',()=>{
 const guard=createRendererPreflight({applyReturn:()=>({receipt:{schema:'practicum-framework-return/v1'}})});
 assert.equal(guard(fixture()).result,'RENDERER_RECEIPT_CONTRACT_MISMATCH');
});
const adapterPath=process.env.ZEBRA_LOCAL_RENDERER_ADAPTER;
test('app adapter conformance on synthetic in-memory fixture',{skip:!adapterPath},()=>{
 const guard=createRendererPreflight(require(adapterPath));
 const request=fixture();
 assert.equal(guard(request).result,'LOCAL_COPY_RENDERER_ACCEPTS_PINNED_BINDINGS');
 assert.equal(guard({...request,originalHtml:request.originalHtml+'changed'}).result,'LOCAL_COPY_RENDERER_REJECTS_BINDINGS');
 request.handoff.proposed_revision.local_retest_approved=false;
 assert.equal(guard(request).result,'LOCAL_COPY_RENDERER_REJECTS_BINDINGS');
});

test('wrong edition is rejected before invoking the renderer even when text happens to match',()=>{
 let called=0;
 const guard=createRendererPreflight({applyReturn:()=>{called++;return {};}});
 const request=fixture();
 request.handoff.proposed_revision.source_version='different-fixture-edition';
 assert.equal(guard(request).result,'BASELINE_EDITION_MISMATCH');
 assert.equal(called,0);
 assert.equal(Object.hasOwn(guard(request),'source_version'),false);
});
test('app adapter conformance rejects evidence mutation on the correct source edition',{skip:!adapterPath},()=>{
 const guard=createRendererPreflight(require(adapterPath));
 const request=fixture();
 assert.equal(guard(request).source_version,request.trustedBaseline.source_version);
 const wrongEvidence=structuredClone(request);
 wrongEvidence.handoff.evidence=wrongEvidence.handoff.evidence.map(e=>({...e,scope_limit:'Synthetic changed scope'}));
 assert.equal(guard(wrongEvidence).result,'LOCAL_COPY_RENDERER_REJECTS_BINDINGS');
});
test('does not return objects, getters, or unsupported commit labels from a stub',()=>{
 const valid=fixture(), t=valid.trustedBaseline;
 const envelope={schema:'practicum-framework-return/v1',case_id:t.case_id,source_sha256:t.source_sha256,
  source_paragraph_id:t.source_paragraph_id,framework_commit:t.framework_commit,practicum_commit:t.practicum_commit,
  original_modified:false,publication:'NOT_AUTHORIZED',model_execution:'NOT_RUN'};
 let getterCalls=0;
 const guard=createRendererPreflight({applyReturn:()=>({receipt:{...envelope,get source_sha256(){getterCalls++;return {private:'never leak'};}}})});
 assert.equal(guard(valid).result,'RENDERER_RECEIPT_CONTRACT_MISMATCH');
 assert.equal(getterCalls,0);
 const invalid=fixture();invalid.trustedBaseline.framework_commit+='-local';
 assert.equal(guard(invalid).result,'INVALID_BASELINE_REFERENCE');
 invalid.trustedBaseline.framework_commit={token:'never leak'};
 assert.doesNotMatch(JSON.stringify(guard(invalid)),/never leak/);
});
