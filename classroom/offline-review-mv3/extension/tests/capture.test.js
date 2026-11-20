import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {checkSource,capturePage,captureActive,captureTableActive,captureMirrorActive,captureSectionActive,readActiveTab,SCHEMA,LIMITS} from '../capture.js';

import {createCaptureMirrorSession} from '../session.js';
import {mirrorZip} from '../zip.js';
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

function extractFixture(specs, captureOptions, injected={func:capturePage,args:[{url:tech,kind:'techdocs'},LIMITS,captureOptions]}, fixtureSelector) {
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
 root.contains=e=>flatten(root,true).includes(e);
 const scope={URL,location:{href:injected.args[0].url},window:win,NodeFilter:{SHOW_TEXT:4,SHOW_ELEMENT:1},TextEncoder,
   getComputedStyle:el=>el.style||{display:'block',visibility:'visible'},
   document:{title:'Archive example, synthetic',querySelector:()=>null,querySelectorAll:s=>{
      const id=s.match(/^\[id="([^"]+)"\]$/)?.[1];
      if(id)return flatten(root,true).filter(el=>el.id===id);
      return s===fixtureSelector&&fixtureSelector==='section#services' ? [root]
        : s===(fixtureSelector??(injected.args[0].kind==='forum'?'article.node--type-forum main.forum-topic__content .forum-topic__body':'#mainContent .service-box'))?[root]:[];
    },
    createTreeWalker(el){const nodes=flatten(el);let n=0;return {nextNode:()=>nodes[n++]||null};}
   }};
 const serialize=new Function(...Object.keys(scope),'source','limits','opts','return ('+injected.func.toString()+')(source,limits,opts)');
 return serialize(...Object.values(scope),...injected.args);
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

test('reports whether the eligible article-link scan stopped at a bound',()=>{
 const p=['p',{},['Content']];
 const a=i=>['p',{},[['a',{href:'/oeminfo/link'+i+'/'},['Link']]]];
 const o={includeSameOriginLinks:true};
 assert.equal(extractFixture([p,...Array.from({length:20},(_,i)=>a(i))],o).link_discovery,'filtered_scan_finished');
 assert.equal(extractFixture([p,...Array.from({length:21},(_,i)=>a(i))],o).link_discovery,'retained_link_limit');
 const skip=['a',{href:'/oeminfo/search/'},['Excluded']];
 const limited=extractFixture([p,...Array.from({length:160},()=>skip),a(161)],o);
 assert.equal(limited.link_discovery,'candidate_scan_limit');
 assert.equal(limited.discovered_links.length,0);
 assert.equal(limited.capture.truncated,false);
});

test('approved isolated DOM capture flows to offline ZIP and preserves only captured anchors',async()=>{
 let executions=0;
 const specs=[
  ['h2',{id:'sample'},['Literal <markup> heading']],
  ['p',{},[['a',{href:'#sample'},['Captured section']],['a',{href:'#absent'},['Missing section']],
   ['a',{href:'/oeminfo/uncaptured/'},['Not supplied']]]],
  ['p',{style:{display:'none'}},['Hidden evidence fixture']]
 ];
 const api={tabs:{query:async()=>[{id:7,url:tech+'#sample'}]},scripting:{executeScript:async request=>{
  executions++;
  assert.deepEqual(request.target,{tabId:7,frameIds:[0]});
  assert.equal(request.world,'ISOLATED');
  return [{frameId:0,result:extractFixture(specs,undefined,request)}];
 }}};
 const session=createCaptureMirrorSession(api,{roots:[tech]});
 const expected=await session.selectActive();
 await assert.rejects(session.capture({expected}),/Confirm/);
 assert.equal(executions,0);
 const {token,packet}=await session.capture({expected,approved:true});
 assert.equal(executions,1);
 assert.match(packet.blocks[0].text,/<markup>/);
 assert.throws(()=>session.stage({token}),/Review/);
 session.stage({token,approved:true});
 const {files,manifest}=session.build({approved:true});
 const html=files.get('pages/001.html');
 assert.match(html,/id="sample"/);
 assert.match(html,/href="001.html#sample"/);
 assert.doesNotMatch(html,/href="001.html#absent"|Hidden evidence fixture|<markup>/);
 assert.match(html,/&lt;markup&gt;/);
 assert.equal(manifest.pages[0].omitted_links.missing_fragment,1);
 assert.equal(manifest.missing[0].source_url,'https://techdocs.zebra.com/oeminfo/uncaptured/');
 const zip=Buffer.from(await mirrorZip(files).arrayBuffer());
 assert.equal(zip.readUInt32LE(0),0x04034b50);
 assert.ok(zip.includes(Buffer.from(html)));
 assert.ok(zip.includes(Buffer.from('manifest.json')));
});


test('numeric developer forum paths are exact and remain same-origin when discovered',()=>{
 const numeric='https://developer.zebra.com/forum/123456789012';
 for(const url of [numeric,numeric+'/','https://developer.zebra.com/forum/1']){
  assert.deepEqual(checkSource(url+'#topic'),{url,kind:'forum'});
 }
 for(const route of ['/forum/0','/forum/01','/forum/1234567890123','/forum/'+encodeURIComponent('１２３'),
                    '/forum/123/password','/forum/123?x=1','/forum/123//','/forum/topic']) {
  assert.throws(()=>checkSource('https://developer.zebra.com'+route));
 }
 const options={includeSameOriginLinks:true};
 const fixture=[['p',{},[
  ['a',{href:'/forum/3/'},['Accepted']],
  ['a',{href:'/forum/03'},['Excluded']],
  ['a',{href:'/forum/123/other'},['Excluded']],
  ['a',{href:'https://techdocs.zebra.com/forum/3'},['Excluded']]
 ]]];
 const result=extractFixture(fixture,options,{func:capturePage,args:[checkSource(numeric),LIMITS,options]});
 assert.deepEqual(result.discovered_links,[{target_url:'https://developer.zebra.com/forum/3/',label:'Accepted'}]);
 assert.equal(result.capture.source_url,numeric);
});

test('opt-in cell boundaries preserve literal separators and Unicode UTF-16 offsets without changing capture v1',()=>{
 const specs=[['h2',{id:'syntax'},['Syntax']],['table',{},[['tr',{},[['th',{},['字😀 | Example']],['td',{},[['p',{},['Second']],['p',{},['Line']]]]]]]]];
 const base=extractFixture(specs,undefined);
 const mapped=extractFixture(specs,{includeTableCellMap:true});
 const {captured_at:ignore1,...plain}=base,{captured_at:ignore2,...plus}=mapped.capture;
 assert.deepEqual(plus,plain);
 assert.equal(Object.hasOwn(base,'table_cell_map'),false);
 assert.equal(mapped.table_cell_map.schema_version,'zebra-table-cell-map/v1');
 const [row]=mapped.table_cell_map.rows;
 assert.equal(row.block_index,1);
 assert.deepEqual(row.cells.map(c=>mapped.capture.blocks[row.block_index].text.slice(c.start_utf16,c.end_utf16)),['字😀 | Example','Second\nLine']);
 assert.deepEqual(row.cells.map(c=>c.cell_kind),['th','td']);
 assert.equal(mapped.table_cell_map.omitted_rows,0);
});
test('table sidecar omits unsupported geometry without suggesting a cell identity',()=>{
 const span=[['table',{},[['tr',{},[['td',{colspan:'2'},['Across']],['td',{},['Other']]]]]]];
 const mapped=extractFixture(span,{includeTableCellMap:true,includeSameOriginLinks:true});
 assert.deepEqual(mapped.table_cell_map.rows,[]);
 assert.equal(mapped.table_cell_map.omitted_rows,1);
 assert.equal(mapped.capture.blocks[0].text,'Across | Other');
});
test('table adapter requires explicit approval and exact top-frame result',async()=>{
 const specs=[['table',{},[['tr',{},[['td',{},['One']],['td',{},['Two']]]]]]];
 let calls=0,mode='valid';
 const api={tabs:{query:async()=>[{id:5,url:tech}]},scripting:{executeScript:async req=>{
  calls++;
  assert.deepEqual(req.target,{tabId:5,frameIds:[0]});assert.equal(req.world,'ISOLATED');
  const result=extractFixture(specs,req.args[2],req);
  if(mode==='boundary')result.table_cell_map.rows[0].cells[1].start_utf16--;
  if(mode==='extra_wrapper')result.extra='not packed';
  if(mode==='extra_map')result.table_cell_map.extra='not packed';
  if(mode==='extra_cell')result.table_cell_map.rows[0].cells[0].extra='not packed';
  if(mode==='extra_block')result.capture.blocks[0].extra='not packed';
  if(mode==='coverage')result.table_cell_map.omitted_rows++;
  return [{frameId:mode==='frame'?1:0,result}];
 }}};
 const expected=await readActiveTab(api);
 await assert.rejects(captureTableActive(api,expected),/approval/);assert.equal(calls,0);
 assert.equal((await captureTableActive(api,expected,{approved:true})).table_cell_map.rows.length,1);
 for(const bad of ['boundary','frame','extra_wrapper','extra_map','extra_cell','extra_block','coverage']){mode=bad;await assert.rejects(captureTableActive(api,expected,{approved:true}),/Invalid/);}
});

test('forum capture requires a positive topic-body marker rather than a generic mixed node wrapper',()=>{
 const route=checkSource('https://developer.zebra.com/forum/1234');
 const isolated={func:capturePage,args:[route,LIMITS]};
 const fixtures=[['p',{},['Synthetic text.']]];
 const modern='article.node--type-forum main.forum-topic__content .forum-topic__body';
 const legacy='main article.node--type-forum .field--name-body';
 for(const selector of [modern,legacy]){
   const result=extractFixture(fixtures,undefined,isolated,selector);
   assert.equal(result.blocks[0].text,'Synthetic text.');
 }
 assert.throws(()=>extractFixture(fixtures,undefined,isolated,'main article.node--type-forum .node__content'),/No identifiable public article body/);
});

const dw66='https://techdocs.zebra.com/datawedge/6-6/guide/input/barcode/';
const sn31='https://techdocs.zebra.com/stagenow/3-1/csp/ui/';
const H=(id,title='Same heading label',tag='h2')=>[tag,{id},[title]];
const P=text=>['p',{},[text]];
const scoped=(specs,url=dw66,anchor='readerparams',rootSelector)=>extractFixture(specs,undefined,
 {func:capturePage,args:[{url,kind:'techdocs'},LIMITS,{sectionAnchor:anchor}]},rootSelector);
test('explicit native heading scope can reach beyond full-article cap without reading prior text',()=>{
 const earlier=Array.from({length:391},()=>P('Earlier baseline block'));
 const fixture=[...earlier,H('readerparams','Reader Parameters'),P('LCD Mode example'),
   H('nested','Subheading','h3'),P('Nested section still belongs'),
   H('peer','Next section'),P('Private-looking suffix api_key = '+'a'.repeat(30))];
 const full=extractFixture(fixture,undefined,{func:capturePage,args:[{url:dw66,kind:'techdocs'},LIMITS]});
 assert.equal(full.blocks.length,120);
 assert.ok(!full.blocks.some(b=>b.anchor==='readerparams'));
 const result=scoped(fixture);
 assert.deepEqual(result.capture.blocks.map(b=>b.text),['Reader Parameters','LCD Mode example','Subheading','Nested section still belongs']);
 assert.equal(result.capture.truncated,true);
 assert.deepEqual(result.section_scope,{schema_version:'zebra-section-scope/v1',heading_anchor:'readerparams',boundary:'next_heading',whole_article:false});
 assert.equal(scoped([P('api_key = '+'a'.repeat(30)),H('readerparams'),P('Visible text')]).capture.blocks.length,2);
});
test('legacy StageNow root is exact-route opt-in and first duplicate label is selected by native ID',()=>{
 const first='set-default-input-method', second='set-default-input-method-1';
 const fixture=[H(first),P('Action control'),H(second),P('Choice control')];
 assert.throws(()=>extractFixture(fixture,undefined,{func:capturePage,args:[{url:sn31,kind:'techdocs'},LIMITS]},'section#services'),/No identifiable/);
 assert.deepEqual(scoped(fixture,sn31,first,'section#services').capture.blocks.map(b=>b.text),['Same heading label','Action control']);
 assert.throws(()=>scoped(fixture,sn31,first,'.col-sm-9'),/legacy documentation/);
 assert.throws(()=>scoped(fixture,sn31.replace('3-1','3-2'),first,'section#services'),/No identifiable/);
});
test('missing, duplicate, hidden, non-heading and empty selected scopes are denied',()=>{
 for(const fixture of [[H('wrong'),P('Body')],[H('readerparams'),P('Body'),H('readerparams')],
   [H('readerparams'),P('Body'),['div',{id:'readerparams',style:{display:'none'}},[]]],
   [['h2',{id:'readerparams',style:{display:'none'}},['Hidden']],P('Body')],
   [['p',{id:'readerparams'},['Not a heading']],P('Body')],[H('readerparams'),H('peer'),P('Body')]]){
    assert.throws(()=>scoped(fixture),/native heading|not retained/);
 }
 assert.throws(()=>scoped([H('readerparams'),P('Body')],tech),/versioned public/);
 assert.equal(scoped([H('readerparams'),...Array.from({length:140},()=>P('Body'))]).section_scope.boundary,'capture_limit');
});
test('section adapter requires exact explicit page, heading and safe result',async()=>{
 const expected={tabId:31, source:checkSource(dw66),sectionAnchor:'readerparams'};
 const options={approved:true,sectionAnchor:'readerparams'};
 let calls=0;
 const api={tabs:{query:async()=>[{id:31,url:dw66}]},scripting:{executeScript:async request=>{
    ++calls;
    assert.deepEqual(request.target,{tabId:31,frameIds:[0]});
    assert.equal(request.world,'ISOLATED');
    assert.deepEqual(request.args,[expected.source,LIMITS,{sectionAnchor:'readerparams'}]);
    return [{frameId:0,result:scoped([H('readerparams'),P('Body')])}];
 }}};
 await assert.rejects(captureSectionActive(api,expected,{}));
 await assert.rejects(captureSectionActive(api,expected,{...options,sectionAnchor:'peer'}));
 await assert.rejects(captureSectionActive(api,{...expected,tabId:32},options));
 assert.equal(calls,0);
 assert.equal((await captureSectionActive(api,expected,options)).section_scope.boundary,'article_end');
 assert.equal(calls,1);
 const packet=scoped([H('readerparams'),P('Body')]);
 api.scripting.executeScript=async()=>[{frameId:0,result:{...packet,capture:{...packet.capture,truncated:false}}}];
 await assert.rejects(captureSectionActive(api,expected,options));
});

test('headings owned by a table cell cannot masquerade as native section boundaries',()=>{
 const table=['table',{},[['tbody',{},[['tr',{},[['td',{},[H('cell-heading','Cell label'),P('Still in this cell')]]]]]]]];
 const quote=['blockquote',{},[H('quote-heading','Quoted heading'),P('Still in this quote')]];
 const fixture=[H('readerparams','Reader Parameters'),table,quote,P('Article body after nested headings'),H('peer'),P('Outside section')];
 const result=scoped(fixture);
 assert.equal(result.section_scope.boundary,'next_heading');
 assert.ok(result.capture.blocks.some(b=>b.kind==='table_row'&&b.text.includes('Still in this cell')));
 assert.ok(result.capture.blocks.some(b=>b.text==='Article body after nested headings'));
 assert.ok(!result.capture.blocks.some(b=>b.text==='Outside section'||b.anchor==='peer'));
 for(const id of ['cell-heading','quote-heading'])assert.throws(()=>scoped(fixture,dw66,id),/unique visible native heading/);
});

test('real scoped serializer envelope reaches classroom intake despite a quoted peer-rank heading',async()=>{
 const {intake}=await import('../../../capture-intake.cjs');
 const forum={schema_version:SCHEMA,source_url:'https://developer.zebra.com/content/example-fixture',
  source_kind:'forum',captured_at:'2026-11-19T04:00:00.000Z',title:'Fixture question',
  blocks:[{kind:'paragraph',text:'Which option applies to the scope?'}],truncated:false};
 const result=scoped([H('readerparams','Reader Parameters'),
  ['blockquote',{},[H('quote-heading','Quoted heading'),P('Still in this quote')]],P('Retained prose'),
  H('peer','Next real heading'),P('Out of scope')]);
 assert.ok(result.capture.blocks.some(b=>b.kind==='quote'&&b.anchor==='quote-heading'));
 assert.ok(!result.capture.blocks.some(b=>b.anchor==='peer'));
 const input=intake({forum,techdocs:JSON.parse(JSON.stringify(result))});
 assert.equal(input.capture_binding.captures[1].section_scope.boundary,'next_heading');
 assert.equal(input.stage,'CAPTURE_REVIEW_REQUIRED');
 assert.equal(input.downstream_adapter.apply_allowed,false);
 assert.equal(input.release.publication,false);
});
