import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {verifyOffline} from './verify-offline.mjs';
import {previewCollection} from './extension/collect.js';
const root='https://techdocs.zebra.com/datawedge/15-0/guide/api/softscantrigger/';
const child='https://techdocs.zebra.com/datawedge/15-0/guide/input/barcode/';
test('real renderer parity and CLI detect changes and do not certify provenance',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'zebra-offline-check-'));
 try{
  const outputDir=path.join(dir,'out');fs.mkdirSync(path.join(outputDir,'pages'),{recursive:true});
  const captures=[root,child].map(source_url=>JSON.stringify({schema_version:'zebra-reviewed-mirror-page/v1',capture:{
   schema_version:'zebra-doc-capture/v1',source_kind:'techdocs',source_url,captured_at:'2026-11-19T12:00:00.000Z',
   title:'Synthetic title',truncated:false,blocks:[{kind:'paragraph',text:'Synthetic offline content.'}]
  },discovered_links:source_url===root?[{target_url:child,label:'Barcode Input'}]:[]}));
  const entryFiles=captures.map((x,i)=>{const f=path.join(dir,i+'.json');fs.writeFileSync(f,x);return f;});
  const args={entryFiles,outputDir,root,approved:true};
  const {files}=previewCollection(root,captures).export({approved:true});
  for(const [name,data] of files)fs.writeFileSync(path.join(outputDir,name),data);
  assert.throws(()=>verifyOffline({...args,approved:false}));
  const matched=verifyOffline(args);
  assert.equal(matched.file_count,5);assert.equal(matched.browser_origin_authenticated,false);
  assert.equal(matched.zip_container_validated,false);assert.equal(matched.model_execution,'NOT_RUN');
  const cli=spawnSync(process.execPath,[fileURLToPath(new URL('./verify-offline.mjs',import.meta.url)),'--reviewed-local',outputDir,root,...entryFiles],{timeout:5000,encoding:'utf8'});
  assert.equal(cli.status,0,cli.stderr);assert.deepEqual(JSON.parse(cli.stdout),matched);
  const extra=path.join(outputDir,'unexpected.js');fs.writeFileSync(extra,'');
  assert.throws(()=>verifyOffline(args));fs.unlinkSync(extra);
  const article=path.join(outputDir,'pages/002.html');
  const valid=fs.readFileSync(article);const mutation=Buffer.from(valid);mutation[0]^=1;fs.writeFileSync(article,mutation);
  assert.throws(()=>verifyOffline(args));
  const rejected=spawnSync(process.execPath,[fileURLToPath(new URL('./verify-offline.mjs',import.meta.url)),'--reviewed-local',outputDir,root,...entryFiles],{timeout:5000,encoding:'utf8'});
  assert.equal(rejected.status,1);assert.equal(rejected.stdout,'');
  fs.writeFileSync(article,valid);fs.appendFileSync(article,'altered');
  assert.throws(()=>verifyOffline(args));fs.unlinkSync(article);
  assert.throws(()=>verifyOffline(args));
  fs.symlinkSync(path.join(dir,'0.json'),article);
  assert.throws(()=>verifyOffline(args));
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
