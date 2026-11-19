'use strict';
const own=(object,key)=>object!==null&&(typeof object==='object'||typeof object==='function')
 ?Object.getOwnPropertyDescriptor(object,key)?.value:undefined;
const match=(value,re,max)=>typeof value==='string'&&value.length<=max&&value.trim()===value&&re.test(value);
const fieldRules=Object.freeze({
 case_id:[/^[A-Za-z0-9][A-Za-z0-9_.:-]*$/,100],
 source_paragraph_id:[/^[A-Za-z0-9][A-Za-z0-9_.:/-]*$/,160],
 source_sha256:[/^[0-9a-f]{64}$/,64],
 framework_commit:[/^[0-9a-f]{40}$/,40],
 practicum_commit:[/^[0-9a-f]{40}$/,40],
});
/** Inject the existing trusted, pure copy renderer. Never invoke its disk/CLI wrapper. */
function createRendererPreflight({applyReturn}) {
 if(typeof applyReturn!=='function')throw new TypeError('Trusted local renderer required.');
 return function validateHandoff({handoff,trustedBaseline,originalHtml}={}) {
  const base={schema:'zebra-renderer-preflight/v1',write_performed:false,model_invoked:false,
   apply_allowed:false,merge_allowed:false,publication:'NOT_AUTHORIZED'};
  try{
   const schema=own(handoff,'schema');
   if(schema==='zebra-doc-capture-intake/v1')return {...base,result:'CAPTURE_PRE_REVIEW_NOT_A_REVISION'};
   if(schema!=='research-documentation-handoff/v0.4')return {...base,result:'UNSUPPORTED_HANDOFF_SCHEMA'};
   const version=own(trustedBaseline,'source_version');
   if(!match(version,/^[A-Za-z0-9][A-Za-z0-9._-]*$/,100)||own(own(handoff,'proposed_revision'),'source_version')!==version)
    return {...base,result:'BASELINE_EDITION_MISMATCH'};
   const refs={};
   for(const [key,[pattern,max]] of Object.entries(fieldRules)){
    const value=own(trustedBaseline,key);
    if(!match(value,pattern,max))return {...base,result:'INVALID_BASELINE_REFERENCE'};
    refs[key]=value;
   }
   // The trusted renderer computes HTML in memory as part of validating all bindings.
   // Take only its own primitive receipt scalars. Never return HTML or attestations.
   const receipt=own(applyReturn(handoff,trustedBaseline,originalHtml),'receipt');
   if(own(receipt,'schema')!=='practicum-framework-return/v1'||own(receipt,'original_modified')!==false||
      own(receipt,'publication')!=='NOT_AUTHORIZED'||own(receipt,'model_execution')!=='NOT_RUN'||
      Object.entries(refs).some(([key,value])=>own(receipt,key)!==value))
    return {...base,result:'RENDERER_RECEIPT_CONTRACT_MISMATCH'};
   return {...base,result:'LOCAL_COPY_RENDERER_ACCEPTS_PINNED_BINDINGS',...refs,
    source_version:version,renderer_model_status:'NOT_RUN'};
  }catch{
   return {...base,result:'LOCAL_COPY_RENDERER_REJECTS_BINDINGS'};
  }
 };
}
module.exports={createRendererPreflight};
