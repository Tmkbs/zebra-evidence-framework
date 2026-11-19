import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,rmSync,realpathSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {captureDigest} from './approved-revision-archive.mjs';
const sha=x=>createHash('sha256').update(x).digest('hex');
const here=fileURLToPath(new URL('./reviewed-archive-cli.mjs',import.meta.url));
test('one selected-input command assembles actual reviewed ZIP and refuses invalid pin/overwrite',async()=>{
 const dir=mkdtempSync(path.join(realpathSync(tmpdir()),'zebra-assemble-'));
 try {
  const selected=path.join(dir,'selected');mkdirSync(selected);
  const wrap=capture=>({schema_version:'zebra-reviewed-mirror-page/v1',capture,discovered_links:[],link_discovery:'unknown'});
  const source_url='https://techdocs.zebra.com/emdk-for-android/7-3/samples/barcode/';
  const capture={schema_version:'zebra-doc-capture/v1',source_url,source_kind:'techdocs',captured_at:'2026-11-19T00:00:00.000Z',
   title:'Synthetic source',blocks:[{kind:'paragraph',anchor:'step-3',text:'Synthetic original source.'}],truncated:false};
  const forum={...capture,source_url:'https://developer.zebra.com/forum/25083',source_kind:'forum',
   blocks:[{kind:'paragraph',text:'Synthetic fixture only.'}]};
  const baseline='<main><p id="step-3">Synthetic original source.</p></main>';
  const copy='<main><p id="step-3">Synthetic original source.</p><p id="proposal">Synthetic reviewed copy.</p></main>';
  const identity={case_id:'SYNTHETIC-01',run_id:'CAPTURE-'+'a'.repeat(24),source_url,source_anchor:'step-3',target_anchor:'proposal',
    source_version:'7-3',source_sha256:sha(baseline),paragraph_sha256:'1'.repeat(64),operation_sha256:'2'.repeat(64),
    working_copy_sha256:sha(copy),capture_sha256:await captureDigest(capture)};
  const receipt={...identity,schema:'zebra-bound-typed-copy/v1',publication:'NOT_AUTHORIZED',model_execution:'NOT_RUN',original_modified:false,write_performed:false};
  const grant=JSON.stringify({schema:'zebra-local-archive-overlay-grant/v1',scope:'LOCAL_INERT_ARCHIVE_ONLY',...identity,archive_text:'Synthetic reviewed paragraph'});
  for(const [name,v] of Object.entries({'forum.json':JSON.stringify(wrap(forum)),'techdocs.json':JSON.stringify(wrap(capture)),
      'grant.json':grant,'receipt.json':JSON.stringify(receipt),'baseline.html':baseline,'working-copy.html':copy}))writeFileSync(path.join(selected,name),v);
  const out=path.join(dir,'result.zip');
  const run=pin=>spawnSync(process.execPath,[here,'--reviewed-local',selected,pin,out],{encoding:'utf8',timeout:5000});
  assert.equal(run('0'.repeat(64)).status,1);assert.equal(existsSync(out),false);
  const result=run(sha(grant));assert.equal(result.status,0,result.stderr);
  const bytes=readFileSync(out), report=JSON.parse(result.stdout);
  assert.equal(report.archive_hash,sha(bytes));assert.equal(report.member_count,5);
  assert.equal(report.forum_pairing,'UNVERIFIED_COMPANION_NOT_BOUND_TO_CASE');
  assert.equal(report.binding.publication,'NOT_AUTHORIZED');assert.equal(report.browser_extension_install,'NOT_RUN');
  assert.equal(run(sha(grant)).status,1);assert.deepEqual(readFileSync(out),bytes);
  const paired=path.join(dir,'paired.zip');
  const pair=JSON.stringify({schema:'zebra-local-case-source-pair/v1',scope:'LOCAL_INERT_ARCHIVE_ONLY',
   case_id:identity.case_id,run_id:identity.run_id,grant_sha256:sha(grant),forum_url:forum.source_url,
   forum_capture_sha256:await captureDigest(forum),techdocs_url:source_url,techdocs_capture_sha256:await captureDigest(capture)});
  writeFileSync(path.join(selected,'pair.json'),pair);
  const pairedRun=(pin)=>spawnSync(process.execPath,[here,'--paired-local',selected,sha(grant),paired,pin],{encoding:'utf8',timeout:5000});
  assert.equal(pairedRun('0'.repeat(64)).status,1);
  writeFileSync(path.join(selected,'forum.json'),JSON.stringify(wrap({...forum,source_url:'https://developer.zebra.com/forum/25084'})));
  assert.equal(pairedRun(sha(pair)).status,1);assert.equal(existsSync(paired),false);
  writeFileSync(path.join(selected,'forum.json'),JSON.stringify(wrap({...forum,blocks:[{kind:'paragraph',text:'Unapproved altered body.'}]})));
  assert.equal(pairedRun(sha(pair)).status,1);assert.equal(existsSync(paired),false);
  writeFileSync(path.join(selected,'forum.json'),JSON.stringify(wrap(forum)));
  const resultPaired=pairedRun(sha(pair));assert.equal(resultPaired.status,0,resultPaired.stderr);
  const pReport=JSON.parse(resultPaired.stdout);
  assert.equal(pReport.forum_pairing,'EXACT_LOCAL_PAIR_PIN_MATCHED');
  assert.equal(pReport.source_pair.forum_capture_sha256,await captureDigest(forum));
  assert.equal(pReport.source_pair.reviewer_authenticated,false);
  assert.equal(pReport.archive_hash,sha(readFileSync(paired)));

 }finally{rmSync(dir,{recursive:true,force:true});}
});
