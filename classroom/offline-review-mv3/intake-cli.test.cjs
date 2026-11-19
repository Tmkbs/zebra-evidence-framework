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

test('browser collection envelopes enter native intake without manually re-exporting plain capture JSON',()=>{
 const dir=mkdtempSync(join(tmpdir(),'zebra-collection-intake-'));
 try{
  const urls=['https://developer.zebra.com/content/sample-forum-question','https://techdocs.zebra.com/datawedge/15-0/guide/input/barcode/'];
  const docs=[obj('forum',urls[0]),obj('techdocs',urls[1])];
  const entry=(capture)=>({schema_version:'zebra-reviewed-mirror-page/v1',capture,
   discovered_links:[{target_url:capture.source_url,label:'Archive-only test metadata'}],link_discovery:'filtered_scan_finished'});
  const files=docs.map((doc,i)=>{const f=join(dir,i+'.json');writeFileSync(f,JSON.stringify(entry(doc)));return f;});
  const bindings=files.flatMap((f,i)=>{
   const r=call('inspect',f,urls[i]);assert.equal(r.status,0,r.stderr);
   assert.doesNotMatch(r.stdout,/Archive-only test metadata/);
   const p=JSON.parse(r.stdout);assert.equal(p.approved_for_local_intake,false);
   return [f,urls[i],p.sha256];
  });
  writeFileSync(files[0],JSON.stringify(docs[0])+' '.repeat(170_000));
  assert.equal(JSON.parse(call('inspect',files[0],urls[0]).stderr).error.code,'CAPTURE_LIMIT');
  writeFileSync(files[0],JSON.stringify(entry(docs[0]))+' '.repeat(170_000));
  assert.equal(call('inspect',files[0],urls[0]).status,0);
  writeFileSync(files[0],JSON.stringify(entry(docs[0]))+' '.repeat(370_000));
  assert.equal(JSON.parse(call('inspect',files[0],urls[0]).stderr).error.code,'CAPTURE_LIMIT');
  writeFileSync(files[0],JSON.stringify(entry(docs[0])));
  const actual=call('intake','--approve-local',...bindings);assert.equal(actual.status,0,actual.stderr);
  const expected=require('../capture-intake.cjs').intake({forum:docs[0],techdocs:docs[1]});
  assert.deepEqual(JSON.parse(actual.stdout),expected);
  assert.equal(call('intake',...bindings).status,1);
  writeFileSync(files[1],JSON.stringify({...entry(docs[1]),approved_for_local_intake:true}));
  assert.equal(JSON.parse(call('inspect',files[1],urls[1]).stderr).error.code,'COLLECTION_ENVELOPE');
  docs[0].blocks[0].text+='Changed';
  writeFileSync(files[0],JSON.stringify(entry(docs[0])));
  const modified=call('intake','--approve-local',...bindings);
  assert.equal(modified.status,1);assert.equal(modified.stdout,'');
 }finally{rmSync(dir,{recursive:true,force:true});}
});


test('native intake retains exact optional slash on numeric public forum captures',()=>{
 const deps=require('../capture-intake.cjs');
 const docs='https://techdocs.zebra.com/datawedge/15-0/guide/input/barcode/';
 const numeric='https://developer.zebra.com/forum/123456789012';
 const dir=mkdtempSync(join(tmpdir(),'zebra-numeric-forum-'));
 try {
  const t=join(dir,'docs.json'), f=join(dir,'forum.json');
  writeFileSync(t,JSON.stringify(obj('techdocs',docs)));
  const doc=JSON.parse(call('inspect',t,docs).stdout);
  for(const url of [numeric,numeric+'/']){
   writeFileSync(f,JSON.stringify(obj('forum',url)));
   const p=call('inspect',f,url);assert.equal(p.status,0,p.stderr);
   const reviewed=JSON.parse(p.stdout);
   const accepted=call('intake','--approve-local',f,url,reviewed.sha256,t,docs,doc.sha256);
   assert.equal(accepted.status,0,accepted.stderr);
   const row=JSON.parse(accepted.stdout);
   assert.equal(row.evidence[0].public_url,url);
   assert.equal(row.stage,'CAPTURE_REVIEW_REQUIRED');
   assert.equal(row.downstream_adapter.apply_allowed,false);
  }
  for(const route of ['/forum/0','/forum/01','/forum/1234567890123','/forum/123/replies','/forum/123?x=1','/forum/topic'])
   assert.throws(()=>deps.validateCapture(obj('forum','https://developer.zebra.com'+route)));
 } finally {rmSync(dir,{recursive:true,force:true});}
});
