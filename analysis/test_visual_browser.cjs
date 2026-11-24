"use strict";
/* Real Chromium interaction smoke test, using a local copy of the existing page.
 * No model, campus endpoint, or public-source fetch is invoked.
 */
const fs=require("node:fs"),os=require("node:os"),path=require("node:path"),assert=require("node:assert/strict");
const {spawnSync}=require("node:child_process"),{pathToFileURL}=require("node:url");
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"zebra-vision-"));
const source=path.join(__dirname,"../classroom");
const browser=process.env.BROWSER_EXECUTABLE||"google-chrome";
const harness=String.raw`
<script>
(()=>{
 const $test=id=>document.getElementById(id);
 const ensure=(condition,message)=>{if(!condition)throw Error(message)};
 const click=selector=>{const node=document.querySelector(selector);ensure(node,"Missing "+selector);ensure(!node.disabled,"Disabled "+selector);node.click()};
 const next=()=>document.querySelector(".vision-next").textContent;
 const choose=(field,value)=>click('[data-vision-field="'+field+'"][data-vision-value="'+value+'"]');
 const report=()=>Array.from(document.querySelectorAll("#visionOutput button")).find(b=>b.textContent==="Use as reported context for next answer");
 try{
  ensure(last.visual_guidance.kind==="scan_prerequisite","Initial scan visual missing");
  ensure(next().includes("Inspect the active profile"),"Initial gate is not profile");
  choose("profile","enabled");ensure(next().includes("Check scanner status"),"Profile selection did not advance gate");
  choose("scanner","busy");ensure(next().includes("busy state"),"Busy branch absent");
  ensure($test("context").value==="","Hypothetical scenario leaked into model context");
  ensure(last.visual_guidance.observation_status==="hypothetical_or_unverified","Scenario falsely reported");
  ensure(report().disabled,"Unconfirmed report action enabled");
  click('#visionOutput input[type="checkbox"]');
  ensure(!report().disabled,"Confirmed observation cannot transfer");
  report().click();
  ensure($test("context").value.includes("scanner busy at command time"),"Reported context not transferred");
  ensure(last.plan.context===$test("context").value,"Current answer plan did not receive report");
  ensure(last.visual_guidance.observation_status==="user_reported_not_verified","Receipt missing report status");
  choose("scanner","ready");
  ensure(!$test("context").value.includes("scanner busy"),"Stale report remained after changed conditions");
  ensure(next().includes("success is not established"),"Ready branch implies success or missing next action");
  ensure(last.visual_guidance.observation_status==="hypothetical_or_unverified","New scenario not reset");
  click("#loadExample");
  ensure(last.visual_guidance.kind==="result_discrepancy","Parameter comparison not opened");
  click('[data-vision-node="overview"]');
  ensure(document.querySelector(".vision-inspector").textContent.includes("RECEIVE_RESULT"),"Overview quote not shown");
  click('[data-vision-node="prototype"]');
  ensure(document.querySelector(".vision-inspector").textContent.includes("SEND_RESULT"),"Prototype quote not shown");
  ensure(next().includes("Do not choose"),"Unresolved result-code decision lost");
  click("#loadUnknown");ensure(last.visual_guidance.kind==="scope_required","Missing version not blocked");
  ensure(!document.querySelector(".vision-quote"),"Out-of-scope source shown");
  click("#loadPrereq");ensure(last.visual_guidance.kind==="scan_prerequisite","Preset did not rebuild visual");
  const flow=document.querySelector(".vision-flow");
  ensure(flow.getBoundingClientRect().height>60,"Graph not visible");
  ensure(document.documentElement.scrollWidth<=window.innerWidth+3,"Horizontal page overflow");
  $test("version").value="15.0";$test("version").dispatchEvent(new Event("input",{bubbles:true}));
  ensure(last===null&&$test("download").hidden,"Stale receipt remains exportable");
  ensure(window.__visionFetches===0,"Offline UI attempted network fetch");
  document.documentElement.dataset.visionSmoke="pass";
 }catch(e){
  document.documentElement.dataset.visionSmoke="fail";
  const err=document.createElement("pre");err.id="vision-smoke-error";err.textContent=String(e.stack||e.message);document.body.append(err);
 }
})();
</script>
`;
try{
 for(const file of ["guidance-planner.js","guidance-intake.js","guidance-visual.js"])fs.copyFileSync(path.join(source,file),path.join(dir,file));
 const html=fs.readFileSync(path.join(source,"answer-guidance.html"),"utf8")
  .replace('<script src="guidance-planner.js">','<script>window.__visionFetches=0;window.fetch=()=>{window.__visionFetches++;throw Error("Unexpected network fetch")};</script><script src="guidance-planner.js">')
  .replace("</body>",harness+"</body>");
 const page=path.join(dir,"smoke.html");fs.writeFileSync(page,html);
 for(const [label,size] of [["desktop","1280,1000"],["narrow","500,950"]]){
  const run=spawnSync(browser,["--headless","--no-sandbox","--disable-dev-shm-usage","--disable-background-networking","--no-first-run","--disable-gpu","--allow-file-access-from-files","--virtual-time-budget=3000","--window-size="+size,"--user-data-dir="+path.join(dir,label),"--dump-dom",pathToFileURL(page).href],{encoding:"utf8",timeout:45000,maxBuffer:4000000});
  if(run.error)throw run.error;
  const dom=run.stdout||"",error=dom.match(/<pre id="vision-smoke-error">([\s\S]*?)<\/pre>/);
  assert.equal(run.status,0,run.stderr?.slice(-1500));
  assert.match(dom,/<html[^>]*data-vision-smoke="pass"/,error?.[1]||"No browser pass marker: "+dom.slice(-800));
  console.log("PASS Chromium "+label+": interactive map, controls, quote inspector, report consent, stale-result rejection, no network, and page width");
 }
}finally{fs.rmSync(dir,{recursive:true,force:true})}
