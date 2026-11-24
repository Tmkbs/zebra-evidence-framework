// Portable local-only adapter. It does not import working-copy HTML.
import {boundedCopy,sha256 as hash,utf8Bytes} from './archive-bytes.mjs';
import {checkSource,techDocsEdition} from './capture.js';
import {buildMirror,normalizeCapture} from './engine.js';
import {mirrorZip} from './zip.js';

const fields=['case_id','run_id','source_url','source_anchor','target_anchor','source_version','source_sha256',
 'paragraph_sha256','operation_sha256','working_copy_sha256'];
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
async function digestMatches(bytes,digest){
 // Pins identify non-secret public artifact bytes, not authentication tokens.
 return matches(digest,SHA) && await hash(bytes) === digest;
}

// This is a locator digest, not a replacement for the exact native capture digest.
export const capturedListItemDigest=block=>hash(block.text.replace(/[\t\n\f\r ]+/g,' ').replace(/^ +| +$/g,''));

async function findListItem(cap,locator,sectionAnchor){
 if(!exact(locator,['section_anchor','block_kind','section_block_index','block_sha256'])||
    locator.section_anchor!==sectionAnchor||locator.block_kind!=='list_item'||
    !Number.isInteger(locator.section_block_index)||locator.section_block_index<0||locator.section_block_index>=cap.blocks.length||
    !matches(locator.block_sha256,SHA))fail();
 const section=cap.blocks.findIndex(b=>b.kind==='heading'&&b.anchor===sectionAnchor);
 if(section<0)fail();
 const end=cap.blocks.findIndex((b,i)=>i>section&&b.kind==='heading'&&b.level<=cap.blocks[section].level);
 const at=section+1+locator.section_block_index;
 const block=cap.blocks[at];
 if(!block||(end!==-1&&at>=end)||block.kind!=='list_item'||await capturedListItemDigest(block)!==locator.block_sha256)fail();
 return {block,index:cap.blocks.slice(0,at).filter(b=>b.kind==='list_item').length,
   total:cap.blocks.filter(b=>b.kind==='list_item').length};
}
function insertInGeneratedListItem(page,found,addition){
 const open='<article>',start=page.indexOf(open),stop=page.indexOf('</article>',start);
 if(start<0||stop<0||page.indexOf(open,start+1)!==-1)fail();
 const contentStart=start+open.length;
 const html=page.slice(contentStart,stop);
 const items=[...html.matchAll(/<li(?: id="[A-Za-z0-9_.:-]+")?>[^<]*<\/li>/g)];
 const item=items[found.index], expected='<li'+(found.block.anchor?' id="'+esc(found.block.anchor)+'"':'')+'>'+
   esc(found.block.text)+'</li>';
 if(items.length!==found.total||!item||item[0]!==expected)fail();
 const beforeEnd=contentStart+item.index+item[0].length-'</li>'.length;
 return page.slice(0,beforeEnd)+addition+page.slice(beforeEnd);
}

async function findParagraphBefore(cap,locator,sectionAnchor){
 if(!exact(locator,['section_anchor','block_kind','section_block_index','block_sha256'])||
    locator.section_anchor!==sectionAnchor||locator.block_kind!=='paragraph'||
    !Number.isInteger(locator.section_block_index)||locator.section_block_index<0||locator.section_block_index>=cap.blocks.length||
    !matches(locator.block_sha256,SHA))fail();
 const headings=cap.blocks.flatMap((b,i)=>b.kind==='heading'&&b.anchor===sectionAnchor?[i]:[]);
 if(headings.length!==1)fail();
 const [section]=headings;
 const stop=cap.blocks.findIndex((b,i)=>i>section&&b.kind==='heading'&&b.level<=cap.blocks[section].level);
 const limit=stop<0?cap.blocks.length:stop, at=section+1+locator.section_block_index;
 const block=cap.blocks[at];
 if(at>=limit||block?.kind!=='paragraph'||await capturedListItemDigest(block)!==locator.block_sha256||
    (await Promise.all(cap.blocks.slice(section+1,limit).filter(b=>b.kind==='paragraph').map(capturedListItemDigest))).filter(d=>d===locator.block_sha256).length!==1)fail();
 return {block,index:cap.blocks.slice(0,at).filter(b=>b.kind==='paragraph').length,
   total:cap.blocks.filter(b=>b.kind==='paragraph').length};
}
function insertBeforeGeneratedParagraph(page,found,addition){
 const open='<article>',start=page.indexOf(open),stop=page.indexOf('</article>',start);
 if(start<0||stop<0||page.indexOf(open,start+1)!==-1)fail();
 const contentStart=start+open.length;
 const html=page.slice(contentStart,stop);
 const paragraphs=[...html.matchAll(/<p(?: id="[A-Za-z0-9_.:-]+")?>[^<]*<\/p>/g)];
 const selected=paragraphs[found.index],expected='<p'+(found.block.anchor?' id="'+esc(found.block.anchor)+'"':'')+'>'+
   esc(found.block.text)+'</p>';
 if(paragraphs.length!==found.total||!selected||selected[0]!==expected)fail();
 const at=contentStart+selected.index;
 return page.slice(0,at)+addition+page.slice(at);
}

export async function buildApprovedRevisionArchive({input,grantBytes,trustedGrantSha256,receipt,baselineBytes,workingCopyBytes,excerptViews=false}={}){
 grantBytes=boundedCopy(grantBytes,16_384,fail);
 baselineBytes=boundedCopy(baselineBytes,500_000,fail);
 workingCopyBytes=boundedCopy(workingCopyBytes,600_000,fail);
 if(!Array.isArray(input?.pages)||input.pages.length>75)fail();
 // The browser entry only passes parsed, bounded, user-selected files. Detach before awaits.
 input=structuredClone(input);
 receipt=structuredClone(receipt);
 if(!await digestMatches(grantBytes,trustedGrantSha256))fail();
 let grant;
 try{grant=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(grantBytes));}catch{fail();}
 const listScoped=grant?.schema==='zebra-local-archive-overlay-grant/v2';
 const paragraphBefore=grant?.schema==='zebra-local-archive-overlay-grant/v3';
 const scoped=listScoped||paragraphBefore;
 if(!exact(grant,['schema','scope',...fields,'capture_sha256','archive_text',...(scoped?['locator']:[])])||
    (!scoped&&grant.schema!=='zebra-local-archive-overlay-grant/v1')||grant.scope!=='LOCAL_INERT_ARCHIVE_ONLY')fail();
 if(receipt?.schema!=='zebra-bound-typed-copy/v1'||receipt.publication!=='NOT_AUTHORIZED'||receipt.capture_sha256!==grant.capture_sha256||
    receipt.original_modified!==false||receipt.write_performed!==false||receipt.model_execution!=='NOT_RUN'||
    fields.some(k=>!Object.hasOwn(receipt,k)||receipt[k]!==grant[k]))fail();
 if(!matches(grant.case_id,/^[A-Za-z0-9_-]{1,100}$/)||!matches(grant.run_id,/^CAPTURE-[a-f0-9]{24}$/)||
    !matches(grant.source_anchor,id)||!matches(grant.target_anchor,id)||grant.target_anchor===grant.source_anchor||
    !matches(grant.source_version,/^[0-9]{1,4}(?:-[0-9]{1,4}){1,4}$/)||
    !['source_sha256','paragraph_sha256','operation_sha256','working_copy_sha256','capture_sha256'].every(k=>matches(grant[k],SHA)))fail();
 if(!await digestMatches(baselineBytes,grant.source_sha256)||!await digestMatches(workingCopyBytes,grant.working_copy_sha256))fail();
 const route=checkSource(grant.source_url), edition=techDocsEdition(route.url);
 if(route.kind!=='techdocs'||route.url!==grant.source_url||edition!==grant.source_version)fail();
 if(!Array.isArray(input?.pages)||input.pages.length>75)fail();
 const matchesPage=input?.pages?.filter(p=>p?.capture?.source_url===route.url);
 if(matchesPage?.length!==1)fail();
 const cap=normalizeCapture(matchesPage[0].capture);
 if(cap.source_kind!==route.kind||await captureDigest(cap)!==grant.capture_sha256||
    cap.blocks.some(b=>b.anchor===grant.target_anchor))fail();
 const located=listScoped?await findListItem(cap,grant.locator,grant.source_anchor):paragraphBefore?await findParagraphBefore(cap,grant.locator,grant.source_anchor):null;
 if(!scoped&&cap.blocks.filter(b=>b.kind==='paragraph'&&b.anchor===grant.source_anchor).length!==1)fail();
 const text=grant.archive_text;
 if(!matches(text,/^[^\u0000-\u001f\u007f-\u009f\p{Surrogate}]+$/u)||utf8Bytes(text).length>1600)fail();
 // Reapply engine text policy independently; the original captured record remains unchanged.
 normalizeCapture({...cap,blocks:[{kind:'paragraph',text}]});
 const {files,manifest}=buildMirror(input);
 const target=manifest.pages.find(row=>row.source_url===route.url);
 if(!target||!/^pages\/\d{3}\.html$/.test(target.path))fail();
 const page=files.get(target.path);
 if(typeof page!=='string')fail();
 const insertion='<p id="'+esc(grant.target_anchor)+'"><strong>Locally reviewed paragraph excerpt (added):</strong> '+esc(text)+'</p>';
 if(paragraphBefore)files.set(target.path,insertBeforeGeneratedParagraph(page,located,insertion));
 else if(listScoped)files.set(target.path,insertInGeneratedListItem(page,located,insertion));
 else{
  const anchor='<p id="'+esc(grant.source_anchor)+'">';
  const position=page.indexOf(anchor), end=page.indexOf('</p>',position);
  if(position<0||end<0||page.indexOf(anchor,position+1)!==-1)fail();
  files.set(target.path,page.slice(0,end+4)+insertion+page.slice(end+4));
 }
 const index=files.get('index.html'), close='</main></body></html>';
 if(!index?.endsWith(close))fail();
 const deep=target.path+'#'+grant.target_anchor;
 files.set('index.html',index.slice(0,-close.length)+
    '<section><h2>Locally reviewed paragraph excerpt</h2><p><a href="'+esc(deep)+'">Open the added paragraph in the captured context</a>. This excerpt does not recreate the full reviewed working copy or the original site.</p></section>'+close);
 if(excerptViews===true){
  const original='pages/original-excerpt.html', clean='pages/clean-excerpt.html';
  if(files.has(original)||files.has(clean))fail();
  const marked=files.get(target.path), pure='<p id="'+esc(grant.target_anchor)+'">'+esc(text)+'</p>';
  if(typeof marked!=='string'||marked.indexOf(insertion)<0||marked.indexOf(insertion)!==marked.lastIndexOf(insertion))fail();
  const fragment=cap.blocks.filter(b=>b.anchor===grant.source_anchor).length===1?'#'+esc(grant.source_anchor):'';
  const viewNav='<nav aria-label="Local excerpt views"><a href="'+esc(target.path.split('/')[1])+'#'+esc(grant.target_anchor)+'">Revision marks</a> · <a href="clean-excerpt.html#'+esc(grant.target_anchor)+'">Clean excerpt</a> · <a href="original-excerpt.html'+fragment+'">Original captured excerpt</a></nav>';
  const decorate=(html,label)=>{
    const point='<article>';
    if(html.indexOf(point)<0||html.indexOf(point)!==html.lastIndexOf(point))fail();
    return html.replace(point,()=>'<p>'+label+'</p>'+viewNav+point);
  };
  files.set(target.path,decorate(marked,'Revision marks. This is a bounded structured capture.'));
  files.set(original,decorate(page,'Original captured excerpt. This is not the complete official source page.'));
  files.set(clean,decorate(marked.replace(insertion,()=>pure),'Clean revision excerpt. This is not the complete reviewed working copy.'));
  files.set('index.html',files.get('index.html').slice(0,-close.length)+'<p>Excerpt views: <a href="'+original+fragment+'">Original captured excerpt</a> · <a href="'+clean+'#'+esc(grant.target_anchor)+'">Clean revision excerpt</a>.</p>'+close);
  manifest.local_revision_excerpt_views={
   schema:'zebra-local-revision-excerpt-views/v1',original_path:original+fragment,
   marked_path:deep,clean_path:clean+'#'+grant.target_anchor,complete_source_mirror:false
  };
 }
 manifest.local_revision_overlay={schema:'zebra-archive-revision-overlay/v1',case_id:grant.case_id,run_id:grant.run_id,
  source_url:route.url,source_version:edition,capture_sha256:grant.capture_sha256,working_copy_sha256:grant.working_copy_sha256,
  source_anchor:grant.source_anchor,target_anchor:grant.target_anchor,archive_path:deep,rendered_working_copy_embedded:false,
  ...(listScoped?{captured_list_locator:{...grant.locator,native_capture_anchor:located.block.anchor??null}}:{}),
  ...(paragraphBefore?{captured_paragraph_before_locator:{...grant.locator,native_capture_anchor:located.block.anchor??null}}:{}),
  reviewer_authenticated:false,publication:'NOT_AUTHORIZED'};
 files.set('manifest.json',JSON.stringify(manifest,null,2)+'\n');
 if([...files.values()].reduce((total,x)=>total+utf8Bytes(x).length,0)>25_000_000)fail();
 return {files,manifest};
}
export const zipApprovedRevisionArchive=async args=>{
 const output=await buildApprovedRevisionArchive(args);
 return {...output,zip:mirrorZip(output.files)};
};
