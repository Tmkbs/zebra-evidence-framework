"use strict";
/* Actual Chromium encoder and decoder test, using only local repository
 * files and loopback CDP. The sample clip is a public-report explainer.
 */
const fs=require("node:fs"),os=require("node:os"),path=require("node:path"),assert=require("node:assert/strict");
const {spawn}=require("node:child_process"),{pathToFileURL}=require("node:url");
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"zebra-video-"));
const root=path.join(__dirname,"../classroom"),browser=process.env.BROWSER_EXECUTABLE||"google-chrome";
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,timeout=10000){
 const start=Date.now();while(Date.now()-start<timeout){const v=await fn();if(v)return v;await sleep(100)}
 throw Error("Timed out waiting for browser state");
}
function cdp(url){
 return new Promise((resolve,reject)=>{
  const ws=new WebSocket(url);let next=0;const pending=new Map();
  const fail=e=>{for(const p of pending.values()){clearTimeout(p.timer);p.reject(e)}pending.clear()};
  ws.addEventListener("error",()=>{const e=Error("CDP connection failed");fail(e);reject(e)});
  ws.addEventListener("close",()=>fail(Error("CDP disconnected")));
  ws.addEventListener("message",e=>{const msg=JSON.parse(e.data),p=pending.get(msg.id);if(!p)return;pending.delete(msg.id);clearTimeout(p.timer);msg.error?p.reject(Error(msg.error.message)):p.resolve(msg.result)});
  ws.addEventListener("open",()=>resolve({close:()=>ws.close(),send(method,params={}){
   return new Promise((resolve,reject)=>{const id=++next,timer=setTimeout(()=>{pending.delete(id);reject(Error("CDP timeout: "+method))},80000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params}))})
  }}),{once:true});
 });
}
const trap='<script>window.__remoteCalls=0;const nativeFetch=window.fetch.bind(window);window.fetch=(u,o)=>{if(String(u).startsWith("blob:"))return nativeFetch(u,o);window.__remoteCalls++;throw Error("Unexpected network fetch")};</script>';
let child=null,connection=null,stderr="";
async function main(){
 for(const f of ["answer-strategies.js","guidance-planner.js","guidance-intake.js","guidance-visual.js","guidance-storyboard.js","guidance-team-bridge.js"])fs.copyFileSync(path.join(root,f),path.join(dir,f));
 for(const f of ["answer-guidance.html","visual-companion.html"])fs.writeFileSync(path.join(dir,f),fs.readFileSync(path.join(root,f),"utf8").replace("</head>",trap+"</head>"));
 const profile=path.join(dir,"chrome-profile");
 child=spawn(browser,["--headless=new","--no-sandbox","--disable-dev-shm-usage","--disable-background-networking","--disable-background-timer-throttling","--disable-renderer-backgrounding","--no-first-run","--mute-audio","--autoplay-policy=no-user-gesture-required","--allow-file-access-from-files","--remote-debugging-port=0","--user-data-dir="+profile,"about:blank"],{stdio:["ignore","ignore","pipe"]});
 child.stderr.on("data",b=>{stderr=(stderr+b.toString()).slice(-2400)});
 let launchError;child.once("error",e=>launchError=e);
 const port=await until(()=>{if(launchError)throw launchError;if(child.exitCode!==null)throw Error("Chromium exited: "+stderr);try{return Number(fs.readFileSync(path.join(profile,"DevToolsActivePort"),"utf8").split("\n")[0])}catch{return 0}},15000);
 const pages=await (await fetch("http://127.0.0.1:"+port+"/json/list")).json();
 const page=pages.find(x=>x.type==="page");assert.ok(page?.webSocketDebuggerUrl,"Chromium page unavailable");
 connection=await cdp(page.webSocketDebuggerUrl);
 const send=(m,p)=>connection.send(m,p);
 async function evaluate(expression){const r=await send("Runtime.evaluate",{expression,awaitPromise:true,returnByValue:true,userGesture:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result?.value}
 async function navigate(name,query="",ready="document.readyState==='complete'"){
  await send("Page.navigate",{url:pathToFileURL(path.join(dir,name)).href+query});
  await until(async()=>{try{return await evaluate("location.pathname.endsWith("+JSON.stringify("/"+name)+")&&("+ready+")")}catch{return false}});
 }
 await send("Page.enable");await send("Runtime.enable");
 await navigate("visual-companion.html","?reader=dw62-intent-receiver","typeof record!=='undefined'&&!!record");
 assert.equal(await evaluate("Boolean(ZebraStoryboard.videoSupport(document))"),true);
 assert.equal(await evaluate("document.querySelector('.story-video').hidden"),false);
 assert.equal(await evaluate("!!document.querySelector('.story-video-output video')"),false);
 // Explicit cancellation before an artifact exists.
 await evaluate("document.querySelector('[data-story-video=create]').click();document.querySelector('[data-story-video=cancel]').click();true");
 await until(()=>evaluate("document.querySelector('[data-story-video=cancel]').hidden&&!document.querySelector('[data-story-video=create]').disabled"));
 assert.equal(await evaluate("!!document.querySelector('.story-video-output video')"),false);
 // Actually encode the full-length public pilot from the existing user interface.
 await evaluate("document.querySelector('[data-story-video=create]').click();true");
 await until(async()=>{
  const state=await evaluate("({ready:!!document.querySelector('.story-video-output video'),busy:!document.querySelector('[data-story-video=cancel]').hidden,status:document.querySelector('.story-video [role=status]').textContent})");
  if(!state.busy&&!state.ready)throw Error("Video UI: "+state.status);return state.ready;
 },65000);
 const encoded=await evaluate("(async()=>{const v=document.querySelector('.story-video-output video');const wait=ms=>new Promise(r=>setTimeout(r,ms));for(let i=0;i<100&&v.readyState<2;i++)await wait(80);if(v.readyState<2)throw Error('Encoded preview cannot decode');v.muted=true;await v.play();await wait(700);const time=v.currentTime;v.pause();const blob=await fetch(v.src).then(r=>r.blob());const link=document.querySelector('.story-video-output a[download$=json]');const receipt=await fetch(link.href).then(r=>r.json());const data=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(blob)});return {data,receipt,width:v.videoWidth,height:v.videoHeight,time,remote:window.__remoteCalls}})()");
 const bytes=Buffer.from(encoded.data.split(",")[1],"base64");
 assert.equal(bytes.subarray(0,4).toString("hex"),"1a45dfa3");assert.ok(bytes.length>10000);
 assert.equal(encoded.width,1280);assert.equal(encoded.height,720);assert.ok(encoded.time>0.1,"Preview did not play");
 assert.equal(encoded.remote,0);assert.equal(encoded.receipt.video_file,true);assert.equal(encoded.receipt.bytes,bytes.length);
 assert.equal(encoded.receipt.kind,"reported_path_comparison");assert.equal(encoded.receipt.device_recording,false);
 assert.equal(encoded.receipt.model_calls,0);assert.equal(encoded.receipt.remote_media_loaded,false);
 assert.ok(encoded.receipt.total_duration_ms>=22000&&encoded.receipt.total_duration_ms<=60000);
 assert.ok(encoded.receipt.frames.some(f=>f.evidence.some(e=>e.origin==="public_forum_report")));
 // Retain a real full-length sample and the matching receipt for reviewer inspection.
 const output=path.join(__dirname,"../qa-output/contextual-video");fs.mkdirSync(output,{recursive:true});
 fs.writeFileSync(path.join(output,"dw62-visual-explainer.webm"),bytes);
 fs.writeFileSync(path.join(output,"dw62-visual-explainer-sources.json"),JSON.stringify(encoded.receipt,null,2)+"\n");
 console.log("PASS full-length browser WebM: "+bytes.length+" bytes, "+encoded.width+"x"+encoded.height+", decoded playback "+encoded.time.toFixed(2)+"s");
 // Reuse the identical encoder for a different evidence-backed concept.
 await navigate("answer-guidance.html","","typeof last!=='undefined'&&!!last");
 await evaluate("document.getElementById('loadConcept').click();true");
 const concept=await evaluate("(async()=>{const r=await ZebraStoryboard.renderClip(last.visual_guidance,{doc:document,frameMs:450});return {bytes:r.blob.size,kind:r.receipt.kind,file:r.receipt.video_file,scope:r.receipt.source_links,remote:window.__remoteCalls}})()");
 assert.ok(concept.bytes>1000);assert.equal(concept.kind,"profile_learning");assert.equal(concept.file,true);
 assert.ok(concept.scope.includes("https://techdocs.zebra.com/datawedge/15-0/guide/profiles/"));assert.equal(concept.remote,0);
 await evaluate("document.getElementById('loadUnknown').click();true");
 assert.equal(await evaluate("document.querySelector('.story-video').hidden"),true);
 assert.equal(await evaluate("!!document.querySelector('.story-video-output video')"),false);
 console.log("PASS concept renderer reuse and unsupported-question video gate");
}
main().catch(e=>{console.error(e.stack||e);console.error(stderr);process.exitCode=1}).finally(async()=>{
 // Ask Chrome to close cleanly before closing the CDP connection.
 if(connection){try{await Promise.race([connection.send("Browser.close"),sleep(1800)])}catch{}connection.close()}
 if(child&&child.exitCode===null){
  await Promise.race([new Promise(resolve=>child.once("exit",resolve)),sleep(1200)]);
  if(child.exitCode===null){child.kill("SIGTERM");await Promise.race([new Promise(resolve=>child.once("exit",resolve)),sleep(1500)])}
  if(child.exitCode===null){child.kill("SIGKILL");await Promise.race([new Promise(resolve=>child.once("exit",resolve)),sleep(1200)])}
 }
 // The media assertions above still fail the test. A transient OS cleanup
 // race after a successful test is reported separately, not as a codec failure.
 try{await fs.promises.rm(dir,{recursive:true,force:true,maxRetries:8,retryDelay:200})}
 catch(e){if(!["ENOTEMPTY","EBUSY","EPERM"].includes(e.code))throw e;console.warn("Chromium temporary profile cleanup deferred:",e.code)}
});
