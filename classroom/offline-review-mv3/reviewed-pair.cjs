'use strict';
const {createHash}=require('node:crypto');
function plain(value,fields) {
 return value && Object.getPrototypeOf(value)===Object.prototype &&
   Reflect.ownKeys(value).length===fields.length &&
   fields.every(k=>Object.hasOwn(Object.getOwnPropertyDescriptors(value)[k]??{},'value'));
}
const hash=p=>createHash('sha256').update(JSON.stringify(p),'utf8').digest('hex');
/** Inject the existing classroom/capture-intake.cjs module (no network and no file IO). */
function createReviewedPairAdapter({intake,validateCapture}) {
 if(typeof intake!=='function'||typeof validateCapture!=='function')throw new Error('Classroom capture intake is required.');
 function inspect(packet,expectedUrl) {
  const valid=validateCapture(packet);
  if(valid.source_url!==expectedUrl)throw new Error('Capture does not match the independently selected public URL.');
  return {source_kind:valid.source_kind,source_url:valid.source_url,captured_at:valid.captured_at,
   title:valid.title,truncated:valid.truncated,block_count:valid.blocks.length,sha256:hash(valid)};
 }
 function run({forum,techdocs,caseId=null}) {
  const selected=[forum,techdocs];
  for(const entry of selected) {
   if(!plain(entry,['packet','review'])||!plain(entry.review,['source_url','sha256','approved_for_local_intake'])||
      entry.review.approved_for_local_intake!==true)throw new Error('Explicit review approval is required for each local capture.');
   const current=inspect(entry.packet,entry.review.source_url);
   if(current.sha256!==entry.review.sha256)throw new Error('Capture changed after preview; review current bytes.');
  }
  const result=intake({forum:forum.packet,techdocs:techdocs.packet,caseId});
  if(result.schema!=='zebra-doc-capture-intake/v1'||result.stage!=='CAPTURE_REVIEW_REQUIRED'||
     result.case?.model_execution_status!=='NOT_RUN'||result.downstream_adapter?.apply_allowed!==false||
     result.downstream_adapter?.export_to_handoff_allowed!==false||result.release?.publication!==false||
     result.capture_binding?.captures?.length!==2||
     selected.some((item,i)=>result.capture_binding.captures[i]?.sha256!==item.review.sha256||
       result.capture_binding.captures[i]?.url!==item.review.source_url))
   throw new Error('Unexpected capture intake response; no handoff returned.');
  return result;
 }
 return Object.freeze({inspect,run});
}
module.exports={createReviewedPairAdapter};
