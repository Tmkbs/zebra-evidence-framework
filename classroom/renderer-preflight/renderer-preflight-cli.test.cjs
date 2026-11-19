'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os');
const {spawnSync}=require('node:child_process');
const fixture=require('./synthetic-fixture.cjs');
const adapter=process.env.ZEBRA_LOCAL_RENDERER_ADAPTER;
function scenario(callback) {
 const d=fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()),'zebra-preflight-cli-'));
 try{
  const root=path.join(d,'reviewed');fs.mkdirSync(root);
  const f=fixture();
  const paths=['baseline.json','handoff.json','original.html'].map(p=>path.join(root,p));
  fs.writeFileSync(paths[0],JSON.stringify(f.trustedBaseline));fs.writeFileSync(paths[1],JSON.stringify(f.handoff));fs.writeFileSync(paths[2],f.originalHtml);
  const command=(dir=root,flag='--reviewed-local',app=adapter)=>spawnSync(process.execPath,[path.join(__dirname,'renderer-preflight-cli.cjs'),flag,dir],{
   env:{...process.env,ZEBRA_LOCAL_RENDERER_ADAPTER:app??''},encoding:'utf8',timeout:5000});
  callback({d,root,f,paths,command});
 }finally{fs.rmSync(d,{recursive:true,force:true});}
}
test('bad roots, missing adapter and review flag deny without exposing inputs',()=>scenario(({d,root,command})=>{
 for(const out of [command('.'),command(path.join(d,'missing')),command(root,'--unchecked'),command(root,'--reviewed-local','')]){
  assert.equal(out.status,1);assert.equal(out.stdout,'');assert.equal(JSON.parse(out.stderr).error,'LOCAL_INPUT_REJECTED');
  assert.doesNotMatch(out.stderr,/zebra-preflight-cli-|Synthetic/);
 }
}));
test('actual pure app adapter, exact edition binding, file limits and symlink rejection',{skip:!adapter},()=>scenario(({d,root,f,paths,command})=>{
 const accepted=command();
 assert.equal(accepted.status,0,accepted.stderr);
 const record=JSON.parse(accepted.stdout);
 assert.equal(record.result,'LOCAL_COPY_RENDERER_ACCEPTS_PINNED_BINDINGS');assert.equal(record.source_version,f.trustedBaseline.source_version);
 assert.equal(record.apply_allowed,false);assert.equal(record.merge_allowed,false);assert.equal(record.write_performed,false);
 assert.doesNotMatch(accepted.stdout,/Synthetic heading|Synthetic rationale|raw_handoff/);
 const shifted=structuredClone(f.handoff);shifted.proposed_revision.source_version='different';
 fs.writeFileSync(paths[1],JSON.stringify(shifted));
 const mismatch=command();assert.equal(mismatch.status,1);assert.equal(JSON.parse(mismatch.stdout).result,'BASELINE_EDITION_MISMATCH');
 fs.writeFileSync(paths[1],'x'.repeat(650001));assert.equal(JSON.parse(command().stderr).error,'LOCAL_INPUT_REJECTED');
 fs.unlinkSync(paths[1]);fs.symlinkSync(paths[0],paths[1]);assert.equal(JSON.parse(command().stderr).error,'LOCAL_INPUT_REJECTED');
 const link=path.join(d,'alias');fs.symlinkSync(root,link);assert.equal(JSON.parse(command(link).stderr).error,'LOCAL_INPUT_REJECTED');
}));
