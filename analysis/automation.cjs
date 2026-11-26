"use strict";
// Batch answer guidance and source-bound narrated clips. No network by default.
const fs=require("node:fs"),fsp=require("node:fs/promises"),path=require("node:path"),os=require("node:os"),crypto=require("node:crypto");
const {execFile}=require("node:child_process"),{promisify}=require("node:util");
const runFile=promisify(execFile);
const P=require("../classroom/guidance-planner.js"),I=require("../classroom/guidance-intake.js"),V=require("../classroom/guidance-visual.js"),S=require("../classroom/guidance-storyboard.js"),T=require("../classroom/guidance-team-bridge.js"),G=require("./answer-guidance.cjs");
function offline(input){
 const initial=P.prepare({...input,action:"plan"}),packet=I.offlineEvidence(initial);
 return {schema:"zebra-offline-handoff/v1",mode:packet.mode,plan:P.withEvidence(initial,packet.cards),offline_evidence:packet,model_attempts:0,model_runs_completed:0,device_tested:false,quality_improvement_measured:false};
}
function narration(result,{readerKey=""}={}){
 let map;
 if(readerKey){map=T.graph(readerKey);if(!map)throw Error("Unknown reviewed reader reference");}
 else map=V.graph(result.plan,result);
 // Raw user question is not a technical fact, and must not be narrated or
 // republished. The other node descriptions are the reviewed visual template.
 map={...map,nodes:map.nodes.map(n=>n.id==="question"?{...n,detail:"The question asks about the two parameter names in the same documentation edition. Inspect both source passages separately."}:n)};
 const clip=S.videoPlan(map);
 if(!clip)return null;
 const frames=clip.frames.map(f=>({id:f.id,title:f.title,narration:f.caption,evidence:f.evidence,status:f.status}));
 return {schema:"zebra-narrated-clip-plan/v1",kind:clip.kind,title:clip.title,scene:clip.scene,frames,columns:map.columns,
  diagram_nodes:map.nodes.map(n=>({id:n.id,title:n.title,caption:n.caption})),source_links:clip.source_links,
  scope:readerKey?"Archived public self-report and team summary, not a device reproduction.":"Reviewed source-linked conceptual explanation, not a device reproduction.",
  provenance:readerKey?"reviewed_public_report":Array.isArray(result.sources)?"retrieved_matching_excerpts":"checked_source_cards",
  next_check:map.next.text,model_generated:false,device_tested:false,quality_improvement_measured:false};
}
async function renderNarrated(clip){
 if(!clip||clip.schema!=="zebra-narrated-clip-plan/v1")throw Error("No supported reviewed visual explanation matches this question and edition");
 const dir=await fsp.mkdtemp(path.join(os.tmpdir(),"zebra-narrated-"));
 try{
  const plan=path.join(dir,"plan.json");await fsp.writeFile(plan,JSON.stringify(clip,null,2));
  const python=process.env.ZEBRA_PYTHON||(process.platform==="win32"?"python":"python3");
  await runFile(python,[path.join(__dirname,"render_narrated_clip.py"),plan,dir],{timeout:120000,maxBuffer:1024*1024,windowsHide:true});
  const [video,captions,raw]=await Promise.all([fsp.readFile(path.join(dir,"clip.mp4")),fsp.readFile(path.join(dir,"clip.vtt"),"utf8"),fsp.readFile(path.join(dir,"receipt.json"),"utf8")]);
  const receipt=JSON.parse(raw),sha=crypto.createHash("sha256").update(video).digest("hex");
  if(!receipt.decoded_audio_and_video||receipt.bytes!==video.length||receipt.video_sha256!==sha||video.length>12*1024*1024)throw Error("Generated media failed verification");
  return {video,captions,receipt};
 }catch(e){throw Error("Narrated rendering failed: "+String(e.stderr||e.message).trim().slice(-450))}
 finally{await fsp.rm(dir,{recursive:true,force:true})}
}
function approvedForum(url){
 try{const u=new URL(url);return u.protocol==="https:"&&["developer.zebra.com","community.zebra.com","stackoverflow.com"].includes(u.hostname)&&!u.username&&!u.password&&!u.port&&!u.search}catch{return false}
}
function caseInput(raw,index){
 if(!raw||typeof raw!=="object"||Array.isArray(raw))throw Error("Expected a case object");
 const id=raw.case_id||"row-"+(index+1);
 if(typeof id!=="string"||!/^[A-Za-z0-9_-]{1,100}$/.test(id))throw Error("Invalid case ID");
 return {...raw,case_id:id};
}
function summarize(records){
 const counts={total:records.length,processed:0,review_required:0,failed:0,clarification_required:0,model_attempts:0,model_runs_completed:0,paired_runs:0,rendered_clips:0,selected_strategy_counts:{}};
 for(const r of records){
  if(r.status==="processed")counts.processed++;
  else if(r.status==="review_required")counts.review_required++;
  else counts.failed++;
  const o=r.result;if(!o)continue;
  if(o.plan.state==="clarification_required")counts.clarification_required++;
  counts.model_attempts+=o.model_attempts||0;counts.model_runs_completed+=o.model_runs_completed||0;
  if(o.pair_valid)counts.paired_runs++;
  if(r.video?.status==="rendered")counts.rendered_clips++;
  for(const s of o.plan.strategies||[])counts.selected_strategy_counts[s.id]=(counts.selected_strategy_counts[s.id]||0)+1;
 }
 return counts;
}
async function runBatch(cases,{mode="offline",live=false,cfg,request=fetch,videos=false,outDir,render=renderNarrated}={}){
 if(!Array.isArray(cases)||!cases.length||cases.length>200)throw Error("Supply 1–200 cases");
 if(!["offline","evidence","compare"].includes(mode)||mode!=="offline"&&!live)throw Error("Network/model work requires explicit live mode");
 if(videos&&!outDir)throw Error("Video output directory required");
 if(outDir)await fsp.mkdir(outDir,{recursive:true});
 const records=[],seen=new Set(),clips=new Map();
 for(let i=0;i<cases.length;i++){
  let id="row-"+(i+1);
  try{
   const raw=caseInput(cases[i],i);id=raw.case_id;
   if(seen.has(id.toLowerCase()))throw Error("Duplicate case ID");
   seen.add(id.toLowerCase());
   // Imported case notes are not verified original questions. They may never
   // silently become live/held-out evaluation inputs.
   if(raw.question_status==="missing_original_question"||!raw.question||mode!=="offline"&&!(raw.origin_verified===true&&raw.public_only===true&&approvedForum(raw.forum_url))){
    records.push({case_id:id,status:"review_required",reason:"Confirm the original public question, provenance, approved content and applicable edition before evaluation."});continue;
   }
   const result=mode==="offline"?offline(raw):await G.run({...raw,action:mode},cfg,request);
   const r={case_id:id,status:"processed",input_origin:raw.origin_verified===true?"operator_confirmed_public_question":"unverified_or_development_input",evaluation_eligible:false,result};
   if(videos){
    const clip=narration(result,{readerKey:raw.reader_key||""});
    if(!clip)r.video={status:"not_generated",reason:"No reviewed visual template matches the available evidence."};
    else{
     // The reviewed narration omits raw user text. Reuse identical clips.
     const key=crypto.createHash("sha256").update(JSON.stringify(clip)).digest("hex");
     if(clips.has(key))r.video={...clips.get(key),reused:true};
     else try{
      const rendered=await render(clip),name="clip-"+key.slice(0,16);
      await Promise.all([fsp.writeFile(path.join(outDir,name+".mp4"),rendered.video),fsp.writeFile(path.join(outDir,name+".vtt"),rendered.captions),fsp.writeFile(path.join(outDir,name+".json"),JSON.stringify(rendered.receipt,null,2)+"\n")]);
      r.video={status:"rendered",file:name+".mp4",captions:name+".vtt",receipt:name+".json",kind:clip.kind,duration_seconds:rendered.receipt.duration_seconds};clips.set(key,r.video);
     }catch(e){r.video={status:"failed",reason:String(e.message).slice(0,500)}}
    }
   }
   records.push(r);
  }catch(e){records.push({case_id:id,status:"failed",reason:String(e.message).slice(0,300)})}
 }
 return {schema:"zebra-batch-receipt/v1",mode,records,summary:summarize(records),pattern_validation:"not_performed",quality_improvement_measured:false,device_tested:false,
  scope:"Counts reflect execution and rule selection, not independent support, semantic correctness, or held-out evaluation."};
}
async function main(argv){
 const opts={mode:"offline",live:false,videos:false};
 for(let i=0;i<argv.length;i++){
  const a=argv[i];if(a==="--live")opts.live=true;else if(a==="--videos")opts.videos=true;
  else if(["--input","--out","--mode"].includes(a)&&argv[i+1]&&!argv[i+1].startsWith("--"))opts[a.slice(2)]=argv[++i];
  else throw Error("Unknown/missing option: "+a);
 }
 if(!opts.input||!opts.out)throw Error("Usage: npm run automate -- --input manifest.json|cases.csv --out output [--videos] [--mode evidence|compare --live]");
 const bytes=await fsp.readFile(opts.input,"utf8");
 await fsp.mkdir(opts.out,{recursive:true});
 if(opts.input.toLowerCase().endsWith(".csv")){
  if(opts.live||opts.mode!=="offline"||opts.videos)throw Error("CSV intake is review-only; use a confirmed JSON manifest for processing");
  const packet=I.importCSV(bytes);await fsp.writeFile(path.join(opts.out,"intake-review.json"),JSON.stringify(packet,null,2)+"\n");
  console.log(JSON.stringify({mode:"review_only",total_input_rows:packet.total_input_rows,admitted_rows:packet.rows.length,eligible_for_evaluation:0}));return;
 }
 const manifest=JSON.parse(bytes);
 if(manifest.schema!=="zebra-batch-input/v1")throw Error("Invalid batch manifest schema");
 if(opts.mode!=="offline"&&opts.live)opts.cfg=require("../campus_review_server.cjs").configure();
 const report=await runBatch(manifest.cases,{...opts,outDir:opts.out});
 await fsp.writeFile(path.join(opts.out,"batch-receipt.json"),JSON.stringify(report,null,2)+"\n");
 console.log(JSON.stringify(report.summary,null,2));
 if(report.summary.failed||report.records.some(r=>r.video?.status==="failed"))process.exitCode=1;
}
if(require.main===module)main(process.argv.slice(2)).catch(e=>{console.error(e.message);process.exitCode=1});
module.exports={offline,narration,renderNarrated,runBatch,summarize,approvedForum};
