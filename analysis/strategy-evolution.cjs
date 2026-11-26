"use strict";
// Experimental evolutionary search over existing response strategies.
// Safety gates, sources, model and matched strategies are never evolved.
const fs=require("node:fs"),crypto=require("node:crypto");
const ids=require("../classroom/answer-strategies.js").catalog().map(x=>x.id);
const emphasis={
 minimal_clarification:"Answer directly when the supplied evidence suffices. Ask only for missing information that materially changes the answer; do not ask for details already supplied.",
 explicit_boundary:"Answer the documented portion directly, explain documented capability limits, and distinguish supported guidance from unverified device behavior. Ask a focused question if needed to complete the answer."
};
const dimensions=["source_support","technical_correctness","version_applicability","uncertainty_calibration","useful_next_action"];
const hash=s=>crypto.createHash("sha256").update(s).digest("hex");
const check=(ok,message)=>{if(!ok)throw Error(message)};
function candidate(order,focus){
 check(Array.isArray(order)&&order.length===ids.length&&new Set(order).size===ids.length&&order.every(id=>ids.includes(id)),"Genome must retain every registered strategy exactly once");
 check(Object.hasOwn(emphasis,focus),"Unknown experimental emphasis");
 const genome={order:[...order],emphasis:focus};
 return {id:"S-"+hash(JSON.stringify(genome)).slice(0,16),...genome};
}
function validateCandidate(c){
 check(c&&typeof c==="object","Candidate required");
 const v=candidate(c.order,c.emphasis);check(c.id===v.id,"Candidate ID mismatch");return v;
}
function apply(selected,c){
 const v=validateCandidate(c);
 check(Array.isArray(selected)&&selected.every(s=>ids.includes(s.id)),"Unknown selected strategy");
 return {strategies:[...selected].sort((a,b)=>v.order.indexOf(a.id)-v.order.indexOf(b.id)),instruction:emphasis[v.emphasis]};
}
function rng(seed){
 let s=seed>>>0;
 return n=>{s=(Math.imul(s,1664525)+1013904223)>>>0;return s%n};
}
function shuffled(order,random){
 const x=[...order];for(let i=x.length-1;i>0;i--){const j=random(i+1);[x[i],x[j]]=[x[j],x[i]]}return x;
}
function initial(seed=26){
 check(Number.isSafeInteger(seed)&&seed>=0&&seed<=4294967295,"Use a uint32 seed");
 const random=rng(seed),focus=Object.keys(emphasis),list=[candidate(ids,focus[0]),candidate(ids,focus[1])];
 while(list.length<4){const c=candidate(shuffled(ids,random),focus[random(focus.length)]);if(!list.some(x=>x.id===c.id))list.push(c)}
 return {schema:"zebra-strategy-population/v1",seed,generation:0,candidates:list,selection:null,promotion_approved:false};
}
function population(p){
 check(p?.schema==="zebra-strategy-population/v1"&&Number.isSafeInteger(p.seed)&&p.seed>=0&&p.seed<=4294967295&&Number.isSafeInteger(p.generation)&&p.generation>=0&&p.generation<1000&&Array.isArray(p.candidates)&&p.candidates.length===4,"Invalid population");
 const cs=p.candidates.map(validateCandidate);check(new Set(cs.map(c=>c.id)).size===4,"Duplicate candidates");return cs;
}
function score(p,packet){
 const cs=population(p);
 check(packet?.schema==="zebra-strategy-fitness/v1"&&packet.case_split==="development"&&packet.evidence_kind==="reviewed_model_runs"&&typeof packet.reviewer==="string"&&packet.reviewer.trim()&&packet.independent_review_confirmed===true&&Array.isArray(packet.rounds)&&packet.rounds.length===cs.length,"Independent complete development review required");
 check(packet.generation===p.generation,"Fitness generation mismatch");
 const rounds=new Map(packet.rounds.map(r=>[r.candidate_id,r]));check(rounds.size===cs.length,"Duplicate/missing candidate review");
 let frozen=null,model=null;
 const ranked=cs.map(c=>{
  const arm=rounds.get(c.id),report=arm?.report;
  check(report?.schema==="zebra-answer-batch/v1"&&report.summary?.mode==="guided"&&Array.isArray(report.rows)&&report.rows.length>=3&&Array.isArray(arm.reviews)&&arm.reviews.length===report.rows.length,"Each candidate needs at least three complete guided case reviews");
  const seen=new Set(),groups=new Set(),questions=new Set(),by=new Map(arm.reviews.map(x=>[x.id,x]));
  check(by.size===report.rows.length,"Duplicate review IDs");
  const fingerprint=[];let total=0,critical=0;
  for(const row of report.rows){
   const r=row.result,run=r?.runs?.[0],review=by.get(row.id);
   check(typeof row.id==="string"&&!seen.has(row.id)&&typeof row.source_group==="string"&&row.source_group&&!groups.has(row.source_group)&&/^[a-f0-9]{64}$/.test(row.question_sha256||"")&&!questions.has(row.question_sha256),"Duplicate or missing original case provenance");
   seen.add(row.id);groups.add(row.source_group);questions.add(row.question_sha256);
   check(["original_public_question","authorized_support_question"].includes(row.question_origin)&&row.origin_verified_by_operator===true&&row.status==="planned_or_executed","Only approved original questions may inform selection");
   check(r.mode==="live_guided_answer"&&r.strategy_candidate_id===c.id&&r.model_runs_completed===1&&r.model_attempts===1&&r.runs.length===1&&run.mode==="guided"&&run.completed===true&&run.model_identity_reported===true&&typeof run.model==="string"&&run.model&&typeof run.raw_answer==="string"&&run.raw_answer.trim()&&hash(run.raw_answer)===run.raw_answer_sha256&&/^[a-f0-9]{64}$/.test(run.prompt_sha256||"")&&/^[a-f0-9]{64}$/.test(r.frozen_input_sha256||"")&&r.settings?.temperature===0&&r.settings?.max_tokens===1800,"Incomplete or mismatched model receipt");
   const plan=r.plan;
   check(plan&&typeof plan.question==="string"&&hash(plan.question.trim().replace(/\s+/g," ").toLowerCase())===row.question_sha256&&Array.isArray(r.sources)&&r.sources.length>0,"Missing question/source evidence");
   const G=require("./answer-guidance.cjs");
   const sources=r.sources.map(s=>{check(typeof s.id==="string"&&typeof s.url==="string"&&typeof s.text==="string"&&hash(s.text)===s.excerpt_sha256,"Excerpt digest mismatch");check(G.officialURL(s.url,plan.product,plan.version)===s.url,"Unexpected source scope");return {id:s.id,url:s.url,text:s.text}});
   check(hash(JSON.stringify(G.prompt(plan,r.sources,"guided",r.signals,c)))===run.prompt_sha256,"Candidate prompt digest mismatch");
   const e=hash(JSON.stringify(sources));check(e===r.evidence_sha256&&hash(JSON.stringify({question:plan.question,context:plan.context,product:plan.product,version:plan.version,evidence_sha256:e}))===r.frozen_input_sha256,"Frozen input digest mismatch");
   if(model===null)model=run.model;check(model===run.model,"Model differs across trials");
   check(review&&review.raw_answer_sha256===run.raw_answer_sha256&&review.scores&&Object.keys(review.scores).length===dimensions.length&&dimensions.every(d=>Number.isInteger(review.scores[d])&&review.scores[d]>=0&&review.scores[d]<=2)&&typeof review.critical_error==="boolean"&&typeof review.rationale==="string"&&review.rationale.trim(),"Independent review must bind to exact answer and complete rubric");
   total+=dimensions.reduce((n,d)=>n+review.scores[d],0);critical+=Number(review.critical_error);
   fingerprint.push([row.id,row.source_group,row.question_sha256,r.frozen_input_sha256]);
  }
  fingerprint.sort((a,b)=>a[0].localeCompare(b[0]));
  const signature=JSON.stringify(fingerprint);if(frozen===null)frozen=signature;check(frozen===signature,"Case or evidence changes across candidates");
  return {id:c.id,reviewed_cases:report.rows.length,critical_errors:critical,mean_score:total/report.rows.length};
 });
 return ranked.sort((a,b)=>a.critical_errors-b.critical_errors||b.mean_score-a.mean_score||a.id.localeCompare(b.id));
}
function breed(a,b,random){
 // Order crossover preserves the strategy registry. Mutation swaps two
 // positions or changes the bounded instruction emphasis, never the gates.
 const cut=1+random(ids.length-1),prefix=a.order.slice(0,cut),order=[...prefix,...b.order.filter(x=>!prefix.includes(x))];
 const i=random(order.length),j=(i+1+random(order.length-1))%order.length;
 [order[i],order[j]]=[order[j],order[i]];
 const focus=random(2)?a.emphasis:Object.keys(emphasis).find(x=>x!==a.emphasis);
 return candidate(order,focus);
}
function advance(p,packet){
 const cs=population(p),ranked=score(p,packet),parents=ranked.slice(0,2).map(r=>cs.find(c=>c.id===r.id));
 const next=[...parents],random=rng((p.seed+Math.imul(p.generation+1,2654435761))>>>0);
 const seen=new Set(cs.map(c=>c.id));
 for(let n=0;next.length<4&&n<200;n++){
  const c=breed(parents[n%2],parents[1-n%2],random);
  if(!seen.has(c.id)){seen.add(c.id);next.push(c)}
 }
 check(next.length===4,"Could not generate distinct offspring");
 return {schema:p.schema,seed:p.seed,generation:p.generation+1,candidates:next,selection:{ranked,selected_parent_ids:parents.map(c=>c.id),basis:"independently scored development receipts; critical errors first, then mean rubric score",fitness_packet_sha256:hash(JSON.stringify(packet)),held_out_status:"not_evaluated"},promotion_approved:false};
}
function read(f){return JSON.parse(fs.readFileSync(f,"utf8"))}
function write(f,v){fs.writeFileSync(f,JSON.stringify(v,null,2)+"\n",{flag:"wx"})}
if(require.main===module){
 try{
  const [op,...a]=process.argv.slice(2);
  if(op==="seed"&&(a.length===1||a.length===2))write(a[0],initial(a[1]===undefined?26:Number(a[1])));
  else if(op==="advance"&&a.length===3)write(a[2],advance(read(a[0]),read(a[1])));
  else throw Error("Use seed NEW_POPULATION.json [SEED] or advance POPULATION.json REVIEWED_FITNESS.json NEW_POPULATION.json");
 }catch(e){console.error(e.message);process.exitCode=1}
}
module.exports={initial,population,validateCandidate,apply,score,advance,dimensions};
