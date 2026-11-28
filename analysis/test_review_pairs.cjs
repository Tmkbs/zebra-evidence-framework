"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),crypto=require("node:crypto");
const {reviewer}=require("./review-pairs.cjs");
function tests(factory,hash,assert){
 const R=factory(hash,()=>1),q="How should the software scan trigger be checked?",p={question:q,product:"datawedge",version:"6.8",context:""},s={id:"E1",url:"https://techdocs.zebra.com/datawedge/6-8/guide/api/softscantrigger/",text:"Synthetic excerpt for a software test.",body_sha256:"a".repeat(64),retrieved_at:"2026-11-26T00:00:00Z"};
 s.excerpt_sha256=hash(s.text);const e=hash(JSON.stringify([{id:s.id,url:s.url,text:s.text}]));
 const runs=["baseline","guided"].map(mode=>({mode,completed:true,model_identity_reported:true,model:"fixture-only",prompt_sha256:(mode==="baseline"?"b":"c").repeat(64),raw_answer:mode+" fixture answer",raw_answer_sha256:hash(mode+" fixture answer"),ran_at:"2026-11-26T00:00:00Z"}));
 const row={id:"fixture",status:"planned_or_executed",question_origin:"original_public_question",origin_verified_by_operator:true,forum_url:"https://developer.zebra.com/content/fixture",source_group:"https://developer.zebra.com/content/fixture",question_sha256:hash(q.toLowerCase()),result:{mode:"live_paired_answer",pair_valid:true,model_runs_completed:2,model_attempts:2,plan:p,settings:{temperature:0,max_tokens:1800},run_id:"fixture",sources:[s],evidence_sha256:e,frozen_input_sha256:hash(JSON.stringify({question:q,context:"",product:p.product,version:p.version,evidence_sha256:e})),runs}};
 const batch={schema:"zebra-answer-batch/v1",rows:[row,{...row,id:"duplicate"},{...row,id:"offline",question_origin:"synthetic_question"},{...row,id:"bad",result:{...row.result,frozen_input_sha256:"tampered"}},{...row,id:"partial",result:{...row.result,pair_valid:false}}]};
 const out=R.prepare(batch);
 assert(out.packet.cases.length===1,"only one admissible fixture");assert(out.key.excluded.length===4,"blocked rows retained");
 assert(out.packet.cases[0].answers.A===runs[1].raw_answer,"arm shuffle");assert(!JSON.stringify(out.packet).includes("arm_modes"),"mapping separate");
 let rejected=false;try{R.grade(out.packet,out.key,out.sheet)}catch{rejected=true}assert(rejected,"unreviewed blocked");
 out.sheet.reviewer="fixture reviewer";out.sheet.independent_review_confirmed=true;
 const item=out.sheet.items[0];for(const arm of ["A","B"]){item[arm].scores=Object.fromEntries(R.dims.map(d=>[d,arm==="A"?2:1]));item[arm].critical_error=arm==="B";item[arm].note="Synthetic fixture only";}
 const result=R.grade(out.packet,out.key,out.sheet);assert(result.reviewed_pairs===1&&result.mean_paired_delta===5&&result.guided_critical_errors===0&&!result.quality_improvement_established,"mapping and boundary");
 assert(out.packet.schema==="zebra-blinded-review/v2"&&out.key.schema==="zebra-review-key/v2"&&out.sheet.schema==="zebra-review-scores/v2","bound review schemas");
 assert(typeof out.packet.key_binding_sha256==="string"&&!JSON.stringify(out.packet).includes(out.key.binding_nonce),"salt remains private");
 const swapped=JSON.parse(JSON.stringify(out.key));
 swapped.mapping[0].arm_modes={A:"baseline",B:"guided"};
 rejected=false;try{R.grade(out.packet,swapped,out.sheet)}catch(e){rejected=/Private key binding mismatch/.test(e.message)}
 assert(rejected,"accidental condition swap must not invert the score");
 const changedExclusion=JSON.parse(JSON.stringify(out.key));
 changedExclusion.excluded.pop();
 rejected=false;try{R.grade(out.packet,changedExclusion,out.sheet)}catch(e){rejected=/Private key binding mismatch/.test(e.message)}
 assert(rejected,"exclusion accounting bound");
 const changedNonce={...out.key,binding_nonce:"0".repeat(64)};
 rejected=false;try{R.grade(out.packet,changedNonce,out.sheet)}catch(e){rejected=/Private key binding mismatch/.test(e.message)}
 assert(rejected,"nonce mutation bound");
 rejected=false;try{R.grade({...out.packet,schema:"zebra-blinded-review/v1"},out.key,out.sheet)}catch(e){rejected=/Invalid review schema/.test(e.message)}
 assert(rejected,"unbound old packets rejected");
 rejected=false;try{R.grade({...out.packet,scope:"changed"},out.key,out.sheet)}catch{rejected=true}assert(rejected,"tamper detected");
 const bad=JSON.parse(JSON.stringify(row));bad.result.runs[0].raw_answer="tampered";assert(R.inspect(bad)==="response_or_identity_invalid","response hash");
 bad.result.runs[0].raw_answer=runs[0].raw_answer;bad.result.sources[0].url="https://techdocs.zebra.com/datawedge/15-0/guide/api/softscantrigger/";assert(R.inspect(bad)==="source_scope_mismatch","wrong edition");
 const zero=R.prepare({schema:batch.schema,rows:[batch.rows[2]]});zero.sheet.reviewer="fixture";zero.sheet.independent_review_confirmed=true;
 const none=R.grade(zero.packet,zero.key,zero.sheet);assert(none.reviewed_pairs===0&&none.mean_paired_delta===null,"zero no score");
}
test("synthetic receipt exclusion, randomized labels, rubric and digests",()=>tests(reviewer,s=>crypto.createHash("sha256").update(s).digest("hex"),(v,m)=>assert.ok(v,m)));


test("CLI requests owner-only local outputs and refuses overwrite",()=>{
 const fs=require("node:fs"),os=require("node:os"),path=require("node:path"),{spawnSync}=require("node:child_process");
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"zebra-review-fixture-"));
 try{
  const file=(name)=>path.join(dir,name),script=path.join(__dirname,"review-pairs.cjs");
  fs.writeFileSync(file("batch.json"),JSON.stringify({schema:"zebra-answer-batch/v1",rows:[]}),{mode:0o600});
  const run=(...args)=>spawnSync(process.execPath,[script,...args],{encoding:"utf8",timeout:5000});
  const prepared=run("prepare",file("batch.json"),file("private-review"));
  assert.equal(prepared.status,0,prepared.stderr);
  const packet=file("private-review/review-packet.json"),key=file("private-review/review-key.private.json"),scores=file("private-review/review-scores.json");
  if(process.platform!=="win32"){
   assert.equal(fs.statSync(file("private-review")).mode&0o077,0);
   for(const p of [packet,key,scores])assert.equal(fs.statSync(p).mode&0o077,0);
  }
  const sheet=JSON.parse(fs.readFileSync(scores,"utf8"));
  sheet.reviewer="Synthetic fixture";sheet.independent_review_confirmed=true;
  fs.writeFileSync(scores,JSON.stringify(sheet));
  const graded=run("grade",packet,key,scores,file("summary.json"));
  assert.equal(graded.status,0,graded.stderr);
  assert.equal(JSON.parse(fs.readFileSync(file("summary.json"),"utf8")).reviewed_pairs,0);
  if(process.platform!=="win32")assert.equal(fs.statSync(file("summary.json")).mode&0o077,0);
  assert.notEqual(run("prepare",file("batch.json"),file("private-review")).status,0);
  assert.notEqual(run("grade",packet,key,scores,file("summary.json")).status,0);
 }finally{fs.rmSync(dir,{recursive:true,force:true})}
});
