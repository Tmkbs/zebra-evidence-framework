import test from 'node:test';
import assert from 'node:assert/strict';
import {intake} from '../../../capture-intake.cjs';
import {assembleSelectedArchive,normalizeScopedArchiveInput} from '../reviewed-archive-portable.mjs';
import {sha256} from '../archive-bytes.mjs';
import {verifyLocalZip} from '../verified-zip.js';

const utf=new TextEncoder(), json=obj=>utf.encode(JSON.stringify(obj));
const scope={schema_version:'zebra-section-scope/v1',heading_anchor:'readerparams',boundary:'next_heading',whole_article:false};
const common={schema_version:'zebra-doc-capture/v1',captured_at:'2026-11-19T00:00:00.000Z',title:'Synthetic packet'};
const block={kind:'paragraph',text:'Synthetic original settings paragraph.'};
const forum={...common,source_url:'https://developer.zebra.com/forum/25083',source_kind:'forum',blocks:[{kind:'paragraph',text:'Synthetic question not from this URL.'}],truncated:false};
const doc={...common,source_url:'https://techdocs.zebra.com/datawedge/6-6/guide/input/barcode/',source_kind:'techdocs',
 blocks:[{kind:'heading',text:'Reader Parameters',level:2,anchor:'readerparams'},block],truncated:true};
export async function scenario(sourceUrl=doc.source_url,version="6-6"){
 const docEnvelope={capture:{...doc,source_url:sourceUrl},section_scope:scope};
 const proof=intake({forum,techdocs:docEnvelope,caseId:'SYNTHETIC-CONTRACT'});
 const [q,d]=proof.capture_binding.captures;
 const baseline=utf.encode('<p>Synthetic original settings paragraph.</p>'), workingCopy=utf.encode('<p>Test proposal.</p><p>Synthetic original settings paragraph.</p>');
 const identity={case_id:proof.case.id,run_id:proof.run_id,source_url:d.url,source_anchor:'readerparams',target_anchor:'proposal',
 source_version:version,source_sha256:await sha256(baseline),paragraph_sha256:'1'.repeat(64),
 operation_sha256:'2'.repeat(64),working_copy_sha256:await sha256(workingCopy),capture_sha256:d.sha256};
 const grant=json({schema:'zebra-local-archive-overlay-grant/v3',scope:'LOCAL_INERT_ARCHIVE_ONLY',...identity,archive_text:'Test proposal.',
 locator:{section_anchor:'readerparams',block_kind:'paragraph',section_block_index:0,block_sha256:await sha256(block.text)}});
 const trustPin=await sha256(grant);
 const pair={schema:'zebra-local-case-source-pair/v2',scope:'LOCAL_INERT_ARCHIVE_ONLY',case_id:identity.case_id,run_id:identity.run_id,grant_sha256:trustPin,
 forum_url:q.url,forum_capture_sha256:q.sha256,techdocs_url:d.url,techdocs_capture_sha256:d.sha256,
 section_envelope_sha256:d.section_envelope_sha256,heading_anchor:scope.heading_anchor};
 const pairBytes=json(pair);
 const receipt=json({schema:'zebra-bound-typed-copy/v1',...identity,publication:'NOT_AUTHORIZED',model_execution:'NOT_RUN',original_modified:false,write_performed:false});
 return {args:{forum:json(forum),techdocs:json(docEnvelope),grant,trustPin,pairBytes,pairPin:await sha256(pairBytes),receipt,baseline,workingCopy},d,pair};
}
test('actual intake and ZIP accept unchanged popup-shaped synthetic files after distinct test pins',async()=>{
 const {args,d}=await scenario(), {buffer,report}=await assembleSelectedArchive(args);
 assert.equal(await sha256(buffer),report.archive_hash);
 assert.equal(report.binding.capture_sha256,d.sha256);
 assert.deepEqual(report.source_pair.scoped_capture.section_scope,scope);
 assert.equal(report.source_pair.scoped_capture.section_envelope_sha256,d.section_envelope_sha256);
 const r=utf.encode(JSON.stringify(report));
 const verified=await verifyLocalZip({receiptFile:new Blob([r]),zipFile:new Blob([buffer]),expectedReceiptSha256:await sha256(r)});
 assert.deepEqual(verified.scopedCapture,{headingAnchor:'readerparams',boundary:'next_heading',sectionEnvelopeSha256:d.section_envelope_sha256});
 assert.equal(verified.caseId,'SYNTHETIC-CONTRACT');
 assert.equal(report.publication,'NOT_AUTHORIZED');
});
test('scope changes, case drift, pin mismatch and legacy fallback fail closed',async()=>{
 const {args,pair}=await scenario();
 for(const patch of [
  {pairBytes:undefined,pairPin:undefined},{pairPin:'0'.repeat(64)},
  {techdocs:json({capture:doc,section_scope:{...scope,boundary:'article_end'}})},
  {techdocs:json({capture:doc,section_scope:{...scope,heading_anchor:'not-the-heading'}})},
  {forum:json({...forum,blocks:[{kind:'paragraph',text:'Unexpected other question'}]})},
 ] )await assert.rejects(assembleSelectedArchive({...args,...patch}));
 for(const patch of [{case_id:'OTHER-CASE'},{heading_anchor:'other'},{schema:'zebra-local-case-source-pair/v1'}]){
  const pairBytes=json({...pair,...patch});
  await assert.rejects(assembleSelectedArchive({...args,pairBytes,pairPin:await sha256(pairBytes)}));
 }
});

test('named archive rejects a contradictory subsequent real heading',async()=>{
 const {args}=await scenario();
 const drift={capture:{...doc,blocks:[...doc.blocks,{kind:'heading',text:'New section',anchor:'peer',level:2},block]},section_scope:scope};
 assert.throws(()=>normalizeScopedArchiveInput(forum,drift));
 const nested=structuredClone(drift);nested.capture.blocks[2].level=3;
 assert.equal(normalizeScopedArchiveInput(forum,nested).techdocs.blocks[2].level,3);
 await assert.rejects(assembleSelectedArchive({...args,techdocs:json(drift)}));
});
test('scope verifier rejects substituted anchors, malformed hierarchy receipt, run digest and dropped scope',async()=>{
 const {args}=await scenario(),{buffer,report}=await assembleSelectedArchive(args);
 const oldPin=await sha256(json(report));
 for(const change of [
  p=>{p.source_pair.scoped_capture.section_scope.boundary='article_end'},
  p=>{p.source_pair.scoped_capture.section_scope.heading_anchor='other'},
  p=>{p.source_pair.scoped_capture.section_envelope_sha256='f'.repeat(64)},
  p=>{p.binding.captured_paragraph_before_locator.block_kind='list_item'},
  p=>{p.source_pair.run_id=p.binding.run_id='CAPTURE-'+'f'.repeat(24)},
  p=>{delete p.source_pair.scoped_capture},
 ]){
  const modified=structuredClone(report);change(modified);const bytes=json(modified);
  await assert.rejects(verifyLocalZip({receiptFile:new Blob([bytes]),zipFile:new Blob([buffer]),expectedReceiptSha256:oldPin}));
  if(modified.source_pair.scoped_capture?.section_scope.boundary!=='article_end')
   await assert.rejects(verifyLocalZip({receiptFile:new Blob([bytes]),zipFile:new Blob([buffer]),expectedReceiptSha256:await sha256(bytes)}));
 }
});

test('exact Zebra nested RFID path retains version and reaches local archive without widening catch-all prefixes',async()=>{
 const rfid='https://techdocs.zebra.com/dcs/rfid/android/2-0-5-292/tutorials/usbsupport/';
 const {args}=await scenario(rfid,'2-0-5-292');
 const d={capture:{...doc,source_url:rfid},section_scope:scope};
 assert.equal(intake({forum,techdocs:d,caseId:'SYNTHETIC-CONTRACT'}).document_snapshot.source_version_from_url,'2-0-5-292');
 const {report,buffer}=await assembleSelectedArchive(args);
 const r=json(report);
 await verifyLocalZip({receiptFile:new Blob([r]),zipFile:new Blob([buffer]),expectedReceiptSha256:await sha256(r)});
 assert.equal(report.binding.source_version,'2-0-5-292');
 assert.equal(report.binding.source_url,rfid);
 for (const path of ['dcs/rfid/maui-android/2-0-5-292/', 'dcs/other/android/2-0-5-292/', 'dcs/rfid/android/latest/']) {
  const source='https://techdocs.zebra.com/'+path+'guide/sample/';
  assert.throws(()=>normalizeScopedArchiveInput(forum,{capture:{...doc,source_url:source},section_scope:scope}));
  assert.throws(()=>intake({forum,techdocs:{capture:{...doc,source_url:source},section_scope:scope},caseId:'SYNTHETIC-CONTRACT'}));
 }
});
