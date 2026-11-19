'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {mkdtempSync,writeFileSync,rmSync}=require('node:fs');
const {join}=require('node:path'),{tmpdir}=require('node:os'),{spawnSync}=require('node:child_process');
const cli=join(__dirname,'intake-cli.cjs');
const call=(...args)=>spawnSync(process.execPath,[cli,...args],{encoding:'utf8',timeout:5000,maxBuffer:1_000_000});
const obj=(source_kind,source_url)=>({schema_version:'zebra-doc-capture/v1',source_url,source_kind,captured_at:'2026-11-19T12:00:00.000Z',title:'Synthetic',blocks:[{kind:'paragraph',text:'Synthetic body.'}],truncated:false});
test('inspect then individually bind captures to one non-applicable actual framework intake',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'zebra-cli-test-'));
 try{
  const urls=['https://developer.zebra.com/content/sample-forum-question','https://techdocs.zebra.com/datawedge/15-0/guide/api/softscantrigger/'];
  const files=[join(dir,'f.json'),join(dir,'t.json')];
  files.forEach((file,i)=>writeFileSync(file,JSON.stringify(obj(i?'techdocs':'forum',urls[i]))));
  const bindings=files.flatMap((file,i)=>{
   const p=call('inspect',file,urls[i]);assert.equal(p.status,0,p.stderr);
   const r=JSON.parse(p.stdout);assert.equal(r.approved_for_local_intake,false);assert.equal(r.blocks[0].text,'Synthetic body.');
   return [file,urls[i],r.sha256];
  });
  const run=call('intake','--approve-local',...bindings);assert.equal(run.status,0,run.stderr);
  const r=JSON.parse(run.stdout);assert.equal(r.stage,'CAPTURE_REVIEW_REQUIRED');assert.equal(r.case.model_execution_status,'NOT_RUN');
  assert.deepEqual(r.evidence.map(e=>e.public_url),urls);
  const {buildMirror}=await import('./extension/engine.js');
  const {manifest}=buildMirror({schema_version:'zebra-mirror-input/v1',allowed_origins:[new URL(urls[1]).origin],
    roots:[urls[1]],pages:[{capture:obj('techdocs',urls[1])}]});
  const mpath=join(dir,'manifest.json');writeFileSync(mpath,JSON.stringify(manifest));
  const withMirror=call('intake','--approve-local',...bindings,'--mirror-manifest',mpath);
  assert.equal(withMirror.status,0,withMirror.stderr);
  const correlated=JSON.parse(withMirror.stdout);assert.deepEqual(correlated.intake,r);
  assert.equal(correlated.mirror.status,'METADATA_MATCH_ONLY');
  manifest.pages[0].blocks++;
  writeFileSync(mpath,JSON.stringify(manifest));
  const disputed=call('intake','--approve-local',...bindings,'--mirror-manifest',mpath);
  assert.equal(disputed.status,1);assert.equal(disputed.stdout,'');
  const missing=call('intake',...bindings);assert.equal(missing.status,1);assert.equal(missing.stdout,'');
  writeFileSync(files[0],JSON.stringify({...obj('forum',urls[0]),title:'Modified'}));
  const altered=call('intake','--approve-local',...bindings);
  assert.equal(altered.status,1);assert.equal(altered.stdout,'');assert.doesNotMatch(altered.stderr,/Modified|zebra-cli-test/);
  const wrong=call('inspect',files[0],urls[1]);assert.equal(wrong.status,1);assert.equal(wrong.stdout,'');
 }finally{rmSync(dir,{recursive:true,force:true});}
});
