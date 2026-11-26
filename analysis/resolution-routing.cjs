"use strict";
// Business dispositions, not another answer engine. Separate assistance from
// independently verified correctness and actual customer resolution.
const dispositions=["document_guidance","model_candidate","clarify","human_review","excluded"];
const known=["profile_learning","configuration_hierarchy","document_lesson","scan_prerequisite","result_discrepancy"];
function base(disposition,reason,extra={}){
 return {disposition,reason,confirmed_resolution:false,independent_accuracy_review:false,automatic_closure:false,...extra};
}
function verifiedSource(e,plan){
 if(!e||typeof e.quote!=="string"||e.quote.length<8||!["checked_source_card","retrieved_excerpt"].includes(e.origin))return false;
 try{const u=new URL(e.url),parts=u.pathname.split("/").filter(Boolean);return u.protocol==="https:"&&u.hostname==="techdocs.zebra.com"&&!u.username&&!u.password&&!u.port&&!u.search&&parts[0]===plan.product&&parts[1]===plan.version.replace(/\./g,"-")}catch{return false}
}
function route(row){
 if(["missing_original_question","duplicate_question","network_not_authorized"].includes(row.status))return base("excluded",row.status);
 if(["failed","inference_incomplete"].includes(row.status))return base("human_review",row.status,{next_action:"Inspect the source or provider failure and retry only when the scope is established."});
 const r=row.result,p=r?.plan,g=row.visual_guide;
 if(!p)return base("human_review","missing_answer_plan");
 if(p.state==="clarification_required")return base("clarify","missing_scope",{questions:(p.clarification||[]).filter(x=>typeof x==="string")});
 if(g?.kind==="scope_required")return base("clarify","narrow_question",{questions:[g.next?.text||"Which single technical task should be addressed?"]});
 // An exact-quote check alone does not establish correctness. A model response
 // is a generated candidate, never a verified automatic resolution.
 const guided=(r.runs||[]).find(x=>x.mode==="guided");
 if(guided){
  const a=guided.result;
  if(!guided.completed||!guided.model_identity_reported||!a)return base("human_review","model_response_incomplete");
  if(a.rejected_claims?.length)return base("human_review","unsupported_model_claims");
  if(a.model_reported_status==="clarify"&&a.clarification?.length)return base("clarify","model_requests_context",{questions:a.clarification});
  if(g?.kind==="result_discrepancy")return base("human_review","document_wording_conflict",{next_action:g.next?.text});
  const quotes=Array.isArray(a.quote_checked_claims)?a.quote_checked_claims:[];
  if(a.model_reported_status==="documented_guidance"&&quotes.length>0&&quotes.length===a.claim_count&&quotes.every(c=>{
   const s=(r.sources||[]).find(s=>s.id===c.evidence_id);
   return c.quote_exact===true&&typeof c.claim==="string"&&verifiedSource({quote:c.quote,url:s?.url,origin:"retrieved_excerpt"},p)&&typeof s?.text==="string"&&s.text.includes(c.quote);
  }))return base("model_candidate","mechanically_checked_not_semantically_verified",{answer:quotes.map(c=>({text:c.claim,evidence_id:c.evidence_id,quote:c.quote,url:r.sources.find(s=>s.id===c.evidence_id).url})),next_checks:a.next_checks||[]});
  return base("human_review","inconclusive_or_incomplete_model_answer",{next_action:"Review the applicable evidence and decide whether a documented answer or an expert check is needed."});
 }
 // Reuse the existing curated visual guide for an immediate, limited
 // explanation; no newly invented technical claim or device result.
 if(g&&known.includes(g.kind)){
  const answer=g.nodes.filter(n=>n.status==="source"||g.kind==="scan_prerequisite"&&["profile","scanner"].includes(n.id)).filter(n=>n.evidence?.length&&n.evidence.every(e=>verifiedSource(e,p))).map(n=>({text:n.detail,evidence:n.evidence}));
  if(g.kind==="result_discrepancy")return base("human_review","document_wording_conflict",{answer,next_action:g.next?.text});
  if(answer.length)return base("document_guidance","matched_version_scoped_document_explanation",{answer,next_action:g.next?.text,scope:"Partial or conceptual guidance from curated/retrieved excerpts; task completion is not established."});
 }
 return base("human_review","no_supported_automatic_answer",{next_action:"Locate relevant approved source material or escalate for technical review."});
}
function summarize(rows){
 const channels={};
 for(const row of rows){
  const channel=row.channel||"unspecified";
  const c=channels[channel]??={input_rows:0,document_guidance:0,model_candidate:0,clarify:0,human_review:0,excluded:0,confirmed_resolutions:0};
  c.input_rows++;
  const disposition=row.resolution?.disposition||route(row).disposition;
  if(!dispositions.includes(disposition))throw Error("Invalid resolution disposition");
  c[disposition]++;
 }
 return {channels,confirmed_resolutions:0,automatic_resolution_rate:null,accuracy_rate:null,case_prevention_rate:null,scope:"Dispositions count all submitted rows including exclusions. Development fixtures and candidates are not successful customer resolutions; independent accuracy and user outcomes not measured."};
}
module.exports={route,summarize};
