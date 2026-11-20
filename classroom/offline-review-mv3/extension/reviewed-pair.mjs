/** Bind both local captures to one independently pinned case declaration. No signature is implied. */
import {boundedCopy,sha256 as hash} from './archive-bytes.mjs';
import {captureDigest} from './approved-revision-archive.mjs';
import {checkSource} from './capture.js';
const sha=/^[a-f0-9]{64}$/u;
const fields=['schema','scope','case_id','run_id','grant_sha256','forum_url','forum_capture_sha256','techdocs_url','techdocs_capture_sha256'];
const fail=()=>{throw new Error('Capture pair does not match the independent local review pin.');};
export async function checkReviewedPair({pairBytes,pin,grantBytes,forum,techdocs,binding,scope}={}){
 pairBytes=boundedCopy(pairBytes,8192,fail);
 grantBytes=boundedCopy(grantBytes,16_384,fail);
 forum=structuredClone(forum);techdocs=structuredClone(techdocs);binding=structuredClone(binding);scope=structuredClone(scope);
 if(typeof pin!=='string'||!sha.test(pin)||await hash(pairBytes)!==pin)fail();
 let row;
 try{row=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(pairBytes));}catch{fail();}
 const expected=scope?[...fields,'section_envelope_sha256','heading_anchor']:fields;
 if(!row||Array.isArray(row)||typeof row!=='object'||Object.keys(row).length!==expected.length||!expected.every(k=>Object.hasOwn(row,k)))fail();
 if(row.schema!==(scope?'zebra-local-case-source-pair/v2':'zebra-local-case-source-pair/v1')||row.scope!=='LOCAL_INERT_ARCHIVE_ONLY'||
    !/^[A-Za-z0-9_-]{1,100}$/u.test(row.case_id??'')||!/^CAPTURE-[a-f0-9]{24}$/u.test(row.run_id??'')||
    row.case_id!==binding?.case_id||row.run_id!==binding?.run_id||
    row.grant_sha256!==await hash(grantBytes)||row.techdocs_url!==binding?.source_url||
    row.techdocs_capture_sha256!==binding?.capture_sha256)fail();
 const f=checkSource(row.forum_url),d=checkSource(row.techdocs_url);
 if(f.kind!=='forum'||d.kind!=='techdocs'||f.url!==row.forum_url||d.url!==row.techdocs_url||
    f.url!==forum?.source_url||d.url!==techdocs?.source_url||
    forum?.source_kind!=='forum'||techdocs?.source_kind!=='techdocs'||
    await captureDigest(forum)!==row.forum_capture_sha256||await captureDigest(techdocs)!==row.techdocs_capture_sha256)fail();
 let scoped_capture;
 if(scope){
  const sectionSha=await hash(JSON.stringify({capture:techdocs,section_scope:scope}));
  const expectedRun='CAPTURE-'+(await hash(JSON.stringify([row.case_id,row.forum_capture_sha256,sectionSha]))).slice(0,24);
  if(row.section_envelope_sha256!==sectionSha||row.heading_anchor!==scope.heading_anchor||
     binding.source_anchor!==scope.heading_anchor||
     binding.captured_paragraph_before_locator?.section_anchor!==scope.heading_anchor||
     binding.run_id!==expectedRun)fail();
  scoped_capture={schema:'zebra-local-scoped-capture-binding/v1',section_scope:scope,section_envelope_sha256:sectionSha};
 }
 return {schema:scope?'zebra-local-case-source-pair-binding/v2':'zebra-local-case-source-pair-binding/v1',case_id:row.case_id,run_id:row.run_id,
    pair_pin_sha256:pin,grant_sha256:row.grant_sha256,forum_url:f.url,techdocs_url:d.url,
    forum_capture_sha256:row.forum_capture_sha256,techdocs_capture_sha256:row.techdocs_capture_sha256,
    ...(scoped_capture?{scoped_capture}:{}),publication:'NOT_AUTHORIZED',reviewer_authenticated:false};
}
