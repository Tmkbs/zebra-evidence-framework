/** Bind both local captures to one independently pinned case declaration. No signature is implied. */
import {createHash,timingSafeEqual} from 'node:crypto';
import {captureDigest} from './approved-revision-archive.mjs';
import {checkSource} from './extension/capture.js';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const sha=/^[a-f0-9]{64}$/u;
const fields=['schema','scope','case_id','run_id','grant_sha256','forum_url','forum_capture_sha256','techdocs_url','techdocs_capture_sha256'];
const fail=()=>{throw new Error('Capture pair does not match the independent local review pin.');};
export function checkReviewedPair({pairBytes,pin,grantBytes,forum,techdocs,binding}={}){
 if(!Buffer.isBuffer(pairBytes)||!pairBytes.length||pairBytes.length>8192||typeof pin!=='string'||!sha.test(pin)||
    !timingSafeEqual(Buffer.from(hash(pairBytes),'hex'),Buffer.from(pin,'hex'))||!Buffer.isBuffer(grantBytes))fail();
 let row;
 try{row=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(pairBytes));}catch{fail();}
 if(!row||Array.isArray(row)||typeof row!=='object'||Object.keys(row).length!==fields.length||!fields.every(k=>Object.hasOwn(row,k)))fail();
 if(row.schema!=='zebra-local-case-source-pair/v1'||row.scope!=='LOCAL_INERT_ARCHIVE_ONLY'||
    !/^[A-Za-z0-9_-]{1,100}$/u.test(row.case_id??'')||!/^CAPTURE-[a-f0-9]{24}$/u.test(row.run_id??'')||
    row.case_id!==binding?.case_id||row.run_id!==binding?.run_id||
    row.grant_sha256!==hash(grantBytes)||row.techdocs_url!==binding?.source_url||
    row.techdocs_capture_sha256!==binding?.capture_sha256)fail();
 const f=checkSource(row.forum_url),d=checkSource(row.techdocs_url);
 if(f.kind!=='forum'||d.kind!=='techdocs'||f.url!==row.forum_url||d.url!==row.techdocs_url||
    f.url!==forum?.source_url||d.url!==techdocs?.source_url||
    forum?.source_kind!=='forum'||techdocs?.source_kind!=='techdocs'||
    captureDigest(forum)!==row.forum_capture_sha256||captureDigest(techdocs)!==row.techdocs_capture_sha256)fail();
 return {schema:'zebra-local-case-source-pair-binding/v1',case_id:row.case_id,run_id:row.run_id,
    pair_pin_sha256:pin,grant_sha256:row.grant_sha256,forum_url:f.url,techdocs_url:d.url,
    forum_capture_sha256:row.forum_capture_sha256,techdocs_capture_sha256:row.techdocs_capture_sha256,
    publication:'NOT_AUTHORIZED',reviewer_authenticated:false};
}
