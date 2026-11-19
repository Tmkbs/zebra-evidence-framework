import test from 'node:test';
import assert from 'node:assert/strict';
import {buildMirror,createMirrorCache,normalizeCapture,INPUT} from '../engine.js';

const d='https://techdocs.zebra.com', f='https://developer.zebra.com';
const src=d+'/oeminfo/consume/', child=d+'/oeminfo/about/', extra=d+'/oeminfo/deep/';
const forum=f+'/content/real-frozen-example';
const stamp='2026-11-19T00:00:00.000Z';
const cap=(source_url,source_kind='techdocs',payload='Example <script>alert(1)</script>')=>({
 schema_version:'zebra-doc-capture/v1',source_url,captured_at:stamp,title:'Evidence to inspect',
 source_kind,blocks:[{kind:'heading',text:'Start',level:2,anchor:'start'},{kind:'code',text:payload}],truncated:false
});
const item=(url,links=[],source_kind)=>({capture:cap(url,source_kind),discovered_links:links.map(target_url=>({target_url,label:'Jump <b>outside</b>'}))});
const build=(pages,extras={})=>buildMirror({schema_version:INPUT,allowed_origins:[d,f],roots:[src],pages,...extras});

test('produces navigable inert HTML with stable paths, anchors and coverage',()=>{
 const out=build([item(src,[child+'#start',child+'#not-present',forum,d+'/oeminfo/missing/',
   'javascript:alert(1)','https://techdocs.zebra.com/oeminfo/access/?token=secret']),item(child)]);
 assert.equal(out.manifest.captured_pages,2);
 const s=out.files.get('pages/001.html');
 assert.match(s,/href="002\.html#start"/);assert.match(s,/<pre><code>Example &lt;script&gt;alert\(1\)&lt;\/script&gt;<\/code><\/pre>/);
 assert.match(s,/Jump &lt;b&gt;outside&lt;\/b&gt;/);
 assert.doesNotMatch(s,/<script|href="https:|iframe|javascript:|token=secret/);
 assert.equal(out.manifest.pages[0].omitted_links.cross_origin,1);
 assert.equal(out.manifest.pages[0].omitted_links.invalid_url,2);
 assert.equal(out.manifest.pages[0].omitted_links.missing_fragment,1);
 assert.deepEqual(out.manifest.missing,[{source_url:d+'/oeminfo/missing/',reason:'not_supplied'}]);
});
test('independent roots can cover both allowed origins; edges cannot cross origins',()=>{
 const out=build([item(forum,[child],'forum'),item(child)],{roots:[child,forum]});
 assert.equal(out.manifest.captured_pages,2);
 assert.equal(out.manifest.pages.find(p=>p.source_kind==='forum').omitted_links.cross_origin,1);
});
test('bounded breadth/depth traverse cycles once and report omissions',()=>{
 const rows=[item(src,[src,child]),item(child,[extra]),item(extra,[src])];
 const out=build(rows,{budget:{maxDepth:1,maxPages:3}});
 assert.equal(out.manifest.captured_pages,2);
 assert.equal(out.manifest.unreachable_captures,1);
 assert.equal(out.manifest.pages[1].omitted_links.depth_budget,1);
 assert.throws(()=>build(rows,{budget:{maxPages:2}}),/cache budget/);
 assert.throws(()=>build(rows,{budget:{maxBytes:10}}),/cache budget/);
});
test('file bytes deterministic across input page order and reset clears captures',()=>{
 const a=item(src,[child]);const b=item(child,[src]);
 assert.deepEqual([...build([a,b]).files],[...build([b,a]).files]);
 const c=createMirrorCache({roots:[src],allowed_origins:[d]});
 c.stage(a);assert.equal(c.build().manifest.captured_pages,1);
 assert.throws(()=>c.stage(a),/duplicate/);
 assert.deepEqual(c.clear(),{count:0,bytes:0});
 assert.equal(c.build().manifest.captured_pages,0);
});
test('refuses unknown origins, credentials, private paths, noncanonical and untrusted fields',()=>{
 for(const url of ['https://localhost/docs/','https://10.1.1.2/docs/',
 'https://user:pass@techdocs.zebra.com/oeminfo/consume/',d+'/oeminfo/../consume/',d+'/oeminfo/%2e%2e/consume/',d+'/oeminfo/private/docs/',
 d+'/oeminfo/consume/?token=a',d+'/oeminfo/consume/#here'])assert.throws(()=>normalizeCapture(cap(url)));
 assert.throws(()=>build([item('https://other.com/docs/x')] ),/unapproved/);
 assert.throws(()=>normalizeCapture({...cap(src),cookie:'x'}),/invalid capture/);
 assert.throws(()=>normalizeCapture(cap(src,'techdocs','api_key = xxxxxxxxxxxxxxxxxxxxx')),/potentially sensitive/);
 assert.throws(()=>normalizeCapture(cap(forum,'forum','Q'.repeat(70))),/potentially sensitive/);
 assert.throws(()=>normalizeCapture({...cap(src),captured_at:'2026-02-31T00:00:00.000Z'}),/invalid capture/);
});

test('CLI writes a usable, exclusively created offline directory',async()=>{
 const {mkdtemp,writeFile,readFile,readdir,rm}=await import('node:fs/promises');
 const {tmpdir}=await import('node:os');
 const {join}=await import('node:path');
 const {spawnSync}=await import('node:child_process');
 const {fileURLToPath}=await import('node:url');
 const temp=await mkdtemp(join(tmpdir(),'zebra-mirror-fixture-'));
 try{
  const input=join(temp,'input.json'),output=join(temp,'output');
  await writeFile(input,JSON.stringify({schema_version:INPUT,allowed_origins:[d],roots:[src],pages:[item(src,[child]),item(child)]}));
  const cli=fileURLToPath(new URL('../mirror.mjs',import.meta.url));
  const r=spawnSync(process.execPath,[cli,input,output],{encoding:'utf8'});
  assert.equal(r.status,0,r.stderr);
  assert.deepEqual((await readdir(output)).sort(),['index.html','manifest.json','pages','site.css']);
  assert.match(await readFile(join(output,'index.html'),'utf8'),/pages\/001\.html/);
  assert.match(await readFile(join(output,'pages','001.html'),'utf8'),/href="002\.html"/);
  const check=JSON.parse(await readFile(join(output,'manifest.json'),'utf8'));
  assert.equal(check.captured_pages,2);
  assert.equal(check.pages[1].source_url,child);
  const repeat=spawnSync(process.execPath,[cli,input,output],{encoding:'utf8'});
  assert.notEqual(repeat.status,0);
  assert.equal(JSON.parse(await readFile(join(output,'manifest.json'),'utf8')).captured_pages,2);
 }finally{await rm(temp,{recursive:true,force:true});}
});

test('rejects unsafe or unpaired Unicode in all exported text without rejecting Unicode scalars',()=>{
 for(const mark of ['\ud800','\udfff']){
  const invalid='T'+mark+'x';
  assert.throws(()=>normalizeCapture({...cap(src),title:invalid}),/invalid title/);
  assert.throws(()=>normalizeCapture(cap(src,'techdocs',invalid)),/invalid block text/);
  assert.throws(()=>build([{capture:cap(src),discovered_links:[{target_url:child,label:invalid}]}]),/invalid link label/);
 }
 const title='Emoji 🦓';
 assert.equal(normalizeCapture({...cap(src),title}).title,title);
 const secret='secret_key = '+'a'.repeat(16);
 assert.throws(()=>normalizeCapture({...cap(src),title:secret}),/potentially sensitive title/);
 assert.throws(()=>normalizeCapture(cap(src,'techdocs',secret)),/potentially sensitive block/);
 assert.throws(()=>build([{capture:cap(src),discovered_links:[{target_url:child,label:secret}]}]),/potentially sensitive link label/);
 const opaque='Value: '+'A'.repeat(64);
 assert.throws(()=>normalizeCapture({...cap(forum,'forum'),title:opaque}),/potentially sensitive title/);
 assert.throws(()=>build([{capture:cap(forum,'forum'),discovered_links:[{target_url:forum,label:opaque}]}],{roots:[forum]}),/potentially sensitive link label/);
 assert.equal(normalizeCapture({...cap(src),title:opaque}).title,opaque);
});

test('renderable headings require levels and all present anchors must be canonical and unique',()=>{
 const replace=(...blocks)=>normalizeCapture({...cap(src),blocks});
 assert.throws(()=>replace({kind:'heading',text:'Unleveled heading'}),/invalid heading level/);
 assert.throws(()=>replace({kind:'heading',text:'Overleveled heading',level:7}),/invalid heading level/);
 assert.throws(()=>replace({kind:'paragraph',text:'Not a heading',level:2}),/invalid block level/);
 assert.throws(()=>replace({kind:'heading',text:'Title',level:1,anchor:'one two'}),/invalid or repeated anchor/);
 assert.throws(()=>replace({kind:'heading',text:'Title',level:1,anchor:'same'},{kind:'paragraph',text:'Paragraph',anchor:'same'}),/invalid or repeated anchor/);
 assert.deepEqual(replace({kind:'heading',text:'Title',level:1},{kind:'paragraph',text:'Paragraph',anchor:'stable-id'}).blocks,
    [{kind:'heading',text:'Title',level:1},{kind:'paragraph',text:'Paragraph',anchor:'stable-id'}]);
});
