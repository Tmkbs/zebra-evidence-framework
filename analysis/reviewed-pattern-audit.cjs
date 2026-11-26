"use strict";
// Candidate recurrence from source-inspected annotations, NOT an automatic
// semantic classifier, a verified documentation defect, or a causal study.
const fs=require("node:fs");
function forum(raw){
 const u=new URL(raw);
 if(u.protocol!=="https:"||!["developer.zebra.com","community.zebra.com","stackoverflow.com"].includes(u.hostname)||u.username||u.password||u.port||u.search)throw Error("Public forum URL required");
 u.hash="";return u.href.replace(/\/$/,"");
}
function mine(input){
 if(input?.schema!=="zebra-reviewed-pattern-input/v1"||!Array.isArray(input.cases)||!input.cases.length||input.cases.length>2000)throw Error("Invalid reviewed-pattern packet");
 if(!/^[a-f0-9]{40}$/i.test(input.archive_commit||""))throw Error("Pinned archive commit required");
 const threshold=input.threshold??2;
 if(!Number.isInteger(threshold)||threshold<2)throw Error("Threshold must be at least 2");
 const ids=new Set(),rows=[],excluded=[];
 for(const c of input.cases){
  if(typeof c?.id!=="string"||!c.id||ids.has(c.id))throw Error("Unique case IDs required");
  ids.add(c.id);
  if(c.review_status!=="first_post_inspected_team_review_pending"&&c.review_status!=="human_reviewed_first_post"){excluded.push({id:c.id,reason:"first_post_not_reviewed"});continue}
  if(!/^[a-f0-9]{40}$/i.test(c.archive_blob_sha||"")||typeof c.archive_path!=="string"||!c.archive_path.startsWith("Zebra_Forum_Backup_2026-10-26/")||c.archive_path.includes(".."))throw Error("Pinned archive evidence required for "+c.id);
  const source=forum(c.forum_url);
  if(!Array.isArray(c.observations))throw Error("Observations required");
  const observed=new Set();
  for(const o of c.observations){
   if(!/^[a-z][a-z0-9_]{1,64}$/.test(o?.pattern_id||"")||observed.has(o.pattern_id)||typeof o.support!=="boolean"||typeof o.source_excerpt!=="string"||!o.source_excerpt.trim()||typeof o.review_note!=="string"||!o.review_note.trim())throw Error("Explicit source-linked observation required for "+c.id);
   observed.add(o.pattern_id);
   rows.push({id:c.id,pattern_id:o.pattern_id,support:o.support,forum:source,blob:c.archive_blob_sha.toLowerCase(),archive_url:"https://github.com/1235357/zebra-public-site-archive/blob/"+input.archive_commit+"/"+c.archive_path,source_excerpt:o.source_excerpt,review_note:o.review_note,review_status:c.review_status});
  }
 }
 const patterns=[];
 for(const key of [...new Set(rows.map(x=>x.pattern_id))].sort()){
  const all=rows.filter(r=>r.pattern_id===key),groups=[];
  for(const r of all){
   // Merge connected duplicate groups by forum URL OR archive blob. Shared
   // copies of the same original do not increase the independent count.
   const matching=groups.filter(g=>g.some(x=>x.forum===r.forum||x.blob===r.blob));
   for(const g of matching)groups.splice(groups.indexOf(g),1);
   groups.push([r,...matching.flat()]);
  }
  const positives=groups.filter(g=>g.every(x=>x.support));
  const negatives=groups.filter(g=>g.every(x=>!x.support));
  const conflicting=groups.filter(g=>g.some(x=>x.support)&&g.some(x=>!x.support));
  patterns.push({pattern_id:key,nominal_supporting_rows:all.filter(r=>r.support).length,
   independent_supporting_report_groups:positives.length,independent_counterexample_groups:negatives.length,
   conflicting_groups:conflicting.map(g=>g.map(x=>x.id)),unique_report_groups:groups.length,
   supporting_case_ids:positives.map(g=>g[0].id),counterexample_case_ids:negatives.map(g=>g[0].id),
   deduplicated_rows:all.length-groups.length,
   status:positives.length>=threshold?"recurring_candidate_requires_independent_team_review":"insufficient_recurrence",
   validated:false,observations:all});
 }
 return {schema:"zebra-reviewed-pattern-audit/v1",scope:input.scope||"",input_cases:input.cases.length,excluded,threshold,patterns,global_patterns_validated:0,documentation_defects_established:0,quality_improvement_measured:false,device_tested:false};
}
if(require.main===module){
 try{
  const [input,out]=process.argv.slice(2);if(!input||!out)throw Error("node analysis/reviewed-pattern-audit.cjs INPUT.json OUTPUT.json");
  const result=mine(JSON.parse(fs.readFileSync(input,"utf8")));
  fs.writeFileSync(out,JSON.stringify(result,null,2)+"\n",{flag:"wx"});console.log(JSON.stringify(result.patterns.map(({observations,...r})=>r),null,2));
 }catch(e){console.error(e.message);process.exitCode=1}
}
module.exports={mine};
