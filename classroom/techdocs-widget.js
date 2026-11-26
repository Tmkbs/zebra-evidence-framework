/* Portable documentation assistant widget. Host supplies the answer adapter,
   approved page context and optional visual renderer. No provider keys/network
   requests or Zebra-specific URLs are embedded in this component. */
(function(root,factory){
 const api=factory();if(typeof module==="object"&&module.exports)module.exports=api;else root.TechDocsWidget=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
function safeLink(raw){try{const u=new URL(raw);return u.protocol==="https:"&&!u.username&&!u.password&&!u.port&&!u.search?u.href:""}catch{return ""}}
function view(result){
 const p=result?.plan||{},sources=Array.isArray(result?.sources)?result.sources:[],runs=Array.isArray(result?.runs)?result.runs:[];
 const claims=[],evidence=[],checks=[],clarify=Array.isArray(p.clarification)?p.clarification.filter(x=>typeof x==="string"):[];
 for(const run of runs.filter(r=>r.mode==="guided"&&r.completed===true)){
  for(const claim of run.result?.quote_checked_claims||[]){
   const s=sources.find(x=>x.id===claim.evidence_id),url=safeLink(s?.url);
   if(typeof claim.claim==="string"&&typeof claim.quote==="string"&&claim.quote.length>=8&&claim.quote_exact===true&&url&&typeof s.text==="string"&&s.text.includes(claim.quote))claims.push({claim:claim.claim,quote:claim.quote,url});
  }
  for(const x of run.result?.clarification||[])if(typeof x==="string")clarify.push(x);
  for(const x of run.result?.next_checks||[])if(typeof x==="string")checks.push(x);
 }
 for(const s of sources){const url=safeLink(s.url);if(url&&typeof s.text==="string")evidence.push({url,title:s.id,quote:s.text.slice(0,650)})}
 for(const card of result?.offline_evidence?.cards||[]){const url=safeLink(card.url);if(!url)continue;for(const section of card.sections||[])if(typeof section.quote==="string")evidence.push({url,title:card.title||"Source card",quote:section.quote})}
 return {claims,evidence,clarification:[...new Set(clarify)],checks:[...new Set(checks)],modelCompleted:result?.model_runs_completed||0,needsClarification:p.state==="clarification_required",mode:result?.mode||"unknown"};
}
function mount(host,{scope,ask,live=false,renderExtras=null,title="Ask about this document"}={}){
 if(!host||!scope||typeof ask!=="function")throw Error("Provide a host element, page scope and answer adapter");
 const doc=host.ownerDocument,el=(tag,text,cls)=>{const n=doc.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n};
 const root=el("section",null,"tdw-panel"),head=el("h2",title),intro=el("p","Document context: "+[scope.product,scope.version].filter(Boolean).join(" · "),"tdw-muted");
 const q=el("textarea");q.rows=3;q.maxLength=1800;q.placeholder="Ask a technical question about this page";
 const qLabel=el("label","Your question");qLabel.append(q);
 const context=el("textarea");context.rows=2;context.maxLength=1200;context.placeholder="Optional: observed result or confirmed configuration";
 const contextLabel=el("label","Confirmed context (optional)");contextLabel.append(context);
 const consent=el("input");consent.type="checkbox";const cLabel=el("label",null,"tdw-consent");cLabel.append(consent,doc.createTextNode(" I confirm this is public or explicitly approved non-confidential material."));
 const controls=el("div",null,"tdw-controls"),offline=el("button","Check sources (offline)"),send=el("button","Ask assistant"),reset=el("button","Clear");
 for(const b of [offline,send,reset])b.type="button";
 send.hidden=!live;controls.append(offline,send,reset);
 const status=el("p",null,"tdw-muted"),out=el("div",null,"tdw-results"),extra=el("div",null,"tdw-extras");
 status.setAttribute("role","status");status.setAttribute("aria-live","polite");root.append(head,intro,qLabel,contextLabel,cLabel,controls,status,out,extra);host.append(root);
 let epoch=0,cleanup=null,disposed=false;
 const clear=()=>{if(typeof cleanup==="function")cleanup();cleanup=null;out.replaceChildren();extra.replaceChildren()};
 const busy=b=>{q.disabled=b;context.disabled=b;consent.disabled=b;offline.disabled=b;send.disabled=b};
 function render(result){
  const v=view(result);
  if(v.needsClarification)out.append(el("h3","More information needed"));
  if(v.clarification.length){const list=el("ul");for(const x of v.clarification)list.append(el("li",x));out.append(list)}
  if(v.claims.length){out.append(el("h3","Candidate guidance — review required"));for(const c of v.claims){const item=el("div",null,"tdw-claim");item.append(el("p",c.claim),el("blockquote",c.quote));const a=el("a","Source");a.href=c.url;a.target="_blank";a.rel="noopener noreferrer";item.append(a);out.append(item)}}
  if(v.checks.length){out.append(el("h3","Suggested next checks"));const list=el("ul");for(const x of v.checks)list.append(el("li",x));out.append(list)}
  if(v.evidence.length){const details=el("details");details.append(el("summary","Source evidence"));for(const s of v.evidence){const p=el("p"),a=el("a",s.title||"Official source");a.href=s.url;a.target="_blank";a.rel="noopener noreferrer";p.append(a,doc.createTextNode(" — "+s.quote));details.append(p)}out.append(details)}
  status.textContent=v.modelCompleted?"Model response received. Exact excerpts are checked; technical validity still requires review.":v.needsClarification?"Clarification required. No model answer claimed.":v.evidence.length?"Source evidence ready. No model response claimed.":"No checked source evidence is available for this question.";
  if(typeof renderExtras==="function")cleanup=renderExtras(extra,result);
 }
 async function run(action){
  if(disposed)return;if(q.value.trim().length<12){status.textContent="Enter a substantive technical question.";return}
  if(action==="guided"&&!consent.checked){status.textContent="Confirm approved public input before requesting inference.";return}
  const token=++epoch;clear();busy(true);status.textContent="Preparing guidance…";
  try{const result=await ask({action,question:q.value.trim(),context:context.value.trim(),product:scope.product||"",version:scope.version||"",source_urls:[...(scope.source_urls||[])],public_only:consent.checked});if(!disposed&&token===epoch)render(result)}
  catch(e){if(!disposed&&token===epoch)status.textContent="Guidance unavailable: "+String(e.message||e).slice(0,250)}
  finally{if(!disposed&&token===epoch)busy(false)}
 }
 offline.addEventListener("click",()=>run("plan"));send.addEventListener("click",()=>run("guided"));
 reset.addEventListener("click",()=>{epoch++;clear();q.value="";context.value="";consent.checked=false;busy(false);status.textContent=""});
 return {destroy(){disposed=true;epoch++;clear();root.remove()}};
}
return Object.freeze({mount,view});
});
