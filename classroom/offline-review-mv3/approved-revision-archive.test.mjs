import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {buildMirror} from './extension/engine.js';
import {buildApprovedRevisionArchive,captureDigest,capturedListItemDigest,zipApprovedRevisionArchive} from './approved-revision-archive.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const url='https://techdocs.zebra.com/emdk-for-android/7-3/samples/barcode/';
const baselineBytes=Buffer.from('<main><p id="step-3">Synthetic original source.</p></main>');
const workingCopyBytes=Buffer.from('<main><p id="step-3">Synthetic original source.</p><p id="revision-proposal">Synthetic approved copy</p></main>');
const capture={schema_version:'zebra-doc-capture/v1',source_url:url,source_kind:'techdocs',
 captured_at:'2026-11-19T00:00:00.000Z',title:'Synthetic source',
 blocks:[{kind:'paragraph',anchor:'step-3',text:'Synthetic original source.'},{kind:'paragraph',text:'Next paragraph.'}],truncated:false};
const input={schema_version:'zebra-mirror-input/v1',roots:[url],allowed_origins:['https://techdocs.zebra.com'],pages:[{capture}]};
const receipt={schema:'zebra-bound-typed-copy/v1',case_id:'SYNTHETIC-1',run_id:'CAPTURE-'+'a'.repeat(24),source_url:url,
 source_anchor:'step-3',target_anchor:'revision-proposal',source_version:'7-3',source_sha256:sha(baselineBytes),
 paragraph_sha256:'b'.repeat(64),operation_sha256:'c'.repeat(64),working_copy_sha256:sha(workingCopyBytes),publication:'NOT_AUTHORIZED',
 capture_sha256:captureDigest(capture),original_modified:false,write_performed:false,model_execution:'NOT_RUN'};
const {schema,publication,original_modified,write_performed,model_execution,...pinned}=receipt;
const grant={schema:'zebra-local-archive-overlay-grant/v1',scope:'LOCAL_INERT_ARCHIVE_ONLY',...pinned,
 capture_sha256:captureDigest(capture),archive_text:'Synthetic approved text with <literal markup>.'};
const encode=x=>Buffer.from(JSON.stringify(x));
const grantBytes=encode(grant), trustedGrantSha256=sha(grantBytes);
const args={input,grantBytes,trustedGrantSha256,receipt,baselineBytes,workingCopyBytes};
test('opt-in reviewed typed paragraph has a deterministic local ZIP deep link',async()=>{
 const plain=buildMirror(input);
 const a=await zipApprovedRevisionArchive(args), b=await zipApprovedRevisionArchive(args), page=a.files.get('pages/001.html');
 assert.match(page,/<p id="step-3">Synthetic original source.<\/p><p id="revision-proposal"/);
 assert.match(page,/&lt;literal markup&gt;/);
 assert.doesNotMatch(page,/<literal markup>|Synthetic approved copy/);
 assert.match(a.files.get('index.html'),/href="pages\/001.html#revision-proposal"/);
 const overlay=a.manifest.local_revision_overlay;
 assert.equal(overlay.capture_sha256,grant.capture_sha256);
 assert.equal(overlay.rendered_working_copy_embedded,false);
 assert.equal(overlay.reviewer_authenticated,false);
 assert.equal(overlay.publication,'NOT_AUTHORIZED');
 assert.deepEqual([...a.files.keys()],[...plain.files.keys()]);
 assert.equal(plain.manifest.local_revision_overlay,undefined);
 assert.deepEqual(Buffer.from(await a.zip.arrayBuffer()),Buffer.from(await b.zip.arrayBuffer()));
});
test('requires pinned authority, receipt bindings, source identity, bytes and existing paragraph',()=>{
 const mismatches=[
  {...args,grantBytes:encode({...grant,archive_text:'Not reviewed'})},
  {...args,receipt:{...receipt,source_anchor:'somewhere-else'}},
  {...args,workingCopyBytes:Buffer.from('changed working bytes')},
  {...args,baselineBytes:Buffer.from('changed baseline bytes')},
  {...args,input:{...input,pages:[{capture:{...capture,blocks:[{...capture.blocks[0],text:'Changed capture.'}]}}]}},
  {...args,input:{...input,pages:[]}},
  {...args,receipt:{...receipt,publication:'AUTHORIZED'}},
  {...args,receipt:{...receipt,capture_sha256:'d'.repeat(64)}},
 ];
 for(const x of mismatches)assert.throws(()=>buildApprovedRevisionArchive(x),/independent local review pin/);
 for(const edit of [{source_version:'7-4'},{source_anchor:'not-present'},{target_anchor:'step-3'}]){
  const bytes=encode({...grant,...edit});
  // Even a separately pinned synthetic local grant cannot place a nonexistent/duplicate target or wrong edition.
  assert.throws(()=>buildApprovedRevisionArchive({...args,grantBytes:bytes,trustedGrantSha256:sha(bytes),receipt:{...receipt,...edit}}),/independent local review pin/);
 }
});

test('scoped v2 locator inserts only inside the exact digest-pinned list item with no native anchor',async()=>{
 const list={kind:'list_item',text:'Repeated  text\nwith <brackets>.'};
 const cap={...capture,truncated:true,blocks:[
  {kind:'heading',level:2,anchor:'using-sample',text:'Using the sample'},
  {kind:'paragraph',text:'Before the steps.'},
  list,list,
  {kind:'heading',level:2,anchor:'another-section',text:'Another section'},
  list
 ]};
 const capInput={...input,pages:[{capture:cap}]};
 const capReceipt={...receipt,capture_sha256:captureDigest(cap),source_anchor:'using-sample'};
 const locator={section_anchor:'using-sample',block_kind:'list_item',section_block_index:2,
  block_sha256:sha('Repeated text with <brackets>.')};
 assert.equal(locator.block_sha256,capturedListItemDigest(list));
 const capGrant={...grant,schema:'zebra-local-archive-overlay-grant/v2',source_anchor:capReceipt.source_anchor,
  capture_sha256:capReceipt.capture_sha256,locator};
 const checked=(replacements={})=>{
  const b=encode({...capGrant,...replacements});
  return {...args,input:capInput,receipt:capReceipt,grantBytes:b,trustedGrantSha256:sha(b)};
 };
 const generated=await zipApprovedRevisionArchive(checked());
 const page=generated.files.get('pages/001.html');
 assert.match(page,/<li>Repeated  text\nwith &lt;brackets&gt;\.<\/li>\n<li>Repeated  text\nwith &lt;brackets&gt;\.<p id="revision-proposal"/);
 assert.equal((page.match(/id="revision-proposal"/g)||[]).length,1);
 assert.deepEqual(generated.manifest.local_revision_overlay.captured_list_locator,{...locator,native_capture_anchor:null});
 assert.equal(generated.manifest.pages[0].capture_truncated,true);
 assert.equal(capInput.pages[0].capture.blocks[3].anchor,undefined);
 assert.match(generated.files.get('index.html'),/href="pages\/001.html#revision-proposal"/);
 for(const edit of [{section_block_index:4},{section_block_index:0},{block_sha256:'e'.repeat(64)},{section_anchor:'another-section'}]){
  assert.throws(()=>buildApprovedRevisionArchive(checked({locator:{...locator,...edit}})),/independent local review pin/);
 }
 const {locator:removed,...unscoped}=capGrant;
 const b=encode({...unscoped,schema:'zebra-local-archive-overlay-grant/v1'});
 assert.throws(()=>buildApprovedRevisionArchive({...checked(),grantBytes:b,trustedGrantSha256:sha(b)}),/independent local review pin/);
});

test('v3 independent local pin inserts before the only exact paragraph in the selected section',async()=>{
 const para={kind:'paragraph',text:'Synthetic source text.'};
 const cap={...capture,truncated:true,blocks:[
  {kind:'heading',level:2,anchor:'section',text:'Selected section'},
  {kind:'paragraph',text:'Not selected.'},
  para,
  {kind:'heading',level:2,anchor:'later',text:'Later section'},
  para
 ]};
 const capInput={...input,pages:[{capture:cap}]};
 const capReceipt={...receipt,source_anchor:'section',capture_sha256:captureDigest(cap)};
 const locator={section_anchor:'section',block_kind:'paragraph',section_block_index:1,block_sha256:capturedListItemDigest(para)};
 const capGrant={...grant,schema:'zebra-local-archive-overlay-grant/v3',source_anchor:capReceipt.source_anchor,
  capture_sha256:capReceipt.capture_sha256,locator};
 const pack=(g=capGrant)=>{const bytes=encode(g);return {...args,input:capInput,receipt:capReceipt,grantBytes:bytes,trustedGrantSha256:sha(bytes)};};
 const approved=await zipApprovedRevisionArchive(pack());
 const page=approved.files.get('pages/001.html');
 assert.match(page,/<p id="revision-proposal">[^]*?<\/p><p>Synthetic source text\.<\/p>/);
 assert.equal(page.match(/id="revision-proposal"/g)?.length,1);
 assert.equal(approved.manifest.local_revision_overlay.captured_paragraph_before_locator.native_capture_anchor,null);
 assert.equal(approved.manifest.pages[0].capture_truncated,true);
 for(const bad of [{...locator,section_block_index:3},{...locator,block_sha256:'0'.repeat(64)},{...locator,block_kind:'list_item'}])
  assert.throws(()=>buildApprovedRevisionArchive(pack({...capGrant,locator:bad})));
 assert.throws(()=>buildApprovedRevisionArchive({...pack(),trustedGrantSha256:'0'.repeat(64)}));
 const dup={...cap,blocks:[...cap.blocks.slice(0,3),para,...cap.blocks.slice(3)]};
 const d=captureDigest(dup),dg={...capGrant,capture_sha256:d};
 assert.throws(()=>buildApprovedRevisionArchive({...pack(dg),input:{...input,pages:[{capture:dup}]},receipt:{...capReceipt,capture_sha256:d}}));
});
