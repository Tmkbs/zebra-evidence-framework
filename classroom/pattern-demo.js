/* Thin demo layer over the real shared guidance planner. The research
 * snapshot is transcribed from analysis/zebra-pattern-analysis.html;
 * it is not a new corpus scan or an independent semantic evaluation.
 */
(function(root,factory){
 if(typeof module==="object"&&module.exports)module.exports=factory(require("./guidance-planner.js"));
 else root.ZebraPatternDemo=factory(root.ZebraGuidance);
})(typeof globalThis!=="undefined"?globalThis:this,function(guidance){
"use strict";
const rows=[
 {id:"DW68-RESULT-CONSISTENCY",title:"Result-code wording vs. example",patterns:["naming_inconsistency","missing_prerequisite","example_body_conflict","unverified_device_claim"]},
 {id:"DW66-VERSION-BOUNDARY",title:"Configuration behavior across versions",patterns:["version_boundary"]},
 {id:"DW-FORUM-00476",title:"Forum report with missing context",patterns:["version_boundary","missing_context"]}
];
// The existing snapshot's independent supporting case IDs, after its
// shared-evidence and unestablished-version exclusions.
const independentIds=["DW66-VERSION-BOUNDARY"],threshold=2;
function snapshot(){
 const cases=rows.map(r=>({...r,patterns:[...r.patterns]}));
 const hits=cases.filter(r=>r.patterns.includes("version_boundary")).length;
 const independent=cases.filter(r=>r.patterns.includes("version_boundary")&&independentIds.includes(r.id)).length;
 return {cases,hits,independent,validated:independent>=threshold?1:0,threshold,source:"analysis/zebra-pattern-analysis.html",scope:"existing_team_authored_snapshot_not_new_mining"};
}
function plan(input){
 const p=guidance.prepare({...input,action:"plan"});
 let title,next,note;
 if(p.clarification.length){
  title="Ask before answering";next=p.clarification[0];
  note=p.version?(p.product?"An edition alone is not enough; find the applicable official evidence.":"First establish which product the question concerns."):"Avoid assuming that guidance from another version applies.";
 }else{
  title="Check the matching documentation";next="Inspect the selected official source before making a specific technical recommendation.";
  note="The source route is selected but its contents and device behavior have not been verified in this run.";
 }
 return {plan:p,title,next,note,model_calls:0,global_pattern_validated:false};
}
return Object.freeze({snapshot,plan});
});
