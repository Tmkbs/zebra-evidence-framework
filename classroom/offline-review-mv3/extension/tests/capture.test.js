import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {checkSource,capturePage,captureActive,captureMirrorActive,readActiveTab,SCHEMA,LIMITS} from '../capture.js';

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
function run({url=tech,tag='techdocs',hidden=false,hiddenAncestor=false,privatePage=false,title='Official article',values}={}) {
 const specs=values??[['h2','An Overview','overview'],['p','Source body'],['pre','line 1\n    line 2'],['blockquote','Not a reply'],['p','hidden text',undefined,true]];
 const wrapper={localName:'section',parentElement:null,matches:()=>false};
 const root={localName:'div',parentElement:wrapper,closest:()=>null,matches:()=>false,querySelectorAll:()=>[]};
 const nodes=specs.map(([localName,data,id,isHidden])=>{
   const element={localName,id,parentElement:root,matches:()=>isHidden||false,closest:()=>null};
   element.text={parentElement:element,data,nodeType:3};
   return element;
 });
 root.querySelectorAll=()=>nodes;
 const g={URL, location:{href:url},window:{},NodeFilter:{SHOW_TEXT:4,SHOW_ELEMENT:1},TextEncoder,
   getComputedStyle:e=>({display:hiddenAncestor&&e===wrapper?'none':'block',visibility:hidden?'hidden':'visible'}),
   document:{title,querySelector:s=>s.includes('input[type')&&privatePage?{}:s.includes('h1')?{innerText:'Hidden out-of-article heading'}:null,
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

test('display none on an ancestor above the selected article blocks extraction',()=>{
 assert.throws(()=>run({hiddenAncestor:true}),/supported public text/);
});

test('title uses tab metadata or an already visible selected-article heading',()=>{
 assert.equal(run().title,'Official article');
 assert.equal(run({title:''}).title,'An Overview');
 assert.throws(()=>run({title:'',values:[['h2','Hidden heading',undefined,true],['p','Article paragraph']]}),/title could not be identified/);
});

function extractFixture(specs, captureOptions) {
 const tags=(el,query)=>query.split(',').some(s=>s==='a[href]'?el.localName==='a'&&el.getAttribute('href')!==null:s===el.localName);
 const flatten=(e,onlyElements=false)=>e.nodes.flatMap(child=>
   child.nodeType===3?(onlyElements?[]:[child]):[child,...flatten(child,onlyElements)]);
 function construct(spec,parentElement) {
   if(typeof spec==='string')return {nodeType:3,data:spec,parentElement};
   const [localName,attrs,children]=spec;
   const el={nodeType:1,localName,parentElement,id:attrs?.id||'',
     matches:s=>attrs?.excluded&&s.includes('script'),querySelectorAll:s=>flatten(el,true).filter(x=>tags(x,s)),
     getAttribute: k=>attrs?.[k]??null,style:attrs?.style};
   el.closest=s=>{for(let e=el;e;e=e.parentElement)if(e.matches(s)||tags(e,s))return e;return null;};
   el.nodes=(children||[]).map(c=>construct(c,el));
   el.children=el.nodes.filter(c=>c.nodeType===1);
   if(localName==='tr')el.cells=el.nodes.filter(c=>tags(c,'th,td'));
   return el;
 }
 const root=construct(['div',{},specs],null);
 const win={};win.top=win.self=win;
 const scope={URL,location:{href:tech},window:win,NodeFilter:{SHOW_TEXT:4,SHOW_ELEMENT:1},TextEncoder,
   getComputedStyle:el=>el.style||{display:'block',visibility:'visible'},
   document:{title:'Archive example, synthetic',querySelector:()=>null,querySelectorAll:s=>s==='#mainContent .service-box'?[root]:[],
    createTreeWalker(el){const nodes=flatten(el);let n=0;return {nextNode:()=>nodes[n++]||null};}
   }};
 const serialize=new Function(...Object.keys(scope),'source','limits','opts','return ('+capturePage.toString()+')(source,limits,opts)');
 return serialize(...Object.values(scope),{url:tech,kind:'techdocs'},LIMITS,captureOptions);
}

test('standalone code and prose retain explicit visual breaks only',()=>{
 const result=extractFixture([
  ['p',{},['Start\n source     wrap',['strong',{},[' ']],['br',{},[]],['br',{},[]],['em',{},['Finish']]]],
  ['pre',{},['  const a = 1;',['br',{},[]],['code',{},['  const b = 2;\n']]]]
 ]);
 assert.deepEqual(result.blocks,[{kind:'paragraph',text:'Start source wrap\n\nFinish'},{kind:'code',text:'  const a = 1;\n  const b = 2;\n'}]);
});
test('mixed table markup preserves loose and nested cell content once, also mixed lists',()=>{
 const cells=[
  ['td',{},['Loose ',['em',{},['inline']],['p',{},['Nested paragraph ',['strong',{},['bold']]]],
   '\n  ',['ul',{},[['li',{},['Nested item']]]],['div',{},['Last',['br',{},[]],'line']]]],
  ['td',{},['Second ',['span',{},['cell']]]]
 ];
 const result=extractFixture([['table',{},[['tbody',{},[['tr',{id:'row-1'},cells]]]]]]);
 assert.deepEqual(result.blocks,[{kind:'table_row',anchor:'row-1',text:'Loose inline\nNested paragraph bold\nNested item\nLast\nline | Second cell'}]);
});

test('same-origin link extraction is opt-in and keeps bounded visible safe page targets',()=>{
 const links=[
  ['a',{href:'../about/#version'},[['em',{},['OEMinfo']],' support']],
  ['a',{href:'#overview'},['Overview']],
  ['a',{href:'../about/#version'},['Duplicate']],
  ['a',{href:'/oeminfo/account/'},['Restricted path']],
  ['a',{href:'../about/?session=x'},['Query']],
  ['a',{href:'//techdocs.zebra.com/oeminfo/about/'},['Protocol-relative']],
  ['a',{href:'https://developer.zebra.com/content/serial'},['Different host']],
  ['a',{href:'javascript:alert(1)'},['Non-page']],
  ['a',{href:'../about/',style:{display:'none'}},['Hidden']],
  ['a',{href:'../about/',download:''},['Download']]
 ];
 const fixture=[['h2',{id:'overview'},['Overview']],...links.map(a=>['p',{},[a]])];
 assert.equal(extractFixture(fixture).discovered_links,undefined);
 const out=extractFixture(fixture,{includeSameOriginLinks:true});
 assert.equal(out.capture.schema_version,SCHEMA);
 assert.deepEqual(out.discovered_links,[
  {target_url:'https://techdocs.zebra.com/oeminfo/about/#version',label:'OEMinfo support'},
  {target_url:tech+'#overview',label:'Overview'}
 ]);
 const many=extractFixture([['h1',{},['Page']],...Array.from({length:31},(_,i)=>['p',{},[['a',{href:'/oeminfo/topic'+i+'/'},['Choice']]]])],{includeSameOriginLinks:true});
 assert.equal(many.discovered_links.length,20);
});

test('explicit mirror adapter cannot return a foreign or unbound page link',async()=>{
 let result;
 const api={tabs:{query:async()=>[{id:5,url:tech}]},scripting:{executeScript:async request=>{
  assert.deepEqual(request.args[2],{includeSameOriginLinks:true});
  return [{frameId:0,result}];
 }}};
 const expected=await readActiveTab(api);
 result={capture:{schema_version:SCHEMA,source_url:tech,source_kind:'techdocs',blocks:[{kind:'paragraph',text:'Example'}]},
  discovered_links:[{target_url:'https://developer.zebra.com/content/another-topic'}]};
 await assert.rejects(captureMirrorActive(api,expected),/Invalid mirror link/);
 result.discovered_links=[{target_url:tech+'#overview'}];
 assert.equal((await captureMirrorActive(api,expected)).discovered_links.length,1);
});


test('omits invisible branches and links but retains first summary and open details',()=>{
 const tree=[
  ['div',{style:{opacity:'0.0'}},[['p',{},['Invisible ancestor']]]],
  ['p',{style:{visibility:'collapse'}},['Collapsed']],
  ['details',{},[
   ['summary',{},[['span',{},['Summary shown']]]],
   ['summary',{},[['a',{href:'/oeminfo/hidden-summary/'},['Invisible second summary']]]],
   ['p',{},[['a',{href:'/oeminfo/hidden-detail/'},['Invisible details body']]]]
  ]],
  ['details',{open:''},[['p',{},['Open details body']]]],
  ['p',{},['Alpha ',['span',{style:{opacity:'0'}},['Invisible inline']], 'Zulu']]
 ];
 const result=extractFixture(tree,{includeSameOriginLinks:true});
 assert.deepEqual(result.capture.blocks.map(b=>b.text),['Open details body','Alpha Zulu']);
 assert.equal(result.discovered_links.length,0);
 // Summary is not itself a capture block; a visible eligible link within it is discoverable.
 const visible=extractFixture([['p',{},['Context']],['details',{},[
   ['summary',{},[['a',{href:'/oeminfo/visible-summary/'},['Visible summary link']]]]
 ]]],{includeSameOriginLinks:true});
 assert.deepEqual(visible.discovered_links,[{target_url:'https://techdocs.zebra.com/oeminfo/visible-summary/',label:'Visible summary link'}]);
});
