import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {buildMirror} from './extension/engine.js';
import {buildApprovedRevisionArchive,captureDigest,zipApprovedRevisionArchive} from './approved-revision-archive.mjs';
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
