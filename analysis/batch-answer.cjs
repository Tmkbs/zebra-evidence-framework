"use strict";
// One command for answer-side planning, evidence, optional paired inference,
// and narrated visual production. Offline by default; no new provider.
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const {execFile}=require("node:child_process"),runFile=require("node:util").promisify(execFile);
const P=require("../classroom/guidance-planner.js"),I=require("../classroom/guidance-intake.js");
const V=require("../classroom/guidance-visual.js"),S=require("../classroom/guidance-storyboard.js");
const G=require("./answer-guidance.cjs");
const R=require("./resolution-routing.cjs");
const digest=s=>crypto.createHash("sha256").update(s).digest("hex");
const originKinds=new Set(["synthetic_question","public_report_paraphrase","original_public_question","authorized_support_question","user_question"]);
function publicForum(raw){
 try{const u=new URL(raw);return u.protocol==="https:"&&["developer.zebra.com","stackoverflow.com","community.zebra.com"].includes(u.hostname)&&!u.username&&!u.password&&!u.port&&!u.search?u.href:""}catch{return ""}
}
function inputRows(packet){
 if(!packet||packet.schema!=="zebra-batch-input/v1"||!Array.isArray(packet.cases)||!packet.cases.length||packet.cases.length>200)throw Error("Provide a zebra-batch-input/v1 file with 1–200 cases");
 const ids=new Set();
 return packet.cases.map((row,i)=>{
  if(!row||typeof row!=="object"||Array.isArray(row)||typeof row.id!=="string"||!/^[A-Za-z0-9_-]{1,80}$/.test(row.id)||ids.has(row.id.toLowerCase()))throw Error("Invalid or duplicate case id at row "+(i+1));
  ids.add(row.id.toLowerCase());
  if(!originKinds.has(row.question_origin))throw Error("Explicit question_origin required at "+row.id);
  if(typeof row.question!=="string")throw Error("Question must be text at "+row.id);
  const forum_url=publicForum(row.forum_url);
  const channel=row.channel||(row.question_origin==="authorized_support_question"?"support_ticket":forum_url||["original_public_question","public_report_paraphrase"].includes(row.question_origin)?"forum":"unspecified");
  if(!["forum","support_ticket","unspecified"].includes(channel))throw Error("Invalid case channel at "+row.id);
  if((row.question_origin==="original_public_question"&&channel!=="forum")||(row.question_origin==="authorized_support_question"&&channel!=="support_ticket"))throw Error("Question origin and channel disagree at "+row.id);
  const sample_ref=typeof row.support_sample_ref==="string"&&/^SAMPLE-[a-zA-Z0-9_-]{1,64}$/.test(row.support_sample_ref)?row.support_sample_ref:"";
  // Approved anonymized, non-confidential support samples only. Never ingest
  // raw customer tickets or assume an operator flag confers legal permission.
  const reviewed_forum=channel==="forum"&&row.question_origin==="original_public_question"&&row.origin_verified===true&&row.public_only===true&&!!forum_url;
  const reviewed_support=channel==="support_ticket"&&row.question_origin==="authorized_support_question"&&row.origin_verified===true&&row.public_only===true&&row.support_sample_approved===true&&!!sample_ref&&!row.forum_url;
  const reviewed_public=reviewed_forum||reviewed_support;
  return {id:row.id,question_origin:row.question_origin,channel,forum_url,reviewed_public,
   input:{case_id:row.id,question:row.question,product:row.product||"",version:row.version||"",context:row.context||"",source_urls:row.source_urls||[],public_only:reviewed_public},
   origin_verified_by_operator:reviewed_public,source_group:reviewed_support?"support:"+sample_ref:forum_url?forum_url.split("#")[0]:""};
 });
}
function csvPacket(raw){
 const imported=I.importCSV(raw);
 return {schema:"zebra-batch-input/v1",cases:imported.rows.map(row=>({id:row.id,question:row.question,question_origin:"public_report_paraphrase",
  forum_url:row.forum_url,product:"",version:"",source_urls:[],public_only:false,origin_verified:false})),
  csv_intake:{total_input_rows:imported.total_input_rows,skipped_rows:imported.skipped_rows,question_column:imported.question_column,eligible_for_evaluation:0}};
}
function manifestPacket(raw){
 if(raw?.schema!=="public-research-case-manifest/v1"||!Array.isArray(raw.cases))throw Error("Invalid public case manifest");
 return {schema:"zebra-batch-input/v1",cases:raw.cases.map(r=>({id:r.id,question:r.question,question_origin:"public_report_paraphrase",forum_url:r.original_public_url,product:"",version:"",public_only:false,origin_verified:false,source_urls:[]}))};
}
function summarize(rows,mode){
 const counts={};const seen=new Set();let blocked=0,failed=0,skipped=0,models=0,pairs=0,videoPlans=0,videoEncoded=0;
 for(const row of rows){
  if(row.status==="failed")failed++;
  if(row.status==="missing_original_question"||row.status==="duplicate_question")skipped++;
  if(row.status==="clarification_required"||row.status==="network_not_authorized")blocked++;
  models+=row.result?.model_runs_completed||0;
  if(row.result?.pair_valid===true)pairs++;
  if(row.video_plan)videoPlans++;
  if(row.video?.status==="encoded_and_decoded")videoEncoded++;
  // Count unique question/source groups only, not independent semantic support.
  const key=row.source_group||row.question_sha256;
  if(!key||seen.has(key))continue;
  seen.add(key);
  for(const strategy of row.result?.plan?.strategies||[]){
   const entry=counts[strategy.id]||{id:strategy.id,unique_question_or_forum_groups:0,research_status:strategy.research_status};
   entry.unique_question_or_forum_groups++;counts[strategy.id]=entry;
  }
 }
 return {mode,total_rows:rows.length,blocked_rows:blocked,failed_rows:failed,skipped_rows:skipped,
  model_runs_completed:models,valid_model_pairs:pairs,narrated_video_candidates:videoPlans,narrated_videos_encoded:videoEncoded,
  candidate_strategy_matches:Object.values(counts).sort((a,b)=>a.id.localeCompare(b.id)),
  count_scope:"Unique question/source groups with deterministic candidate rule matches; not independent supporting evidence or a pattern validation.",
  resolution_by_channel:R.summarize(rows),
  global_patterns_validated:0,quality_improvement_measured:false,device_tested:false,publication_approved:false};
}
async function execute(packet,{mode="offline",allowNetwork=false,cfg={},request=fetch,renderVideo=null}={}){
 if(!["offline","evidence","guided","compare"].includes(mode))throw Error("Unknown mode");
 if(mode!=="offline"&&!allowNetwork)throw Error("Network modes require --allow-network");
 const items=inputRows(packet),rows=[],seen=new Set();
 for(const item of items){
  const question=item.input.question.trim();
  const row={id:item.id,question_origin:item.question_origin,channel:item.channel,forum_url:item.forum_url,source_group:item.source_group,
   origin_verified_by_operator:item.origin_verified_by_operator,question_sha256:digest(question.replace(/\s+/g," ").toLowerCase()),
   held_out_status:"not_established",review_status:"not_reviewed",evaluation_eligible:false,video:null};
  rows.push(row);
  if(question.length<12){row.status="missing_original_question";continue}
  if(seen.has(row.question_sha256)){row.status="duplicate_question";continue}
  seen.add(row.question_sha256);
  try{
   if(mode==="offline"){
    const first=P.prepare({...item.input,action:"plan"}),packet=I.offlineEvidence(first);
    const plan=P.withEvidence(first,packet.cards);
    row.result={mode:"offline_guidance",plan,offline_evidence:packet,model_attempts:0,model_runs_completed:0,device_tested:false};
   }else if(!item.reviewed_public){
    row.status="network_not_authorized";continue;
   }else{
    row.result=await G.run({...item.input,action:mode},cfg,request);
   }
   row.status=row.result.plan.state==="clarification_required"?"clarification_required":
    (mode==="compare"&&row.result.pair_valid!==true)||(mode==="guided"&&row.result.model_runs_completed!==1)?"inference_incomplete":"planned_or_executed";
   const map=V.graph(row.result.plan,row.result);
   row.visual_guide=V.receipt(map);row.video_plan=S.videoPlan(map);
   if(row.video_plan&&renderVideo){
    try{row.video=await renderVideo(row)}catch(e){row.video={status:"failed",error:String(e.message||e).slice(0,500)}}
   }else if(!row.video_plan)row.video={status:"not_selected",reason:"No matched source-backed visual form"};
  }catch(e){row.status="failed";row.error=String(e.message||e).slice(0,500)}
 }
 for(const row of rows)row.resolution=R.route(row);
 return {schema:"zebra-answer-batch/v1",created_at:new Date().toISOString(),summary:summarize(rows,mode),csv_intake:packet.csv_intake||null,rows};
}
function localRenderer(out){
 return async row=>{
  const dir=path.join(out,row.id),file=path.join(dir,"narration-input.json");
  fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(file,JSON.stringify({schema:"zebra-narration-input/v1",map:row.visual_guide,video_plan:row.video_plan},null,2)+"\n");
  try{await runFile(process.env.PYTHON||(process.platform==="win32"?"python":"python3"),[path.join(__dirname,"build_narrated_clip.py"),file,dir],{encoding:"utf8",timeout:150000,maxBuffer:2000000,windowsHide:true})}
  catch(e){throw Error(String(e.stderr||e.message||"Narration encoder failed").slice(-500))}
  const receipt=JSON.parse(fs.readFileSync(path.join(dir,"receipt.json"),"utf8"));
  const video=fs.readFileSync(path.join(dir,"explainer.mp4"));
  if(receipt.decoded_audio_and_video!==true||receipt.bytes!==video.length||receipt.video_sha256!==digest(video))throw Error("Narration verification failed");
  return {status:"encoded_and_decoded",video_file:row.id+"/explainer.mp4",caption_file:row.id+"/explainer.vtt",receipt_file:row.id+"/receipt.json",duration_seconds:receipt.duration_seconds,audio_peak_db:receipt.audio_peak_db,video_sha256:receipt.video_sha256};
 };
}
function options(args){
 const o={mode:"offline",video:false,allowNetwork:false};
 for(let i=0;i<args.length;i++){
  const arg=args[i];
  if(arg==="--video")o.video=true;
  else if(arg==="--allow-network")o.allowNetwork=true;
  else if(["--input","--csv","--manifest","--output","--mode"].includes(arg)){if(!args[i+1]||args[i+1].startsWith("--"))throw Error("Missing value for "+arg);o[arg.slice(2)]=args[++i]}
  else throw Error("Unknown option "+arg);
 }
 if([o.input,o.csv,o.manifest].filter(Boolean).length!==1||!o.output)throw Error("Use --input FILE (or --csv FILE or --manifest FILE) --output NEW_DIR [--mode offline|evidence|guided|compare] [--allow-network] [--video]");
 return o;
}
async function main(){
 const o=options(process.argv.slice(2)),out=path.resolve(o.output);
 if(fs.existsSync(out))throw Error("Output directory must be new; never overwrite a previous run");
 const read=f=>fs.readFileSync(f,"utf8");
 const packet=o.csv?csvPacket(read(o.csv)):o.manifest?manifestPacket(JSON.parse(read(o.manifest))):JSON.parse(read(o.input));
 if(o.csv&&o.mode!=="offline")throw Error("CSV import is offline intake only; review original questions first");
 if(o.manifest&&o.mode!=="offline")throw Error("Public manifest contains paraphrases, not reviewed original questions");
 fs.mkdirSync(out,{recursive:true});
 const cfg=require("./model-provider.cjs").configure(process.env,{defaultMode:"campus"});
 const result=await execute(packet,{mode:o.mode,allowNetwork:o.allowNetwork,cfg,renderVideo:o.video?localRenderer(out):null});
 fs.writeFileSync(path.join(out,"batch-report.json"),JSON.stringify(result,null,2)+"\n");
 console.log(JSON.stringify(result.summary,null,2));
 if(result.rows.some(r=>r.status==="failed"||r.status==="inference_incomplete"||r.video?.status==="failed"))process.exitCode=1;
}
if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1});
module.exports={execute,inputRows,csvPacket,manifestPacket,summarize,options,localRenderer};
