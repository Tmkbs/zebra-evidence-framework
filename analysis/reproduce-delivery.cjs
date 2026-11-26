"use strict";
// One release reproduction entry point. Uses the existing implementation,
// frozen public-development inputs, and local encoders. No AI or network.
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto"),assert=require("node:assert/strict");
const {execFileSync}=require("node:child_process");
const B=require("./batch-answer.cjs"),A=require("./reviewed-pattern-audit.cjs");
const root=path.resolve(__dirname,".."),digest=b=>crypto.createHash("sha256").update(b).digest("hex");
function command(bin,args){return execFileSync(bin,args,{cwd:root,encoding:"utf8",timeout:15000,windowsHide:true}).trim()}
function load(relative){const bytes=fs.readFileSync(path.join(root,relative));return {file:relative,sha256:digest(bytes),value:JSON.parse(bytes)}}
function write(file,value){fs.writeFileSync(file,JSON.stringify(value,null,2)+"\n",{flag:"wx"})}
const noNetwork=()=>{throw Error("Network is forbidden in the release reproduction")};
async function batch(out,input,name,{video=false}={}){
 const dir=path.join(out,name);fs.mkdirSync(dir);
 const report=await B.execute(input,{mode:"offline",request:noNetwork,renderVideo:video?B.localRenderer(dir):null});
 write(path.join(dir,"batch-report.json"),report);
 assert.equal(report.summary.model_runs_completed,0);
 assert.equal(report.summary.global_patterns_validated,0);
 assert.equal(report.summary.failed_rows,0);
 assert.ok(report.rows.every(r=>r.evaluation_eligible===false&&r.video?.status!=="failed"));
 const clips=[];
 for(const row of report.rows.filter(r=>r.video?.status==="encoded_and_decoded")){
  const base=path.join(dir,row.id),receipt=JSON.parse(fs.readFileSync(path.join(base,"receipt.json"),"utf8"));
  const mp4=fs.readFileSync(path.join(base,"explainer.mp4")),vtt=fs.readFileSync(path.join(base,"explainer.vtt")),inputBytes=fs.readFileSync(path.join(base,"narration-input.json"));
  assert.equal(receipt.video_sha256,digest(mp4));
  assert.equal(receipt.narration_input_sha256,digest(inputBytes));
  assert.equal(receipt.bytes,mp4.length);
  assert.equal(receipt.decoded_audio_and_video,true);
  assert.equal(receipt.video_codec,"h264");assert.equal(receipt.audio_codec,"aac");
  assert.ok(receipt.audio_peak_db>=-35&&receipt.duration_seconds>0);
  assert.match(vtt.toString("utf8"),/^WEBVTT/);
  assert.deepEqual(receipt.source_links,row.video_plan.source_links);
  assert.deepEqual(receipt.scenes.map(s=>s.frame_id),row.video_plan.frames.map(s=>s.id));
  clips.push({case_id:row.id,kind:receipt.kind,seconds:receipt.duration_seconds,scene_count:receipt.scenes.length,video_sha256:digest(mp4),captions_sha256:digest(vtt),narration_input_sha256:digest(inputBytes),source_links:receipt.source_links,decoded_audio_and_video:true,relative_video:name+"/"+row.video.video_file,relative_receipt:name+"/"+row.video.receipt_file});
 }
 return {report,clips};
}
async function reproduce(out){
 if(fs.existsSync(out))throw Error("Output directory must be new");
 const inputs=[load("analysis/batch-demo-input.json"),load("analysis/document-lesson-pilot.json"),load("classroom/public_case_manifest.json"),load("analysis/archived-version-context.json")];
 const metadata={source_commit:command("git",["rev-parse","HEAD"]),tracked_changes_present:!!command("git",["status","--porcelain","--untracked-files=no"]),node:process.version,python:command(process.env.PYTHON||(process.platform==="win32"?"python":"python3"),["--version"]),ffmpeg:command("ffmpeg",["-version"]).split("\n")[0]};
 fs.mkdirSync(out,{recursive:true});
 const a=await batch(out,inputs[0].value,"narrated-batch",{video:true});
 assert.equal(a.clips.length,4);
 const b=await batch(out,inputs[1].value,"document-lesson",{video:true});
 assert.equal(b.clips.length,1);
 assert.equal(b.report.rows[0].visual_guide.lesson_id,"ehs-settings-access-r62");
 const c=await batch(out,B.manifestPacket(inputs[2].value),"public-manifest-intake");
 assert.equal(c.clips.length,0);
 const pattern=A.mine(inputs[3].value);
 write(path.join(out,"pattern-report.json"),pattern);
 const p=pattern.patterns.find(x=>x.pattern_id==="installed_version_gap");
 assert.equal(pattern.input_cases,4);
 assert.equal(p.independent_supporting_report_groups,3);
 assert.equal(p.independent_counterexample_groups,1);
 assert.equal(pattern.global_patterns_validated,0);
 assert.equal(pattern.documentation_defects_established,0);
 const clips=[...a.clips,...b.clips];
 const routes=[...a.report.rows,...b.report.rows,...c.report.rows].map(row=>({id:row.id,channel:row.channel,question_origin:row.question_origin,resolution:row.resolution}));
 write(path.join(out,"resolution-routing.json"),{schema:"zebra-resolution-reproduction/v1",scope:"Offline development and paraphrase inputs only, not actual channel outcomes.",rows:routes,summary:require("./resolution-routing.cjs").summarize(routes)});
 const report={schema:"zebra-final-reproduction/v1",created_at:new Date().toISOString(),environment:metadata,input_files:inputs.map(({file,sha256})=>({file,sha256})),checks:{narrated_clips_encoded_decoded:clips.length,public_paraphrases:c.report.rows.length,public_paraphrases_evaluation_eligible:c.report.rows.filter(r=>r.evaluation_eligible).length,archive_report_groups:p.unique_report_groups,version_context_supporting_groups:p.independent_supporting_report_groups,version_context_counterexample_groups:p.independent_counterexample_groups,global_patterns_validated:0},clips,evidence_limits:{archive_annotation_recount_only:true,original_archives_not_fetched:true,actual_model_trials_in_this_run:0,document_revision_effect:"NOT_MEASURED",answer_strategy_effect:"NOT_MEASURED",human_learning_effect:"NOT_MEASURED",device_tested:false,publication_approved:false},interpretation:"Reproduces the offline software and the annotated public-case count. It does not reproduce a live AI experiment, determine general documentation sufficiency, or prove a customer benefit. Media byte hashes may differ across encoder versions; verify content, sources, decode and the recorded environment."};
 write(path.join(out,"reproduction.json"),report);
 console.log(JSON.stringify({environment:metadata,checks:report.checks,evidence_limits:report.evidence_limits},null,2));
 return report;
}
if(require.main===module){
 if(process.argv.length!==3){console.error("Usage: node analysis/reproduce-delivery.cjs NEW_OUTPUT_DIRECTORY");process.exitCode=1}
 else reproduce(path.resolve(process.argv[2])).catch(e=>{console.error(e.stack||e.message);process.exitCode=1});
}
module.exports={reproduce};
