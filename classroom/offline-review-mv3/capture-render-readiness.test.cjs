'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {intake}=require('../capture-intake.cjs');
const {projectCaptureReadiness}=require('./capture-render-readiness.cjs');
const capture=(source_kind,source_url,blocks)=>({schema_version:'zebra-doc-capture/v1',source_kind,source_url,
 captured_at:'2026-11-19T12:00:00.000Z',title:'Synthetic',blocks,truncated:false});
const section={kind:'heading',level:2,text:'Section text',anchor:'actual'};
const forum=capture('forum','https://developer.zebra.com/content/sample-forum-question',[{kind:'paragraph',text:'Synthetic question.'}]);
const doc=capture('techdocs','https://techdocs.zebra.com/datawedge/15-0/guide/api/softscantrigger/',[section]);
test('canonical capture produces useful readiness, not fake revision or model result',()=>{
 const record=intake({forum,techdocs:doc}),readiness=projectCaptureReadiness(record,{sectionAnchor:'actual'});
 assert.equal(readiness.run_id,record.run_id);
 assert.equal(readiness.source_version_from_url,'15-0');
 assert.equal(readiness.capture.capture_sha256,record.capture_binding.captures[1].sha256);
 assert.deepEqual(readiness.section,{anchor:'actual',captured_match_count:1,status:'CAPTURE_MATCH_ONLY'});
 assert.equal(readiness.revision_ready,false);assert.equal(readiness.apply_allowed,false);
 assert.equal(readiness.model_execution,'NOT_RUN');assert.equal(readiness.proposed_revision,undefined);
});
test('missing and duplicate candidate anchors do not masquerade as a trusted paragraph',()=>{
 const record=intake({forum,techdocs:{...doc,blocks:[section,section]}});
 for(const [anchor,want] of [['actual','AMBIGUOUS_CAPTURE'],['absent','NOT_IN_CAPTURE'],[null,'NOT_SELECTED']]){
  assert.equal(projectCaptureReadiness(record,{sectionAnchor:anchor}).section.status,want);
 }
 assert.throws(()=>projectCaptureReadiness(record,{sectionAnchor:'<unsafe>'}));
});
test('rejects altered and revision-ready envelopes',()=>{
 const record=intake({forum,techdocs:doc});
 assert.throws(()=>projectCaptureReadiness({...record,run_id:'fabricated'}));
 assert.throws(()=>projectCaptureReadiness({...record,schema:'research-documentation-handoff/v0.4'}));
});
