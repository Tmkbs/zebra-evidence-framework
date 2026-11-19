import {checkSource} from './capture.js';
import {buildMirror,normalizeCapture} from './engine.js';

export const COLLECTION_LIMITS=Object.freeze({pages:12,inputBytes:1400000,entryBytes:360000,links:20});
const ENTRY='zebra-reviewed-mirror-page/v1';
const encoder=new TextEncoder();
const exact=(record,keys)=>record!==null&&typeof record==='object'&&Object.keys(record).length===keys.length&&keys.every(k=>Object.hasOwn(record,k));

function publicURL(url,{fragment=false}={}){
  const source=checkSource(url), parsed=new URL(url);
  if(source.url+(fragment?parsed.hash:'')!==url||
      (parsed.hash&&!/^#[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$/.test(parsed.hash))) throw new Error('Not an exact supported page URL.');
  return source;
}

export function previewCollection(rootUrl,entries){
  const root=publicURL(rootUrl), origin=new URL(root.url).origin;
  if(!Array.isArray(entries)||!entries.length||entries.length>COLLECTION_LIMITS.pages)throw new Error('Invalid number of selected files.');
  let bytes=0;
  const urls=new Set();
  const pages=entries.map(serialized=>{
    if(typeof serialized!=='string'||serialized.length>COLLECTION_LIMITS.entryBytes)throw new Error('Invalid capture file size.');
    const size=encoder.encode(serialized).length;
    if(size>COLLECTION_LIMITS.entryBytes||(bytes+=size)>COLLECTION_LIMITS.inputBytes)throw new Error('Capture file limit exceeded.');
    const item=JSON.parse(serialized);
    if(!exact(item,['schema_version','capture','discovered_links'])||item.schema_version!==ENTRY||
      !Array.isArray(item.discovered_links)||item.discovered_links.length>COLLECTION_LIMITS.links)throw new Error('Invalid capture entry envelope.');
    const capture=normalizeCapture(item.capture), url=publicURL(capture.source_url);
    if(new URL(url.url).origin!==origin||url.kind!==root.kind||urls.has(url.url))throw new Error('Duplicate or out-of-scope capture.');
    urls.add(url.url);
    const discovered_links=item.discovered_links.map(link=>{
      const labeled=exact(link,['target_url','label']);
      if((!labeled&&!exact(link,['target_url']))||(labeled&&typeof link.label!=='string'))throw new Error('Invalid discovered link.');
      const target=publicURL(link.target_url,{fragment:true});
      if(new URL(target.url).origin!==origin||target.kind!==root.kind)throw new Error('Out-of-scope discovered link.');
      return labeled?{target_url:link.target_url,label:link.label}:{target_url:link.target_url};
    });
    return {capture,discovered_links};
  });
  if(!urls.has(root.url))throw new Error('Select the root page capture.');
  const input={schema_version:'zebra-mirror-input/v1',allowed_origins:[origin],roots:[root.url],pages};
  const output=buildMirror(input);
  if(output.manifest.captured_pages!==pages.length||output.manifest.unreachable_captures)
    throw new Error('Every selected page must be reachable from the root within the mirror budget.');
  if(output.manifest.pages.some(row=>Object.entries(row.omitted_links).some(([kind,n])=>n>0&&!['not_supplied','missing_fragment','depth_budget'].includes(kind))))
    throw new Error('Mirror rejected content or link metadata.');
  return Object.freeze({
    preview:()=>structuredClone(input),
    coverage:()=>structuredClone(output.manifest),
    export({approved=false}={}){
      if(approved!==true)throw new Error('Review and approve the complete collection first.');
      return buildMirror(input);
    }
  });
}
