import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {test} from 'node:test';
import {assembleSelectedArchive as cliAssembly} from './reviewed-archive-portable.mjs';
import {assembleSelectedArchive as browserAssembly} from './extension/reviewed-archive-portable.mjs';

const root=new URL('./extension/', import.meta.url);
const source=name=>readFile(new URL(name,root),'utf8');

test('popup opens the local builder without changing extension permission or network boundary', async()=>{
 const manifest=JSON.parse(await source('manifest.json'));
 assert.deepEqual(manifest.permissions,['activeTab','scripting']);
 for(const key of ['host_permissions','optional_host_permissions','optional_permissions','externally_connectable','web_accessible_resources']) assert.ok(!Object.hasOwn(manifest,key),key);
 assert.match(manifest.content_security_policy.extension_pages,/connect-src 'none'/);
 const popup=await source(manifest.action.default_popup);
 for(const name of ['reviewed-archive.html','verified-zip.html','collector.html'])
  assert.ok(popup.includes('href="'+name+'" target="_blank" rel="noopener noreferrer"'),name);
 const page=await source('reviewed-archive.html');
 for(const name of ['trustPin','pairPin'])assert.match(page,new RegExp('name="'+name+'"[^>]+required'));
 assert.match(page,/form-action 'none'/);
 assert.match(page,/connect-src 'none'/);
 assert.match(page,/<a id="archive" download="zebra-local-reviewed-revision\.zip" hidden>/);
});

test('archive entry dependency graph is packaged inside extension; Node and browser share one builder',async()=>{
 assert.equal(cliAssembly,browserAssembly);
 const checked=new Set();
 async function visit(url){
  assert.ok(url.href.startsWith(root.href),url.href);
  if(checked.has(url.href))return;
  checked.add(url.href);
  const js=await readFile(url,'utf8');
  for(const match of js.matchAll(/^(?:import|export) [^\n]*? from ['"]([^'"]+)['"]/gm)){
   assert.match(match[1],/^\.\//);
   await visit(new URL(match[1],url));
  }
 }
 await visit(new URL('reviewed-archive-page.mjs',root));
 assert.equal(checked.size,8);
});
