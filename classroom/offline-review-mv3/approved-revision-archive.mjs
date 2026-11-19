// Local-only adapter. It does not invoke the renderer or import working-copy HTML.
import {createHash,timingSafeEqual} from 'node:crypto';
import {checkSource} from './extension/capture.js';
import {buildMirror,normalizeCapture} from './extension/engine.js';
import {mirrorZip} from './extension/zip.js';

const fields=['case_id','run_id','source_url','source_anchor','target_anchor','source_version','source_sha256',
 'paragraph_sha256','operation_sha256','working_copy_sha256'];
const hash=v=>createHash('sha256').update(v).digest('hex');
const exact=(row,keys)=>row&&typeof row==='object'&&!Array.isArray(row)&&Object.keys(row).length===keys.length&&keys.every(k=>Object.hasOwn(row,k));
const matches=(s,p)=>typeof s==='string'&&p.test(s)&&s.trim()===s;
const SHA=/^[a-f0-9]{64}$/;
const id=/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$/;
const fail=()=>{throw new Error('Typed archive does not match the independent local review pin.');};
const esc=s=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function captureDigest(packet){
 const cap=normalizeCapture(packet);
 // Native capture-intake/v1 emits an anchor before heading level in its digest projection.
 const blocks=cap.blocks.map(({kind,text,anchor,level})=>({kind,text,
   ...(anchor===undefined?{}:{anchor}),...(level===undefined?{}:{level})}));
 return hash(JSON.stringify({...cap,blocks}));
}
function digestMatches(bytes,digest,limit){
 return Buffer.isBuffer(bytes)&&bytes.length>0&&bytes.length<=limit&&matches(digest,SHA)&&
  timingSafeEqual(Buffer.from(hash(bytes),'hex'),Buffer.from(digest,'hex'));
}

export function buildApprovedRevisionArchive({input,grantBytes,trustedGrantSha256,receipt,baselineBytes,workingCopyBytes}={}){
 if(!digestMatches(grantBytes,trustedGrantSha256,16_384))fail();
 let grant;
 try{grant=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(grantBytes));}catch{fail();}
 if(!exact(grant,['schema','scope',...fields,'capture_sha256','archive_text'])||
    grant.schema!=='zebra-local-archive-overlay-grant/v1'||grant.scope!=='LOCAL_INERT_ARCHIVE_ONLY')fail();
 if(receipt?.schema!=='zebra-bound-typed-copy/v1'||receipt.publication!=='NOT_AUTHORIZED'||receipt.capture_sha256!==grant.capture_sha256||
    receipt.original_modified!==false||receipt.write_performed!==false||receipt.model_execution!=='NOT_RUN'||
    fields.some(k=>!Object.hasOwn(receipt,k)||receipt[k]!==grant[k]))fail();
 if(!matches(grant.case_id,/^[A-Za-z0-9_-]{1,100}$/)||!matches(grant.run_id,/^CAPTURE-[a-f0-9]{24}$/)||
    !matches(grant.source_anchor,id)||!matches(grant.target_anchor,id)||grant.target_anchor===grant.source_anchor||
    !matches(grant.source_version,/^[0-9]{1,4}(?:-[0-9]{1,4}){1,4}$/)||
    !['source_sha256','paragraph_sha256','operation_sha256','working_copy_sha256','capture_sha256'].every(k=>matches(grant[k],SHA)))fail();
 if(!digestMatches(baselineBytes,grant.source_sha256,500_000)||!digestMatches(workingCopyBytes,grant.working_copy_sha256,600_000))fail();
 const route=checkSource(grant.source_url), edition=new URL(route.url).pathname.split('/')[2];
 if(route.kind!=='techdocs'||route.url!==grant.source_url||edition!==grant.source_version)fail();
 if(!Array.isArray(input?.pages)||input.pages.length>75)fail();
 const matchesPage=input?.pages?.filter(p=>p?.capture?.source_url===route.url);
 if(matchesPage?.length!==1)fail();
 const cap=normalizeCapture(matchesPage[0].capture);
 if(cap.source_kind!==route.kind||captureDigest(cap)!==grant.capture_sha256||
    cap.blocks.filter(b=>b.kind==='paragraph'&&b.anchor===grant.source_anchor).length!==1||
    cap.blocks.some(b=>b.anchor===grant.target_anchor))fail();
 const text=grant.archive_text;
 if(!matches(text,/^[^\u0000-\u001f\u007f-\u009f\p{Surrogate}]+$/u)||Buffer.byteLength(text)>1600)fail();
 // Reapply engine text policy independently; the original captured record remains unchanged.
 normalizeCapture({...cap,blocks:[{kind:'paragraph',text}]});
 const {files,manifest}=buildMirror(input);
 const target=manifest.pages.find(row=>row.source_url===route.url);
 if(!target||!/^pages\/\d{3}\.html$/.test(target.path))fail();
 const page=files.get(target.path), anchor='<p id="'+esc(grant.source_anchor)+'">';
 const position=page?.indexOf(anchor)??-1;
 const end=page?.indexOf('</p>',position)??-1;
 if(position<0||end<0||page.indexOf(anchor,position+1)!==-1)fail();
 const insertion='<p id="'+esc(grant.target_anchor)+'"><strong>Locally reviewed paragraph excerpt (added):</strong> '+esc(text)+'</p>';
 files.set(target.path,page.slice(0,end+4)+insertion+page.slice(end+4));
 const index=files.get('index.html'), close='</main></body></html>';
 if(!index?.endsWith(close))fail();
 const deep=target.path+'#'+grant.target_anchor;
 files.set('index.html',index.slice(0,-close.length)+
    '<section><h2>Locally reviewed paragraph excerpt</h2><p><a href="'+esc(deep)+'">Open the added paragraph in the captured context</a>. This excerpt does not recreate the full reviewed working copy or the original site.</p></section>'+close);
 manifest.local_revision_overlay={schema:'zebra-archive-revision-overlay/v1',case_id:grant.case_id,run_id:grant.run_id,
  source_url:route.url,source_version:edition,capture_sha256:grant.capture_sha256,working_copy_sha256:grant.working_copy_sha256,
  source_anchor:grant.source_anchor,target_anchor:grant.target_anchor,archive_path:deep,rendered_working_copy_embedded:false,
  reviewer_authenticated:false,publication:'NOT_AUTHORIZED'};
 files.set('manifest.json',JSON.stringify(manifest,null,2)+'\n');
 if([...files.values()].reduce((total,x)=>total+Buffer.byteLength(x),0)>25_000_000)fail();
 return {files,manifest};
}
export const zipApprovedRevisionArchive=async args=>{
 const output=buildApprovedRevisionArchive(args);
 return {...output,zip:mirrorZip(output.files)};
};
