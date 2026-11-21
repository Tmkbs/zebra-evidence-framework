'use strict';
const {createHash}=require('node:crypto');
const {validateCapture}=require('../capture-intake.cjs');
const hash=s=>createHash('sha256').update(s).digest('hex');
const sha=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s)&&s.length===64;
const norm=s=>s.replace(/[\t\n\f\r ]+/g,' ').replace(/^ +| +$/g,'');
const fail=()=>{throw new Error('Retained capture cannot be bound to the expected source paragraph.');};
const PROOF_KEYS=['schema','status','source_sha256','locator','source_paragraph_dom_sha256',
 'native_source_anchor','captured_locator_bound','operation_authorized','write_performed','publication'];
const match=(row,keys)=>row&&typeof row==='object'&&!Array.isArray(row)&&Object.keys(row).length===keys.length&&keys.every(k=>Object.hasOwn(row,k));
function bindSourceParagraph({capture,sourceProof,expectedCaptureSha256,expectedSourceUrl,expectedSourceSha256,expectedSourceProofSha256}={}){
 if(!sha(expectedSourceSha256)||!sha(expectedCaptureSha256)||!sha(expectedSourceProofSha256)||
    !match(sourceProof,PROOF_KEYS)||sourceProof.schema!=='zebra-source-paragraph-before-locator/v1'||sourceProof.status!=='STRUCTURAL_SOURCE_MATCH_ONLY'||
    sourceProof.source_sha256!==expectedSourceSha256||sourceProof.native_source_anchor!==null||
    sourceProof.captured_locator_bound!==false||sourceProof.operation_authorized!==false||
    sourceProof.write_performed!==false||sourceProof.publication!=='NOT_AUTHORIZED'||
    !sha(sourceProof.source_paragraph_dom_sha256)||hash(JSON.stringify(sourceProof))!==expectedSourceProofSha256)fail();
 const loc=sourceProof.locator;
 if(!match(loc,['section_anchor','block_kind','section_block_index','block_sha256'])||
    loc.block_kind!=='paragraph'||!sha(loc.block_sha256)||!Number.isInteger(loc.section_block_index)||
    loc.section_block_index<0||loc.section_block_index>=120||typeof loc.section_anchor!=='string')fail();
 const cap=validateCapture(capture);
 if(cap.source_kind!=='techdocs'||cap.source_url!==expectedSourceUrl||hash(JSON.stringify(cap))!==expectedCaptureSha256)fail();
 const heads=cap.blocks.flatMap((b,i)=>b.kind==='heading'&&b.anchor===loc.section_anchor?[i]:[]);
 if(heads.length!==1)fail();
 const start=heads[0],level=cap.blocks[start].level;
 if(!Number.isInteger(level))fail();
 const next=cap.blocks.findIndex((b,i)=>i>start&&b.kind==='heading'&&(!Number.isInteger(b.level)||b.level<=level));
 const limit=next===-1?cap.blocks.length:next;
 const candidates=cap.blocks.slice(start+1,limit).flatMap((b,i)=>b.kind==='paragraph'&&hash(norm(b.text))===loc.block_sha256?[i]:[]);
 if(candidates.length!==1||candidates[0]!==loc.section_block_index)fail();
 const index=start+1+candidates[0];
 return {schema:'zebra-captured-paragraph-before-binding/v1',status:'EXACT_RETAINED_CAPTURE_BLOCK_MATCH',
  source_url:cap.source_url,capture_sha256:expectedCaptureSha256,source_sha256:expectedSourceSha256,
  source_paragraph_dom_sha256:sourceProof.source_paragraph_dom_sha256,capture_truncated:cap.truncated,
  native_capture_anchor:cap.blocks[index].anchor??null,block_index_zero_based:index,locator:{...loc},
  operation_authorized:false,write_performed:false,publication:'NOT_AUTHORIZED'};
}
module.exports={bindSourceParagraph};
