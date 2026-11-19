import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {checkSource,capturePage,captureActive,readActiveTab,SCHEMA,LIMITS} from '../capture.js';

const tech='https://techdocs.zebra.com/oeminfo/consume/';
const forum='https://developer.zebra.com/content/serial-number-tc20';
test('exact official paths, fragments not persisted',()=>{
 assert.deepEqual(checkSource(tech+'#acquiredevicedata'),{url:tech,kind:'techdocs'});
 assert.deepEqual(checkSource(forum),{url:forum,kind:'forum'});
 assert.equal(checkSource('https://techdocs.zebra.com/datawedge/15-0/guide/api/index.html').kind,'techdocs');
 for(const bad of ['http://techdocs.zebra.com/oeminfo/consume/',tech+'?session=x',
 'https://techdocs.zebra.com:443/oeminfo/consume/','https://techdocs.zebra.com.evil.test/docs/a/',
 'https://x@techdocs.zebra.com/oeminfo/consume/','https://@techdocs.zebra.com/oeminfo/consume/',
 'https://techdocs.zebra.com/oeminfo/../consume/','https://techdocs.zebra.com/oeminfo/%2e%2e/docs/',
 'https://techdocs.zebra.com/oeminfo//consume/','https://techdocs.zebra.com/oeminfo/docs.pdf',
 'https://techdocs.zebra.com/oeminfo/account/profile/','https://developer.zebra.com/forum',
 'https://developer.zebra.com/content/private-thread','chrome://newtab/']) assert.throws(()=>checkSource(bad),bad);
});
const manifest=JSON.parse(fs.readFileSync(new URL('../manifest.json',import.meta.url),'utf8'));
test('no persistent or network permissions',()=>{
 assert.deepEqual(manifest.permissions,['activeTab','scripting']);
 for(const forbidden of ['host_permissions','optional_host_permissions','content_scripts','background','externally_connectable'])assert.ok(!Object.hasOwn(manifest,forbidden));
 assert.match(manifest.content_security_policy.extension_pages,/connect-src 'none'/);
});
test('preview cannot authorize a different page or iframe',async()=>{
 let calls=0;
 const api={tabs:{query:async()=>[{id:5,url:tech}]},scripting:{executeScript:async req=>{
   ++calls;assert.deepEqual(req.target,{tabId:5,frameIds:[0]});assert.equal(req.world,'ISOLATED');
   assert.equal(req.func,capturePage);assert.deepEqual(req.args[1],LIMITS);
   return [{frameId:0,result:{schema_version:SCHEMA,source_url:tech,source_kind:'techdocs',blocks:[{kind:'paragraph',text:'Hello'}]}}];
 }}};
 const preview=await readActiveTab(api);
 await assert.rejects(captureActive(api,{tabId:6,source:preview.source}),/changed/);
 await assert.rejects(captureActive(api,{tabId:5,source:{url:forum}}),/changed/);
 assert.equal(calls,0);
 assert.equal((await captureActive(api,preview)).blocks[0].text,'Hello');
 api.scripting.executeScript=async()=>[{frameId:1,result:{schema_version:SCHEMA,source_url:tech}}];
 await assert.rejects(captureActive(api,preview),/did not finish/);
});
function run({url=tech,tag='techdocs',hidden=false,privatePage=false,values}={}) {
 const specs=values??[['h2','An Overview','overview'],['p','Source body'],['pre','line 1\n    line 2'],['blockquote','Not a reply'],['p','hidden text',undefined,true]];
 const root={localName:'div',parentElement:null,closest:()=>null,matches:()=>false,querySelectorAll:()=>[]};
 const nodes=specs.map(([localName,data,id,isHidden])=>{
   const element={localName,id,parentElement:root,matches:()=>isHidden||false,closest:()=>null};
   element.text={parentElement:element,data};
   return element;
 });
 root.querySelectorAll=()=>nodes;
 const g={URL, location:{href:url},window:{},NodeFilter:{SHOW_TEXT:4},TextEncoder,
   getComputedStyle:()=>({display:'block',visibility:hidden?'hidden':'visible'}),
   document:{title:'Official article',querySelector:s=>s.includes('input[type')&&privatePage?{}:null,
    querySelectorAll:s=>/(?:#mainContent \.service-box|article\.node--type-forum main\.forum-topic__content)/.test(s)?[root]:[],
    createTreeWalker:e=>{let done=false;return {nextNode(){if(done)return null;done=true;return e.text;}};}
   }};
 g.window.self=g.window;g.window.top=g.window;
 const serialize=new Function(...Object.keys(g),'source','limits','return ('+capturePage.toString()+')(source,limits)');
 return serialize(...Object.values(g),{url:url.split('#')[0],kind:tag},LIMITS);
}
test('captures bounded visible text and preserved code whitespace in isolated function',()=>{
 const r=run();
 assert.equal(r.schema_version,SCHEMA);
 assert.equal(new Date(r.captured_at).toISOString(),r.captured_at);
 assert.deepEqual(r.blocks,[
  {kind:'heading',text:'An Overview',level:2,anchor:'overview'},
  {kind:'paragraph',text:'Source body'},{kind:'code',text:'line 1\n    line 2'},
  {kind:'quote',text:'Not a reply'}]);
 const long=run({values:[['p','字'.repeat(5000)]]});
 assert.ok(long.truncated);
 assert.equal(Buffer.byteLength(long.blocks[0].text),3498);
});
test('restricted context and obvious credential-like content fail closed',()=>{
 assert.throws(()=>run({privatePage:true}),/restricted/);
 assert.throws(()=>run({hidden:true}),/supported public text/);
 assert.throws(()=>run({values:[['p','api_key = x'.padEnd(42,'a')]]}),/Potential credentials/);
 assert.throws(()=>run({url:forum,tag:'forum',values:[['p','Opaque candidate: '+'X'.repeat(70)]]}),/Potential credentials/);
});
