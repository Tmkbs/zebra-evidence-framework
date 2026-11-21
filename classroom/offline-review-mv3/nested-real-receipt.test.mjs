import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {intake} from '../capture-intake.cjs';
import {assembleSelectedArchive} from './extension/reviewed-archive-portable.mjs';
import {sha256 as sha} from './extension/archive-bytes.mjs';
import {verifyLocalZip} from './extension/verified-zip.js';
const bytes=s=>new TextEncoder().encode(s);
const json=o=>bytes(JSON.stringify(o));
const scope={schema_version:'zebra-section-scope/v1',heading_anchor:'details',boundary:'next_heading',whole_article:false};
const common={schema_version:'zebra-doc-capture/v1',captured_at:'2026-11-20T00:00:00.000Z',title:'Synthetic interoperability regression'};
const source='https://techdocs.zebra.com/dcs/rfid/android/2-0-5-292/tutorials/usbsupport/';
const forum={...common,source_url:'https://developer.zebra.com/forum/25083',source_kind:'forum',
 blocks:[{kind:'paragraph',text:'Synthetic question unrelated to the source URL.'}],truncated:false};
const text='Synthetic original paragraph.', proposal='Test clarification.';
const doc={capture:{...common,source_url:source,source_kind:'techdocs',
 blocks:[{kind:'heading',text:'Details',level:2,anchor:'details'},{kind:'paragraph',text}],truncated:true},section_scope:scope};
const canonical=o=>json(Object.fromEntries(Object.entries(o).sort(([x],[y])=>x<y?-1:x>y?1:0)));
test('Node intake to real Python receipt to verified offline ZIP for a versioned nested RFID route',async()=>{
 const t=mkdtempSync(join(tmpdir(),'zebra-cross-runtime-'));
 try {
 const i=intake({forum,techdocs:doc,caseId:'SYNTHETIC-RFID-PARITY'});
 assert.equal(i.document_snapshot.source_version_from_url,'2-0-5-292');
 const [q,d]=i.capture_binding.captures;
 const correlated=json({schema:'zebra-correlated-intake/v1',intake:i});
 const paragraph='<p>'+text+'</p>', target='review-note';
 const body='<main><article><h2 id="details">Details</h2>'+paragraph+'</article></main>';
 const baseline=bytes(body);
 const workingCopy=bytes(body.replace(paragraph,'<p class="proposal" id="'+target+'">'+proposal+'</p>'+paragraph));
 const identity={case_id:i.case.id,run_id:i.run_id,source_version:'2-0-5-292',source_sha256:await sha(baseline),
    paragraph_sha256:await sha(paragraph)};
 const operation=canonical({...identity,schema:'zebra-paragraph-before/v1',section_anchor:'details',target_anchor:target,
    segments:[{kind:'text',text:proposal}]});
 // The segment keys are already in lexical order; only fixture-generated approval is used.
 const operationSha=await sha(operation), cleanSha=await sha(workingCopy);
 const trust=json({...identity,schema:'zebra-trusted-local-operation/v1',scope:'LOCAL_RENDERED_COPY_ONLY',
    operation_sha256:operationSha,allowed_link:null});
 const review=json({schema:'zebra-local-review-binding/v1',scope:'PREVIOUSLY_REVIEWED_LOCAL_PARITY_ONLY',allows_publication:false,
    ...identity,operation_sha256:operationSha,baseline_sha256:identity.source_sha256,
    clean_sha256:cleanSha,intake_sha256:await sha(correlated),evidence:[source]});
 for(const [n,v] of Object.entries({operation,trust,review,baseline,intake:correlated}))writeFileSync(join(t,n),v);
 const cliArgs=['--operation',join(t,'operation'),'--trust',join(t,'trust'),'--review',join(t,'review'),
   '--operator-trust-sha256',await sha(trust),'--review-sha256',await sha(review),'--baseline',join(t,'baseline'),
   '--intake',join(t,'intake'),'--source-url',source,'--source-anchor','details','--target-anchor',target];
 const run=spawnSync('python',[new URL('./typed-operation/bound_cli.py',import.meta.url).pathname,...cliArgs],{encoding:'utf8',timeout:10000});
 assert.equal(run.status,0,run.stderr);
 const receipt=bytes(run.stdout), obj=JSON.parse(run.stdout);
 const grant=json({schema:'zebra-local-archive-overlay-grant/v3',scope:'LOCAL_INERT_ARCHIVE_ONLY',...identity,source_url:source,
   source_anchor:'details',target_anchor:target,capture_sha256:d.sha256,operation_sha256:operationSha,working_copy_sha256:cleanSha,archive_text:proposal,
   locator:{section_anchor:'details',block_kind:'paragraph',section_block_index:0,block_sha256:await sha(text)}});
 assert.equal(obj.working_copy_sha256,cleanSha);
 const trustPin=await sha(grant),pairBytes=json({schema:'zebra-local-case-source-pair/v2',scope:'LOCAL_INERT_ARCHIVE_ONLY',
   case_id:identity.case_id,run_id:identity.run_id,grant_sha256:trustPin, forum_url:q.url,forum_capture_sha256:q.sha256,
   techdocs_url:d.url,techdocs_capture_sha256:d.sha256,section_envelope_sha256:d.section_envelope_sha256,heading_anchor:'details'});
 const args={forum:json(forum),techdocs:json(doc),grant,trustPin,pairBytes,pairPin:await sha(pairBytes),receipt,baseline,workingCopy};
 const {buffer,report}=await assembleSelectedArchive(args);
 const checked=await verifyLocalZip({receiptFile:new Blob([json(report)]),zipFile:new Blob([buffer]),expectedReceiptSha256:await sha(json(report))});
 assert.equal(checked.caseId,identity.case_id);
 assert.equal(report.binding.source_version,'2-0-5-292');
 assert.equal(report.publication,'NOT_AUTHORIZED');
 await assert.rejects(assembleSelectedArchive({...args,receipt:json({...obj,source_version:'2-0-5-291'})}));
 console.log('Actual Python receipt bytes fed unchanged into Node ZIP: '+await sha(receipt)+'; verified ZIP: '+await sha(buffer));
 } finally {rmSync(t,{recursive:true,force:true});}
});
