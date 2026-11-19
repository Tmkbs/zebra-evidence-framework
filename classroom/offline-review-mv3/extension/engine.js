/** Deterministic offline mirror from explicitly supplied structured snapshots; no fetch or web APIs. */
export const INPUT='zebra-mirror-input/v1';
export const OUTPUT='zebra-offline-site/v1';
const CAPTURE='zebra-doc-capture/v1';
const HARD=Object.freeze({maxPages:75,maxDepth:4,maxBytes:4_000_000,maxLinksPerPage:60});
const DEFAULTS=Object.freeze({maxPages:20,maxDepth:2,maxBytes:900_000,maxLinksPerPage:20});
const ENCODER=new TextEncoder();
const bytes=x=>ENCODER.encode(x).length;
const PRIVATE_SEGMENT=/^(?:login|logout|log-in|sign-in|signin|register|signup|account|user|users|admin|internal|private|download|oauth|sso|search|ticket|support-portal)(?:$|[-_.])/i;
const DOMAIN=/^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const PRIVATE_HOST=/(?:^|\.)(?:localhost|local|internal|test|invalid|onion|example)$/;
const ID=/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$/;
const KIND=new Set(['heading','paragraph','list_item','code','table_row','quote']);

function reference(raw) {
  if(typeof raw!=='string'||raw.length>1800||/[\u0000-\u0020\u007f\\%]/u.test(raw)) throw new Error('invalid public URL');
  const m=/^https:\/\/([a-z0-9.-]+)(\/[A-Za-z0-9_./-]*)?(?:#([A-Za-z0-9_.:-]+))?$/.exec(raw);
  if(!m||!DOMAIN.test(m[1])||PRIVATE_HOST.test(m[1])||m[1].split('.').some(x=>x.startsWith('xn--')))
    throw new Error('unsupported public URL');
  const path=m[2]||'/';
  if(/\/\//.test(path)||path.split('/').some(x=>x==='.'||x==='..'||PRIVATE_SEGMENT.test(x)))
    throw new Error('restricted path');
  if(m[3]&&!ID.test(m[3]))throw new Error('invalid section fragment');
  const origin='https://'+m[1];
  return {origin,url:origin+path,fragment:m[3]||''};
}
function protectedText(value,kind) {
  return /-----BEGIN (?:[A-Z]+ )*PRIVATE KEY-----/.test(value) ||
    /(?:^|\s)(?:password|api[_ -]?key|secret[_ -]?key|access[_ -]?token|client[_ -]?secret)\s*[:=]\s*['"]?[A-Za-z0-9+/_.-]{16,}/i.test(value) ||
    (kind==='forum' && /(?:^|[^A-Za-z0-9+/])[A-Za-z0-9+/]{64,}={0,2}(?=$|[^A-Za-z0-9+/])/.test(value));
}
function text(value,limit,name,kind) {
  if(typeof value!=='string'||value.length>limit||!value.trim()||
     /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]|\p{Surrogate}/u.test(value)||bytes(value)>limit)
    throw new Error('invalid '+name);
  if(protectedText(value,kind))throw new Error('potentially sensitive '+name);
  return value;
}
function keys(obj,allowed,required=allowed) {
  return obj&&typeof obj==='object'&&!Array.isArray(obj)&&Object.keys(obj).every(k=>allowed.includes(k))&&required.every(k=>Object.hasOwn(obj,k));
}
function budgets(overrides) {
  if(!keys(overrides,Object.keys(HARD),[]))throw new Error('invalid budget');
  const result={...DEFAULTS,...overrides};
  for(const k of Object.keys(result)) if(!Number.isInteger(result[k])||result[k]<(k==='maxDepth'?0:1)||result[k]>HARD[k])throw new Error('out of range '+k);
  return result;
}
export function normalizeCapture(raw) {
  if(!keys(raw,['schema_version','source_url','captured_at','title','source_kind','blocks','truncated'])||
     raw.schema_version!==CAPTURE||!['techdocs','forum'].includes(raw.source_kind)||
     typeof raw.truncated!=='boolean'||!Array.isArray(raw.blocks)||!raw.blocks.length||raw.blocks.length>120||
     typeof raw.captured_at!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(raw.captured_at)||
     !Number.isFinite(Date.parse(raw.captured_at))||new Date(raw.captured_at).toISOString()!==raw.captured_at)
    throw new Error('invalid capture record');
  const {url,fragment}=reference(raw.source_url);
  if(fragment||url!==raw.source_url)throw new Error('capture URL is not canonical');
  const anchors=new Set();
  let total=0;
  const blocks=raw.blocks.map(b=>{
    if(!keys(b,['kind','text','anchor','level'],['kind','text'])||!KIND.has(b.kind))throw new Error('invalid capture block');
    const block={kind:b.kind,text:text(b.text,3500,'block text',raw.source_kind)};
    total+=bytes(block.text);
    if(total>49152)throw new Error('capture text over budget');
    if(b.kind==='heading'){
      if(!Number.isInteger(b.level)||b.level<1||b.level>6)throw new Error('invalid heading level');
      block.level=b.level;
    }else if(Object.hasOwn(b,'level'))throw new Error('invalid block level');
    if(Object.hasOwn(b,'anchor')){
      if(typeof b.anchor!=='string'||!ID.test(b.anchor)||anchors.has(b.anchor))throw new Error('invalid or repeated anchor');
      block.anchor=b.anchor; anchors.add(b.anchor);
    }
    return block;
  });
  return {schema_version:CAPTURE,source_url:url,captured_at:raw.captured_at,title:text(raw.title,512,'title',raw.source_kind),source_kind:raw.source_kind,blocks,truncated:raw.truncated};
}
const escape=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;');
const head=(title,css)=>'<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'self\'; object-src \'none\'; base-uri \'none\'; form-action \'none\'"><title>'+escape(title)+'</title><link rel="stylesheet" href="'+css+'"></head><body>';
const CSS='body{overflow-wrap:anywhere;font:16px/1.55 system-ui,sans-serif;max-width:70rem;margin:auto;padding:1rem;color:#132031}a{color:#00507a}p,li,blockquote,td,th{white-space:pre-wrap;overflow-wrap:anywhere}pre{overflow:auto;padding:.7rem;background:#f0f4f8}code{white-space:pre-wrap;overflow-wrap:anywhere}blockquote{border-left:3px solid #789;margin-left:0;padding-left:1rem}td,th{padding:.3rem;border:1px solid #84909a;overflow-wrap:anywhere}table{border-collapse:collapse;max-width:100%;display:block;overflow:auto}.note{background:#edf4f9;padding:.5rem}a:focus-visible{outline:3px solid #a84800}';
const idAttr=b=>b.anchor?' id="'+escape(b.anchor)+'"':'';
function article(blocks){
 let out='',group='';
 const close=()=>{if(group)out+=group==='ul'?'</ul>\n':'</tbody></table>\n';group='';};
 for(const b of blocks){
  const next=b.kind==='list_item'?'ul':b.kind==='table_row'?'table':'';
  if(group!==next){close();if(next)out+=next==='ul'?'<ul>\n':'<table aria-label="Table extracted as text"><tbody>\n';group=next;}
  const v=escape(b.text),id=idAttr(b);
  if(b.kind==='code')out+='<pre'+id+'><code>'+v+'</code></pre>\n';
  else if(b.kind==='table_row')out+='<tr'+id+'>'+b.text.split(' | ').map(x=>'<td>'+escape(x)+'</td>').join('')+'</tr>\n';
  else {const t=b.kind==='heading'?'h'+b.level:b.kind==='quote'?'blockquote':b.kind==='list_item'?'li':'p';out+='<'+t+id+'>'+v+'</'+t+'>\n';}
 }
 close();return out;
}

/** Volatile browser-side buffer; no grants or disk persistence. */
export function createMirrorCache(config) {
  if(!keys(config,['allowed_origins','roots','budget'],['allowed_origins','roots'])||
     !Array.isArray(config.allowed_origins)||config.allowed_origins.length<1||config.allowed_origins.length>4||
     !Array.isArray(config.roots)||config.roots.length<1||config.roots.length>8)throw new Error('invalid mirror scope');
  const budget=budgets(config.budget??{});
  const origins=new Set(config.allowed_origins.map(o=>{
    const r=reference(o);
    if(r.origin!==o)throw new Error('write allowlisted origins without a path or fragment');
    return r.origin;
  }));
  if(origins.size!==config.allowed_origins.length)throw new Error('duplicate approved origin');
  const roots=config.roots.map(v=>{
    const r=reference(v);
    if(!origins.has(r.origin)||r.fragment||r.url!==v)throw new Error('root not in canonical allowed scope');
    return r.url;
  }).sort();
  if(new Set(roots).size!==roots.length||roots.length>budget.maxPages)throw new Error('invalid root count or duplicate root');
  const saved=new Map();
  let cacheBytes=0;
  function stage(row) {
    if(!keys(row,['capture','discovered_links'],['capture']))throw new Error('invalid cache record');
    const cap=normalizeCapture(row.capture);
    const source=reference(cap.source_url);
    if(!origins.has(source.origin)||saved.has(cap.source_url))throw new Error('unapproved or duplicate capture');
    const allowedLinks=new Map(), rejected={ invalid_url:0,cross_origin:0,link_budget:0 };
    const links=row.discovered_links??[];
    if(!Array.isArray(links)||links.length>360)throw new Error('invalid discovered links');
    for(const l of links){
      if(!keys(l,['target_url','label'],['target_url']))throw new Error('invalid link record');
      let dest;
      try{ dest=reference(l.target_url); }catch{ rejected.invalid_url++; continue; }
      if(dest.origin!==source.origin){ rejected.cross_origin++; continue; }
      const key=dest.url+(dest.fragment?'#'+dest.fragment:'');
      const label=Object.hasOwn(l,'label')?text(l.label,300,'link label',cap.source_kind):dest.url;
      if(!allowedLinks.has(key)||label<allowedLinks.get(key).label)allowedLinks.set(key,{...dest,label});
    }
    const sorted=[...allowedLinks].sort(([a],[b])=>a===b?0:a<b?-1:1).map(([,v])=>v);
    rejected.link_budget=Math.max(0,sorted.length-budget.maxLinksPerPage);
    const edges=sorted.slice(0,budget.maxLinksPerPage);
    const size=bytes(JSON.stringify({cap,edges,rejected}));
    if(saved.size>=budget.maxPages||cacheBytes+size>budget.maxBytes)throw new Error('temporary mirror cache budget exceeded');
    saved.set(cap.source_url,{cap,edges,rejected,size});
    cacheBytes+=size;
    return {count:saved.size,bytes:cacheBytes};
  }
  function build(){
    const pages=new Map(), missing=[];
    const seen=new Set(roots);const queue=roots.map(url=>({url,depth:0}));
    while(queue.length){
      const {url,depth}=queue.shift(), data=saved.get(url);
      if(!data){missing.push({source_url:url,reason:'not_supplied'});continue;}
      const file='pages/'+String(pages.size+1).padStart(3,'0')+'.html';
      pages.set(url,{file,depth,...data});
      if(depth>=budget.maxDepth)continue;
      for(const edge of data.edges){
        if(seen.has(edge.url))continue;
        seen.add(edge.url);
        queue.push({url:edge.url,depth:depth+1});
      }
    }
    const records=[];
    const files=new Map([['site.css',CSS]]);
    for(const [url,p] of pages){
      let linked='';
      const omissions={...p.rejected,depth_budget:0,not_supplied:0,missing_fragment:0};
      for(const e of p.edges){
        const target=pages.get(e.url);
        if(!target){
          if(p.depth>=budget.maxDepth&&!seen.has(e.url))omissions.depth_budget++;
          else omissions.not_supplied++;
          continue;
        }
        const goodSection=!e.fragment||target.cap.blocks.some(b=>b.anchor===e.fragment);
        if(!goodSection){omissions.missing_fragment++;continue;}
        linked+='<li><a href="'+target.file.slice('pages/'.length)+(e.fragment?'#'+escape(e.fragment):'')+'">'+escape(e.label)+'</a></li>';
      }
      const n=Object.values(omissions).reduce((a,b)=>a+b,0);
      files.set(p.file,head(p.cap.title,'../site.css')+
        '<main><p><a href="../index.html">Mirror index</a></p><h1>'+escape(p.cap.title)+'</h1><p class="note">Offline structured text snapshot · Not an official publication.</p>'+
        '<p>Source: <code>'+escape(url)+'</code><br>Captured: '+escape(p.cap.captured_at)+'</p>'+
        (p.cap.truncated?'<p class="note">Capture itself was truncated.</p>':'')+
        '<article>'+article(p.cap.blocks)+'</article>'+
        (linked?'<h2>Links within this mirror</h2><ul>'+linked+'</ul>':'')+
        (n?'<p class="note">'+n+' discovered link(s) not mirrored; see coverage manifest.</p>':'')+
        '</main></body></html>');
      records.push({source_url:url,path:p.file,source_kind:p.cap.source_kind,captured_at:p.cap.captured_at,
                    depth:p.depth,blocks:p.cap.blocks.length,capture_truncated:p.cap.truncated,omitted_links:omissions});
    }
    const manifest={schema_version:OUTPUT,roots,allowed_origins:[...origins].sort(),budget,
      captured_pages:pages.size,unreachable_captures:saved.size-pages.size,temporary_cache_bytes:cacheBytes,
      pages:records,missing,
      completeness:'Supplied structured text only. Scripts, images, assets, private pages, external links and unsupplied routes are not mirrored.'};
    files.set('index.html',head('Offline Zebra evidence mirror','site.css')+
      '<main><h1>Offline Zebra evidence mirror</h1><p class="note">'+escape(manifest.completeness)+'</p><p>'+
      pages.size+' page(s) rendered. <a href="manifest.json">Coverage manifest</a></p><ul>'+
      records.map(r=>'<li><a href="'+r.path+'">'+escape(pages.get(r.source_url).cap.title)+'</a></li>').join('')+
      '</ul></main></body></html>');
    files.set('manifest.json',JSON.stringify(manifest,null,2)+'\n');
    if([...files.values()].reduce((n,s)=>n+bytes(s),0)>25_000_000)throw new Error('mirror files over hard output budget');
    return {files,manifest};
  }
  return Object.freeze({stage,build,clear(){saved.clear();cacheBytes=0;return {count:0,bytes:0};}});
}

export function buildMirror(input) {
 if(!keys(input,['schema_version','allowed_origins','roots','budget','pages'],['schema_version','allowed_origins','roots','pages'])||
    input.schema_version!==INPUT||!Array.isArray(input.pages)||input.pages.length>HARD.maxPages)throw new Error('invalid mirror input');
 const cache=createMirrorCache({allowed_origins:input.allowed_origins,roots:input.roots,budget:input.budget??{}});
 for(const page of input.pages)cache.stage(page);
 return cache.build();
}
