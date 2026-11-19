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
test('portable subprocess exercises the CLI with an explicitly synthetic trusted adapter',()=>scenario(({d,root,f,paths,command})=>{
 const app=path.join(d,'synthetic-renderer.cjs');
 // This stub tests the CLI transport and projection, not application conformance.
 const fields=['case_id','source_sha256','source_paragraph_id','framework_commit','practicum_commit'];
 fs.writeFileSync(app,`'use strict';
 module.exports={applyReturn(h,b,html){
  const {createHash}=require('node:crypto');
  if(h.case.id!==b.case_id||createHash('sha256').update(html).digest('hex')!==b.source_sha256)throw Error('fixture mismatch');
  const refs=Object.fromEntries(${JSON.stringify(fields)}.map(k=>[k,b[k]]));
  return {html:'synthetic result must not leave the CLI',receipt:{...refs,
   schema:'practicum-framework-return/v1',original_modified:false,publication:'NOT_AUTHORIZED',model_execution:'NOT_RUN'}};
 }};
 `);
 const call=(dir=root,pathname=app)=>command(dir,'--reviewed-local',pathname);
 const good=call();assert.equal(good.status,0,good.stderr);assert.equal(good.stderr,'');
 const result=JSON.parse(good.stdout);
 assert.equal(result.result,'LOCAL_COPY_RENDERER_ACCEPTS_PINNED_BINDINGS');
 assert.equal(result.source_version,f.trustedBaseline.source_version);
 for(const k of ['write_performed','apply_allowed','merge_allowed','model_invoked'])assert.equal(result[k],false);
 assert.doesNotMatch(good.stdout,/synthetic result|Synthetic heading|raw_handoff/);
 const different=structuredClone(f.handoff);different.proposed_revision.source_version='another-edition';
 fs.writeFileSync(paths[1],JSON.stringify(different));
 const edition=call();assert.equal(edition.status,1);assert.equal(JSON.parse(edition.stdout).result,'BASELINE_EDITION_MISMATCH');
 const invalid=result=>{assert.equal(result.status,1);assert.equal(result.stdout,'');assert.equal(JSON.parse(result.stderr).error,'LOCAL_INPUT_REJECTED');};
 fs.writeFileSync(paths[1],Buffer.from([0xff]));invalid(call());
 fs.writeFileSync(paths[1],'x'.repeat(650001));invalid(call());
 fs.unlinkSync(paths[1]);fs.symlinkSync(paths[0],paths[1]);invalid(call());fs.unlinkSync(paths[1]);
 fs.writeFileSync(paths[1],JSON.stringify(f.handoff));
 const alias=path.join(d,'linked-root');fs.symlinkSync(root,alias);invalid(call(alias));
 const inside=path.join(root,'nested-adapter.cjs');fs.copyFileSync(app,inside);invalid(call(root,inside));
 fs.appendFileSync(paths[2],'drift');
 const rejected=call();assert.equal(rejected.status,1);assert.equal(JSON.parse(rejected.stdout).result,'LOCAL_COPY_RENDERER_REJECTS_BINDINGS');
}));
