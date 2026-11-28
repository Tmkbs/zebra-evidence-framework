"use strict";
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
const hash=s=>crypto.createHash("sha256").update(s).digest("hex");
function reviewer(hash,flip,nonce=()=>crypto.randomBytes(32).toString("hex")){
 const dims=["source_support","technical_correctness","version_applicability","uncertainty_calibration","useful_next_action"];
 const requireThat=(v,m)=>{if(!v)throw Error(m)};
 const digest=x=>hash(JSON.stringify(x)),text=x=>typeof x==="string"&&!!x.trim();
 // Bind the private mapping and exclusion accounting to the reviewer packet
 // without revealing the A/B mapping or making small mappings guessable.
 const keyMaterial=k=>({schema:k.schema,batch_sha256:k.batch_sha256,mapping:k.mapping,excluded:k.excluded,input_rows:k.input_rows,binding_nonce:k.binding_nonce});
 function inspect(row){
  const r=row?.result,p=r?.plan;
  if(row?.question_origin!=="original_public_question"||row.origin_verified_by_operator!==true)return "original_not_reviewed";
  if(!/^https:\/\/(?:developer\.zebra\.com|community\.zebra\.com|stackoverflow\.com)\/[^\s?]+$/.test(row.forum_url||"")||row.source_group!==row.forum_url.split("#")[0])return "invalid_forum";
  if(row.status!=="planned_or_executed"||r?.mode!=="live_paired_answer"||r.pair_valid!==true||r.model_attempts!==2||r.model_runs_completed!==2)return "pair_incomplete";
  if(!text(p?.question)||!text(p.product)||!text(p.version)||typeof p.context!=="string"||!text(r.run_id))return "missing_scope";
  if(row.question_sha256!==hash(p.question.trim().replace(/\s+/g," ").toLowerCase()))return "question_digest_mismatch";
  if(r.settings?.temperature!==0||r.settings?.max_tokens!==1800)return "settings_mismatch";
  if(!Array.isArray(r.sources)||!r.sources.length||r.sources.length>2)return "missing_evidence";
  const seen=new Set();
  for(const s of r.sources){
   const m=/^https:\/\/techdocs\.zebra\.com\/([a-z-]+)\/([0-9-]+)\/[a-zA-Z0-9._/#:-]+$/.exec(s.url||"");
   if(!m||m[1]!==p.product||m[2]!==p.version.replace(/\./g,"-"))return "source_scope_mismatch";
   if(!text(s.id)||seen.has(s.id)||!text(s.text)||hash(s.text)!==s.excerpt_sha256||!text(s.retrieved_at)||!/^[a-f0-9]{64}$/.test(s.body_sha256))return "source_receipt_invalid";
   seen.add(s.id);
  }
  const e=digest(r.sources.map(s=>({id:s.id,url:s.url,text:s.text})));
  if(e!==r.evidence_sha256||digest({question:p.question,context:p.context,product:p.product,version:p.version,evidence_sha256:e})!==r.frozen_input_sha256)return "input_digest_mismatch";
  if(!Array.isArray(r.runs)||r.runs.length!==2)return "pair_incomplete";
  const a=r.runs.find(x=>x.mode==="baseline"),b=r.runs.find(x=>x.mode==="guided");
  if(!a||!b||!text(a.model)||a.model!==b.model||a.prompt_sha256===b.prompt_sha256||![a,b].every(x=>x.completed===true&&x.model_identity_reported===true&&text(x.raw_answer)&&hash(x.raw_answer)===x.raw_answer_sha256&&/^[a-f0-9]{64}$/.test(x.prompt_sha256)&&text(x.ran_at)))return "response_or_identity_invalid";
  return "";
 }
 function prepare(batch){
  requireThat(batch?.schema==="zebra-answer-batch/v1"&&Array.isArray(batch.rows)&&batch.rows.length<=200,"Expected bounded batch report");
  const cases=[],mapping=[],excluded=[],ids=new Set(),groups=new Set(),questions=new Set();
  for(const row of batch.rows){
   let reason=inspect(row);
   if(!text(row?.id)||ids.has(row.id))reason="missing_or_duplicate_id";
   if(text(row?.id))ids.add(row.id);
   if(!reason&&(groups.has(row.source_group)||questions.has(row.question_sha256)))reason="duplicate_forum_or_question";
   if(reason){excluded.push({id:row?.id??null,reason});continue}
   groups.add(row.source_group);questions.add(row.question_sha256);
   const r=row.result,p=r.plan,base=r.runs.find(x=>x.mode==="baseline"),guided=r.runs.find(x=>x.mode==="guided");
   const arms=flip()?[guided,base]:[base,guided],id="R"+String(cases.length+1).padStart(3,"0");
   cases.push({id,question:p.question,reported_product:p.product,reported_edition:p.version,context:p.context,original_forum:row.forum_url,evidence:r.sources.map(s=>({id:s.id,url:s.url,excerpt:s.text})),answers:{A:arms[0].raw_answer,B:arms[1].raw_answer}});
   mapping.push({id,case_id:row.id,run_id:r.run_id,frozen_input_sha256:r.frozen_input_sha256,arm_modes:{A:arms[0].mode,B:arms[1].mode}});
  }
  const binding_nonce=nonce();
  requireThat(typeof binding_nonce==="string"&&/^[a-f0-9]{64}$/.test(binding_nonce),"Invalid private binding nonce");
  const key={schema:"zebra-review-key/v2",batch_sha256:digest(batch),mapping,excluded,input_rows:batch.rows.length,binding_nonce};
  const packet={schema:"zebra-blinded-review/v2",scope:"Receipt-reported pairs; verify provenance independently. Labels hidden, not necessarily fully blind. Held-out status not established.",rubric:dims,cases,key_binding_sha256:digest(keyMaterial(key))};
  key.packet_sha256=digest(packet);
  const empty=()=>({scores:Object.fromEntries(dims.map(d=>[d,null])),critical_error:null,note:""});
  const sheet={schema:"zebra-review-scores/v2",packet_sha256:key.packet_sha256,reviewer:"",independent_review_confirmed:false,items:cases.map(c=>({id:c.id,A:empty(),B:empty()}))};
  return {packet,key,sheet};
 }
 function grade(packet,key,sheet){
  requireThat(packet?.schema==="zebra-blinded-review/v2"&&key?.schema==="zebra-review-key/v2"&&sheet?.schema==="zebra-review-scores/v2","Invalid review schema; prepare a new v2 review packet");
  requireThat(digest(packet)===key.packet_sha256&&key.packet_sha256===sheet.packet_sha256,"Packet digest mismatch");
  requireThat(typeof key.binding_nonce==="string"&&/^[a-f0-9]{64}$/.test(key.binding_nonce)&&typeof packet.key_binding_sha256==="string"&&digest(keyMaterial(key))===packet.key_binding_sha256,"Private key binding mismatch");
  requireThat(Array.isArray(packet.cases)&&Array.isArray(key.mapping)&&Array.isArray(sheet.items)&&key.mapping.length===packet.cases.length&&sheet.items.length===packet.cases.length,"Review every admitted pair");
  requireThat(text(sheet.reviewer)&&sheet.independent_review_confirmed===true,"Independent human reviewer must be recorded");
  const by=new Map(sheet.items.map(r=>[r.id,r])),maps=new Map(key.mapping.map(r=>[r.id,r]));
  requireThat(by.size===packet.cases.length&&maps.size===packet.cases.length&&new Set(packet.cases.map(c=>c.id)).size===packet.cases.length,"Duplicate IDs");
  function score(a){
   requireThat(a&&a.scores&&Object.keys(a.scores).length===dims.length&&dims.every(d=>Number.isInteger(a.scores[d])&&a.scores[d]>=0&&a.scores[d]<=2),"Every dimension requires a 0, 1 or 2");
   requireThat(typeof a.critical_error==="boolean"&&text(a.note),"Critical-error decision and rationale required");
   return {scores:a.scores,total:dims.reduce((n,d)=>n+a.scores[d],0),critical_error:a.critical_error,note:a.note};
  }
  const reviewed=packet.cases.map(c=>{
   const item=by.get(c.id),m=maps.get(c.id);
   requireThat(item&&m&&["baseline","guided"].includes(m.arm_modes?.A)&&["baseline","guided"].includes(m.arm_modes?.B)&&m.arm_modes.A!==m.arm_modes.B,"Invalid arm mapping");
   const a=score(item.A),b=score(item.B),baseline=m.arm_modes.A==="baseline"?a:b,guided=m.arm_modes.A==="guided"?a:b;
   return {case_id:m.case_id,run_id:m.run_id,baseline,guided,delta:guided.total-baseline.total};
  });
  const n=reviewed.length,mean=arm=>n?reviewed.reduce((s,r)=>s+r[arm].total,0)/n:null;
  return {schema:"zebra-paired-review-summary/v1",reviewer:sheet.reviewer,packet_sha256:key.packet_sha256,input_rows:key.input_rows,excluded:key.excluded,reviewed_pairs:n,baseline_mean:mean("baseline"),guided_mean:mean("guided"),mean_paired_delta:n?reviewed.reduce((s,r)=>s+r.delta,0)/n:null,baseline_critical_errors:reviewed.filter(r=>r.baseline.critical_error).length,guided_critical_errors:reviewed.filter(r=>r.guided.critical_error).length,held_out_status:"not_established",quality_improvement_established:false,device_tested:false,publication_approved:false,scope:"Descriptive human scores on this pilot only; no generalization, learning effect or device-performance claim.",reviewed};
 }
 return {prepare,grade,inspect,dims};
}
const api=reviewer(hash,()=>crypto.randomInt(2));
function main(args){
 const [command,...a]=args,read=f=>JSON.parse(fs.readFileSync(f,"utf8")),write=(f,x)=>fs.writeFileSync(f,JSON.stringify(x,null,2)+"\n",{flag:"wx",mode:0o600});
 if(command==="prepare"&&a.length===2){const r=api.prepare(read(a[0]));fs.mkdirSync(a[1],{mode:0o700});write(path.join(a[1],"review-packet.json"),r.packet);write(path.join(a[1],"review-key.private.json"),r.key);write(path.join(a[1],"review-scores.json"),r.sheet);console.log(JSON.stringify({admitted_pairs:r.packet.cases.length,excluded:r.key.excluded},null,2));}
 else if(command==="grade"&&a.length===4){const r=api.grade(read(a[0]),read(a[1]),read(a[2]));write(a[3],r);console.log(JSON.stringify({reviewed_pairs:r.reviewed_pairs,baseline_mean:r.baseline_mean,guided_mean:r.guided_mean,mean_paired_delta:r.mean_paired_delta,guided_critical_errors:r.guided_critical_errors,quality_improvement_established:false},null,2));}
 else throw Error("Use prepare BATCH_REPORT NEW_DIR or grade REVIEW_PACKET PRIVATE_KEY REVIEW_SCORES NEW_SUMMARY");
}
if(require.main===module){try{main(process.argv.slice(2))}catch(e){console.error(e.message);process.exitCode=1}}
module.exports={...api,reviewer};
