const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const {createHash} = require('node:crypto');
const {chromium} = require('playwright');
const hash = v=>createHash('sha256').update(v).digest('hex');
const data=v=>Buffer.from(JSON.stringify(v));
(async()=>{
 const {captureDigest}=await import('./approved-revision-archive.mjs');
 const {archiveCheckReceiptText,assembleSelectedArchive}=await import('./reviewed-archive-portable.mjs');
 const doc={schema_version:'zebra-doc-capture/v1',source_url:'https://techdocs.zebra.com/emdk-for-android/7-3/samples/barcode/',
  source_kind:'techdocs',captured_at:'2026-11-19T00:00:00.000Z',title:'Synthetic Doc',
  blocks:[{kind:'paragraph',text:'Synthetic original text.',anchor:'para-1'}],truncated:false};
 const question={...doc,source_url:'https://developer.zebra.com/forum/25083',source_kind:'forum',title:'Synthetic Question',
  blocks:[{kind:'paragraph',text:'Test fixture only.'}]};
 const wrap=capture=>data({schema_version:'zebra-reviewed-mirror-page/v1',capture,discovered_links:[],link_discovery:'unknown'});
 const baseline=Buffer.from('<article><p id="para-1">Synthetic original text.</p></article>');
 const workingCopy=Buffer.from('<article><p id="para-1">Synthetic original text.</p><p id="proposal">Example.</p></article>');
 const identity={case_id:'SYNTHETIC-BROWSER',run_id:'CAPTURE-'+'d'.repeat(24),source_url:doc.source_url,source_anchor:'para-1',target_anchor:'proposal',
  source_version:'7-3',source_sha256:hash(baseline),paragraph_sha256:'1'.repeat(64),operation_sha256:'2'.repeat(64),
  working_copy_sha256:hash(workingCopy),capture_sha256:await captureDigest(doc)};
 const grant=data({schema:'zebra-local-archive-overlay-grant/v1',scope:'LOCAL_INERT_ARCHIVE_ONLY',...identity,archive_text:'Example with <literal>.'});
 const trustPin=hash(grant);
 const pairBytes=data({schema:'zebra-local-case-source-pair/v1',scope:'LOCAL_INERT_ARCHIVE_ONLY',case_id:identity.case_id,run_id:identity.run_id,
  grant_sha256:trustPin,forum_url:question.source_url,forum_capture_sha256:await captureDigest(question),techdocs_url:doc.source_url,techdocs_capture_sha256:identity.capture_sha256});
 const pairPin=hash(pairBytes);
 const receipt=data({schema:'zebra-bound-typed-copy/v1',...identity,publication:'NOT_AUTHORIZED',model_execution:'NOT_RUN',original_modified:false,write_performed:false});
 const fixtures={forum:wrap(question),techdocs:wrap(doc),baseline,workingCopy,grant,pairBytes,receipt};
 const expected=await assembleSelectedArchive({...fixtures,trustPin,pairPin});
 const allow=new Set(['reviewed-archive.html','reviewed-archive-page.mjs','reviewed-archive-portable.mjs','approved-revision-archive.mjs','reviewed-pair.mjs',
  'archive-bytes.mjs','engine.js','zip.js','capture.js'].map(name=>'extension/'+name));
 const server=http.createServer((req,res)=>{
  const f=req.url?.slice(1);
  if(req.method!=='GET'||!allow.has(f)){res.writeHead(404);res.end();return;}
  res.setHeader('Content-Type',f.endsWith('.html')?'text/html; charset=utf-8':'text/javascript; charset=utf-8');
  res.end(fs.readFileSync(path.join(__dirname,f)));
 });
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 let browser;
 try{
  const origin='http://127.0.0.1:'+server.address().port;
  browser=await chromium.launch({executablePath:process.env.CHROMIUM||'/usr/bin/chromium',headless:true});
  const page=await browser.newPage({acceptDownloads:true});
  const outside=[],errors=[],late=[];
  await page.route('**/*',r=>{
    if(!r.request().url().startsWith(origin+'/')){outside.push(r.request().url());return r.abort();}
    return r.continue();
  });
  let submitted=false;
  page.on('request',req=>{if(submitted)late.push(req.url());});
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/extension/reviewed-archive.html',{waitUntil:'load'});
  await page.locator('button').waitFor();
  const set=(name,buffer)=>page.locator(`[name=${name}]`).setInputFiles({name:name+'.txt',mimeType:'text/plain',buffer});
  for(const [k,v] of Object.entries(fixtures))await set(k,v);
  await page.locator('[name=trustPin]').fill(trustPin);
  await page.locator('[name=pairPin]').fill('0'.repeat(64));
  const submit=()=>page.getByRole('button',{name:'Build ZIP'}).click();
  const waitFail=()=>page.getByText('ZIP was not generated.',{exact:false}).waitFor();
  const archive=page.getByRole('link',{name:'Download reviewed ZIP'});
  const receiptLink=page.getByRole('link',{name:'Download ZIP check receipt'});
  submitted=true;await submit(); await waitFail();assert.equal(await archive.count(),0);assert.equal(await receiptLink.count(),0);
  await page.locator('[name=pairPin]').fill(pairPin);
  await submit();
  await archive.waitFor();
  assert.match(await page.getByRole('status').textContent(),new RegExp(expected.report.archive_hash));
  const [download]=await Promise.all([page.waitForEvent('download'),archive.click()]);
  const downloaded=fs.readFileSync(await download.path());
  assert.deepEqual(downloaded,Buffer.from(expected.buffer));
  const [receiptDownload]=await Promise.all([page.waitForEvent('download'),receiptLink.click()]);
  assert.equal(fs.readFileSync(await receiptDownload.path(),'utf8'),archiveCheckReceiptText(expected.report));
  if(process.env.ZEBRA_BROWSER_SMOKE_ZIP)fs.writeFileSync(process.env.ZEBRA_BROWSER_SMOKE_ZIP,downloaded,{mode:0o600});
  await set('forum',wrap({...question,blocks:[{kind:'paragraph',text:'Changed synthetic question.'}]}));
  assert.equal(await archive.count(),0);assert.equal(await receiptLink.count(),0);
  await submit(); await waitFail();assert.equal(await archive.count(),0);assert.equal(await receiptLink.count(),0);
  assert.deepEqual(outside,[]);assert.deepEqual(errors,[]);assert.deepEqual(late,[]);
  console.log(JSON.stringify({browser:browser.version(),sha256:hash(downloaded),members:expected.report.member_count,equal_to_shared_runtime:true,
   wrong_pair_rejected:true,changed_forum_rejected:true,download_invalidated_on_edit:true,post_submit_requests:0,extension_installed:false,sources:'synthetic capture fixtures'},null,2));
 }finally{if(browser)await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
