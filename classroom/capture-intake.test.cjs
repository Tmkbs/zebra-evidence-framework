'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {tmpdir}=require('node:os');
const path=require('node:path');
const {spawnSync}=require('node:child_process');
const {test}=require('node:test');
const {intake,validateCapture,loadCapture}=require('./capture-intake.cjs');
const stamp='2026-11-19T04:00:00.000Z';
function fixture(kind='forum'){
 return {schema_version:'zebra-doc-capture/v1',
  source_url:kind==='forum'?'https://developer.zebra.com/content/example-fixture':'https://techdocs.zebra.com/datawedge/13-0/guide/api/setconfig/',
  captured_at:stamp,title:'Synthetic bridge check',source_kind:kind,
  blocks:[{kind:'heading',text:'Sample source section',anchor:'section-one',level:2},{kind:'paragraph',text:'This is a test only.'}],truncated:false};
}
test('deterministically binds pair, case, run and ordered content without claiming review or model run',()=>{
 const f=fixture(),d=fixture('techdocs'),a=intake({forum:f,techdocs:d,caseId:'ZF-EXAMPLE'});
 const b=intake({forum:f,techdocs:{...d,blocks:d.blocks.map(x=>({text:x.text,...x}))},caseId:'ZF-EXAMPLE'});
 assert.deepEqual(a,b);
 assert.equal(a.schema,'zebra-doc-capture-intake/v1');
 assert.notEqual(a.schema,'research-documentation-handoff/v0.4');
 assert.notEqual(a.schema,'documentation-revision/v1');
 assert.equal(a.downstream_adapter.apply_allowed,false);
 assert.equal(a.downstream_adapter.export_to_handoff_allowed,false);
 assert.equal(a.stage,'CAPTURE_REVIEW_REQUIRED');
 assert.equal(a.case.id,'ZF-EXAMPLE');
 assert.equal(a.case.question,null);
 assert.equal(a.document_snapshot.source_version_from_url,'13-0');
 assert.equal(a.capture_binding.captures.length,2);
 assert.equal(a.capture_binding.structured_sources.techdocs.blocks[0].anchor,'section-one');
 assert.notEqual(a.run_id,intake({forum:f,techdocs:{...d,title:'Different'},caseId:'ZF-EXAMPLE'}).run_id);
 assert.match(a.run_id,/^CAPTURE-[a-f0-9]{24}$/);
 assert.ok(a.recorded_answers.every(r=>r.source==='NOT_RUN'&&!r.output));
 assert.equal(a.proposed_revision,null);
 assert.equal(a.patch_execution.original_modified,false);
 assert.equal(a.release.status,'NOT_AUTHORIZED');
 assert.equal(a.release.publication,false);
});
test('unapproved scheme, host, URL normalization and path fail closed',()=>{
 for(const source_url of ['http://techdocs.zebra.com/datawedge/13-0/','https://techdocs.zebra.com.evil/datawedge/13-0/','https://foo@techdocs.zebra.com/datawedge/13-0/','https://techdocs.zebra.com:443/datawedge/13-0/','https://techdocs.zebra.com/datawedge/13-0/?x=1','https://techdocs.zebra.com/datawedge/13-0/#heading','https://techdocs.zebra.com/dcs/login-foo/','https://techdocs.zebra.com/datawedge/13-0/file.pdf','https://techdocs.zebra.com/datawedge//13-0/','https://techdocs.zebra.com/datawedge/../mx/13-0/','https://techdocs.zebra.com/datawedge/%2e%2e/mx/13-0/']){
  assert.throws(()=>validateCapture({...fixture('techdocs'),source_url}),{code:'UNAPPROVED_SOURCE'});
 }
 assert.throws(()=>validateCapture({...fixture(),source_url:'https://developer.zebra.com/user/account'}),{code:'UNAPPROVED_SOURCE'});
});
test('limits reject bad block metadata, UTF-8 size, and unknown fields',()=>{
 const f=fixture();
 assert.throws(()=>validateCapture({...f,captured_at:'2026-02-30T04:00:00.000Z'}),{code:'CAPTURE_TIMESTAMP'});
 assert.throws(()=>validateCapture({...f,cookies:'should not be present'}),{code:'CAPTURE_SCHEMA'});
 assert.throws(()=>validateCapture({...f,blocks:[{kind:'paragraph',text:'x',level:1}]}),{code:'CAPTURE_BLOCK'});
 assert.throws(()=>validateCapture({...f,blocks:[{kind:'heading',text:'x',anchor:'javascript: <bad>'}]}),{code:'CAPTURE_BLOCK'});
 assert.throws(()=>validateCapture({...f,blocks:[{kind:'paragraph',text:'漢'.repeat(1167)}]}),{code:'CAPTURE_BLOCK'});
 assert.throws(()=>validateCapture({...f,blocks:[{kind:'paragraph',text:'\ud800'}]}),{code:'CAPTURE_BLOCK'});
 assert.throws(()=>validateCapture({...f,blocks:Array.from({length:15},()=>({kind:'paragraph',text:'abc  '.repeat(700)}))}),{code:'CAPTURE_LIMIT'});
});
test('credential-like values or opaque forum payloads never enter the handoff',()=>{
 for(const text of ['-----BEGIN PRIVATE KEY-----','placeholder password: '+'x'.repeat(20),'Value: '+'a'.repeat(64)]) {
  assert.throws(()=>validateCapture({...fixture(),blocks:[{kind:'paragraph',text}]}),{code:'SENSITIVE_TEXT'});
 }
 assert.throws(()=>validateCapture({...fixture('techdocs'),title:'api_key='+ 'x'.repeat(20)}),{code:'SENSITIVE_TEXT'});
});
test('truncation and unknown version remain explicit unknowns, and reversed pair fails',()=>{
 const d={...fixture('techdocs'),truncated:true,source_url:'https://techdocs.zebra.com/datawedge/latest/guide/'};
 assert.throws(()=>intake({forum:d,techdocs:fixture()}),{code:'CAPTURE_PAIR'});
 const {unknowns,case:c,document_snapshot:s}=intake({forum:fixture(),techdocs:d});
 assert.ok(unknowns.some(x=>x.startsWith('Capture truncated')));
 assert.equal(s.source_version_from_url,null);
 assert.equal(c.source_status,'PUBLIC_URL_NOT_INDEPENDENTLY_VERIFIED');
});
test('local CLI reads independent local captures, emits machine-readable error with no candidate leakage',t=>{
 const dir=fs.mkdtempSync(path.join(tmpdir(),'zebra-capture-'));
 t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));
 const f=path.join(dir,'forum.json'),d=path.join(dir,'docs.json'),bad=path.join(dir,'bad.json');
 fs.writeFileSync(f,JSON.stringify(fixture()));
 fs.writeFileSync(d,JSON.stringify(fixture('techdocs')));
 fs.writeFileSync(bad,Buffer.from([0xff,0xfe]));
 assert.throws(()=>loadCapture(bad),{code:'CAPTURE_JSON'});
 const p=spawnSync(process.execPath,[require.resolve('./capture-intake.cjs'),f,d,'ZF-EXAMPLE'],{encoding:'utf8'});
 assert.equal(p.status,0);
 assert.equal(JSON.parse(p.stdout).case.id,'ZF-EXAMPLE');
 const q=spawnSync(process.execPath,[require.resolve('./capture-intake.cjs'),f,bad],{encoding:'utf8'});
 assert.equal(q.status,1);
 assert.equal(q.stdout,'');
 const err=JSON.parse(q.stderr);
 assert.equal(err.error.code,'CAPTURE_JSON');
 assert.equal(err.release,'NOT_AUTHORIZED');
 assert.equal(err.model_execution,'NOT_RUN');
});
