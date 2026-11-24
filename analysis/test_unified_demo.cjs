"use strict";
const fs=require("node:fs"),os=require("node:os"),path=require("node:path"),assert=require("node:assert/strict");
const {spawnSync}=require("node:child_process"),{pathToFileURL}=require("node:url");
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"zebra-unified-demo-")),root=path.join(__dirname,"../classroom");
const harness=String.raw`
<script>
(async()=>{
 const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 const ensure=(value,message)=>{if(!value)throw Error(message)};
 const active=()=>document.querySelector('[role=tab][aria-selected=true]').dataset.tab;
 const doc=stage=>document.getElementById("frame-"+stage).contentDocument;
 async function ready(stage,selector){
  for(let i=0;i<100;i++){try{const d=doc(stage);if(d?.querySelector(selector))return d}catch{}await wait(40)}
  throw Error("Frame unavailable: "+stage+" "+selector)
 }
 try{
  ensure(active()==="overview","Initial overview missing");
  ensure(!document.getElementById("frame-visual").hasAttribute("src"),"Visual eagerly loaded");
  ensure(!document.getElementById("frame-guide").hasAttribute("src"),"Guide eagerly loaded");
  document.getElementById("tab-visual").click();
  const v=await ready("visual",'[data-story-hotspot="test"]');
  ensure(active()==="visual","Visual tab not active");
  v.querySelector('[data-story-hotspot="test"]').dispatchEvent(new v.defaultView.MouseEvent("click",{bubbles:true}));
  ensure(v.querySelector(".story-info").textContent.includes("Archived public forum self-report"),"Original visual component not interactive");
  v.getElementById("ask").click();
  const g=await ready("guide","#teamNotice:not([hidden])");
  ensure(active()==="guide","Embedded Continue link did not switch the shell");
  ensure(g.getElementById("version").value==="","Historical version was assumed");
  ensure(g.getElementById("question").value.includes("ADB"),"Historical question missing");
  g.getElementById("loadConcept").click();
  ensure(g.querySelector('#mediaOutput:not([hidden])'),"Existing concept lesson unavailable");
  document.getElementById("tab-visual").click();
  ensure(doc("visual")===v,"Switching tabs reloaded the visual component");
  ensure(document.documentElement.scrollWidth<=innerWidth+3,"Shell overflows page width");
  ensure(!document.getElementById("panel-visual").hidden&&document.getElementById("panel-guide").hidden,"Hidden panels inconsistent");
  document.documentElement.dataset.unifiedSmoke="pass";
 }catch(e){document.documentElement.dataset.unifiedSmoke="fail";const pre=document.createElement("pre");pre.id="smoke-error";pre.textContent=e.stack||e.message;document.body.append(pre)}
})();
</script>
`;
try{
 for(const name of ["visual-companion.html","answer-guidance.html","guidance-planner.js","guidance-intake.js","guidance-visual.js","guidance-storyboard.js","guidance-team-bridge.js"])fs.copyFileSync(path.join(root,name),path.join(dir,name));
 const file=path.join(dir,"demo.html");fs.writeFileSync(file,fs.readFileSync(path.join(root,"demo.html"),"utf8").replace("</body>",harness+"</body>"));
 for(const [name,size] of [["desktop","1280,1000"],["narrow","500,900"]]){
  const r=spawnSync(process.env.BROWSER_EXECUTABLE||"google-chrome",["--headless","--no-sandbox","--disable-dev-shm-usage","--disable-background-networking","--no-first-run","--disable-gpu","--allow-file-access-from-files","--virtual-time-budget=12000","--window-size="+size,"--user-data-dir="+path.join(dir,name),"--dump-dom",pathToFileURL(file).href],{encoding:"utf8",timeout:45000,maxBuffer:4000000});
  if(r.error)throw r.error;assert.equal(r.status,0,r.stderr?.slice(-1500));const dom=r.stdout||"";
  assert.ok(/<html[^>]*data-unified-smoke="pass"/.test(dom),dom.match(/<pre id="smoke-error">([\s\S]*?)<\/pre>/)?.[1]||dom.slice(-800));
  console.log("PASS unified "+name+": one entry, lazy local views, original interactions and reader-to-guide handoff");
 }
}finally{fs.rmSync(dir,{recursive:true,force:true})}
