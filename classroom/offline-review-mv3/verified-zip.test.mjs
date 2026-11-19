import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mirrorZip} from './extension/zip.js';
import {verifyLocalZip,bindVerifiedZip} from './extension/verified-zip.js';
const sha=b=>createHash('sha256').update(b).digest('hex');
const zipFile=mirrorZip(new Map([['index.html','synthetic locally generated ZIP fixture'],['site.css',''],['manifest.json','{}']]));
const archive_hash=sha(Buffer.from(await zipFile.arrayBuffer()));
const receipt={schema:'zebra-local-reviewed-archive-check/v1',archive_hash,model:'NOT_RUN',publication:'NOT_AUTHORIZED',
 binding:{schema:'zebra-archive-revision-overlay/v1',case_id:'SYNTHETIC-1',run_id:'CAPTURE-'+'a'.repeat(24),
 source_url:'https://techdocs.zebra.com/emdk-for-android/7-3/samples/barcode/',source_version:'7-3',
 archive_path:'pages/001.html#added',target_anchor:'added',capture_sha256:'c'.repeat(64),working_copy_sha256:'d'.repeat(64),
 rendered_working_copy_embedded:false,reviewer_authenticated:false,publication:'NOT_AUTHORIZED'}};
const files=(r=receipt)=>{const raw=JSON.stringify(r);return {receiptFile:new Blob([raw]),zipFile,expectedReceiptSha256:sha(raw)};};
test('exact pinned receipt and ZIP bytes match; wrong pin, bytes, edition and unsafe archive path reject',async()=>{
 const valid=await verifyLocalZip(files());
 assert.equal(valid.archivePath,'pages/001.html#added');
 assert.equal(sha(Buffer.from(await valid.blob.arrayBuffer())),archive_hash);
 for(const attempt of [
  {...files(),expectedReceiptSha256:'0'.repeat(64)},{...files(),zipFile:new Blob(['alt'])},
  files({...receipt,binding:{...receipt.binding,source_version:'7-4'}}),
  files({...receipt,binding:{...receipt.binding,archive_path:'../outside.html#added'}}),
  files({...receipt,binding:{...receipt.binding,archive_path:'pages/001.html#different'}}),
  files({...receipt,publication:'AUTHORIZED'}),
 ]) await assert.rejects(verifyLocalZip(attempt));
 let reads=0;
 await assert.rejects(verifyLocalZip({...files(),receiptFile:{size:64_001,arrayBuffer:async()=>{reads++}}}));
 assert.equal(reads,0);
});
test('download is off until local verification and cancelled selections cannot reenable it',async()=>{
 const create=()=>{const listeners={};return {files:[],value:'',textContent:'',disabled:true,addEventListener(k,f){listeners[k]=f;},
  trigger:k=>listeners[k]?.({preventDefault(){}})};};
 const els=Object.fromEntries(['receipt','zip','receipt-pin','inputs','status','summary','save','clear'].map(k=>[k,create()]));
 const doc={getElementById:k=>els[k]};
 let download=null, resolve;
 bindVerifiedZip(doc,{verify:()=>new Promise(r=>{resolve=r}),save:(_,blob)=>{download=blob;}});
 assert.equal(els.save.disabled,true);
 await els.save.trigger('click');
 assert.equal(download,null);
 const expected=await verifyLocalZip(files());
 const obsolete=els.inputs.trigger('submit');
 await els.clear.trigger('click'); resolve(expected); await obsolete;
 assert.equal(els.save.disabled,true);
 const fresh=els.inputs.trigger('submit');resolve(expected);await fresh;
 assert.equal(els.save.disabled,false);
 assert.match(els.summary.textContent,/Receipt-reported archive location/);
 await els.save.trigger('click');
 assert.equal(sha(Buffer.from(await download.arrayBuffer())),archive_hash);
 assert.equal(els.save.disabled,true);
});
