export const SCHEMA = 'zebra-doc-capture/v1';
export const LIMITS = Object.freeze({blocks:120, blockBytes:3500, totalBytes:49152, titleBytes:512});
const SENSITIVE = /^(?:login|logout|log-in|sign-in|signin|register|signup|account|user|users|admin|internal|private|download|oauth|sso|search|ticket|support-portal)(?:$|[-_.])/i;

export function checkSource(raw) {
  if (typeof raw !== 'string' || raw.length > 2000 || /[\u0000-\u0020\u007f\\]/.test(raw))
    throw new Error('Select a supported public Zebra page.');
  let u;
  try { u = new URL(raw); } catch { throw new Error('Select a supported public Zebra page.'); }
  if (u.protocol !== 'https:' || u.username || u.password || u.port || u.search || !/^https:\/\/[^/?#]+\/[A-Za-z0-9_./-]*(?:#.*)?$/.test(raw))
    throw new Error('Only official public HTTPS pages without query parameters are supported.');
  const path = u.pathname;
  const parsed = raw.match(/^https:\/\/([^/?#]+)(\/[^#]*)/);
  if (parsed[1]!==u.hostname) throw new Error('Use the exact official host with no extra authority fields.');
  const rawPath = parsed[2];
  if (path !== rawPath || /\/\//.test(path) || path.split('/').some(s => SENSITIVE.test(s))) throw new Error('This page is out of scope.');
  if (u.hostname === 'techdocs.zebra.com' && /^\/[a-z][a-z0-9-]+\/(?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]*$/.test(path) && !/\.(?!html$)[a-z]{2,}$/i.test(path)) return {url:u.origin+path,kind:'techdocs'};
  if (u.hostname === 'developer.zebra.com' && /^\/(?:content\/[a-z0-9][a-z0-9-]{1,170}|forum\/[1-9][0-9]{0,11})\/?$/.test(path)) return {url:u.origin+path,kind:'forum'};
  throw new Error('Use a public TechDocs article or a Zebra Developer forum topic.');
}

// Chrome serializes this function for isolated execution. No module globals, page writes or requests.
export function capturePage(source, limits, options) {
  const current = new URL(location.href);
  if (current.protocol !== 'https:' || current.search || current.username || current.password || current.origin+current.pathname !== source.url || window.top !== window.self)
    throw new Error('The page changed before capture. Reopen the extension and try again.');
  if (document.querySelector('input[type="password"],[data-private="true"],[data-access="private"],.access-denied, .page-user-login') ||
      /(?:sign in|log in|access denied|authentication required|page not found|404)(?:\s*[|:–-]|$)/i.test(document.title))
    throw new Error('This page looks restricted or unavailable. Nothing was captured.');
  const excluded='script,style,template,noscript,form,input,textarea,select,button,nav,aside,header,footer,iframe,object,embed,[hidden],[inert],[aria-hidden="true"],[contenteditable]:not([contenteditable="false"]),.comment,.comments,.user-info,.author,.node__meta,.profile,.toolbar,.forum-topic__meta,.forum-topic__attachments,.forum-topic__comments-list,.forum-topic__replies-header';
  const sectionAnchor=options?.sectionAnchor;
  const scoped=sectionAnchor!==undefined;
  const anchorPattern=/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$/;
  const versionedDoc=/^https:\/\/techdocs\.zebra\.com\/[a-z][a-z0-9-]*\/\d{1,4}(?:-\d{1,4}){1,4}\//;
  if(scoped&&(source.kind!=='techdocs'||!versionedDoc.test(source.url)||
      typeof sectionAnchor!=='string'||!anchorPattern.test(sectionAnchor)||
      options.includeTableCellMap===true||options.includeSameOriginLinks===true))
    throw new Error('Choose one named section on a supported versioned public TechDocs page.');
  let root;
  if (source.kind === 'forum') {
    // A generic forum node content wrapper may include replies and account details.
    // Require a positively identified body, even if an unsupported layout is omitted.
    const selector=['article.node--type-forum main.forum-topic__content .forum-topic__body','article.forum-topic-page .forum-topic__body','main article.node--type-forum .field--name-body','main .node-forum .field-name-body','main .node--type-forum .field--name-body','[role="main"] article.node--type-forum .field--name-body'];
    for (const s of selector) {
      const matches=[...document.querySelectorAll(s)].filter(el=>!el.closest(excluded));
      if (matches.length===1) {root=matches[0];break;}
      if (matches.length>1) throw new Error('The original forum post could not be identified uniquely.');
    }
  } else if(scoped&&source.url==='https://techdocs.zebra.com/stagenow/3-1/csp/ui/') {
    // This legacy template has no current TechDocs main/article selector.
    // A generic Bootstrap column is not an approved article root.
    const matches=[...document.querySelectorAll('section#services')];
    if(matches.length!==1||matches[0].closest(excluded))
      throw new Error('The legacy documentation article could not be identified uniquely.');
    root=matches[0];
  } else {
    for (const s of ['#mainContent .service-box','#mainContent','main article','main .article','main .doc-content','main #content','main #markdown-content','main','[role="main"]']) {
      const matches=[...document.querySelectorAll(s)].filter(el=>!el.closest(excluded));
      if (matches.length===1) {root=matches[0];break;}
      if (matches.length>1) throw new Error('The documentation article could not be identified uniquely.');
    }
  }
  if (!root) throw new Error('No identifiable public article body. Nothing was captured.');
  const encoder=new TextEncoder();
  const clip=(s,max)=>{
    let out='',n=0;
    for(const ch of s) {
      n+=encoder.encode(ch).byteLength;
      if(n>max) break;
      out+=ch;
    }
    return out;
  };
  const allowed='h1,h2,h3,h4,h5,h6,p,li,pre,tr,blockquote';
  const restricted=value=>/-----BEGIN (?:[A-Z]+ )*PRIVATE KEY-----/.test(value) ||
        /(?:^|\s)(?:password|api[_ -]?key|secret[_ -]?key|access[_ -]?token|client[_ -]?secret)\s*[:=]\s*['"]?[A-Za-z0-9+/_.-]{16,}/i.test(value) ||
        (source.kind==='forum' && /(?:^|[^A-Za-z0-9+/])[A-Za-z0-9+/]{64,}={0,2}(?=$|[^A-Za-z0-9+/])/.test(value));
  const blocks=[];
  const tableOptIn=source.kind==='techdocs'&&options?.includeTableCellMap===true;
  const rows=[];let omittedRows=0;
  let size=0, truncated=false, examined=0, remainingTextNodes=18000;
  const presentation=new WeakMap();
  const visible=(el)=>{
    for(let n=el,child=null; n; child=n,n=n.parentElement){
      if(n.matches(excluded))return false;
      // A closed details element renders only its first direct summary branch.
      if(n.localName==='details' && n.getAttribute('open')===null &&
        (!child || child.localName!=='summary' || child!==Array.from(n.children).find(e=>e.localName==='summary')))return false;
      let shown=presentation.get(n);
      if(shown===undefined){
        const style=getComputedStyle(n);
        shown=style.display!=='none'&&style.visibility!=='hidden'&&style.visibility!=='collapse'&&style.contentVisibility!=='hidden'&&Number.parseFloat(style.opacity)!==0;
        presentation.set(n,shown);
      }
      if(!shown)return false;
    }
    return true;
  };
  const headingRank=el=>/^h[1-6]$/.test(el.localName)?Number(el.localName[1]):0;
  // These descendants belong to the enclosing text block and cannot define a section.
  // Otherwise that block could already include text after a reported boundary.
  const isSectionHeading=el=>headingRank(el)>0&&!el.parentElement?.closest('pre,td,th,li,blockquote,p')&&visible(el);
  let heading=null, inSection=!scoped, boundary='article_end';
  if(scoped){
    // Search only for an actual ID, not visible label or a synthetic anchor.
    // Count hidden and out-of-root copies too so a fragment cannot be ambiguous.
    const ids=document.querySelectorAll('[id="'+sectionAnchor+'"]');
    if(ids.length!==1||!root.contains(ids[0])||!isSectionHeading(ids[0]))
      throw new Error('The approved section has no unique visible native heading.');
    heading=ids[0];
  }
  const cellBreaks='address,div,section,p,li,pre,blockquote,dl,dt,dd,h1,h2,h3,h4,h5,h6';
  // Traverse text and explicit breaks together in DOM order. Preserve whitespace
  // in standalone code; prose source wrapping is not a rendered line break.
  const plain=(el,mode)=>{
    const iterator=document.createTreeWalker(el,NodeFilter.SHOW_TEXT|NodeFilter.SHOW_ELEMENT);
    const parts=[];
    const cell=mode==='cell', link=mode==='link';
    const ownerOf=parent=>cell?(parent.closest(cellBreaks)||el):(parent.closest(allowed)||el);
    let node, budget=limits.blockBytes*3, owner=null;
    const add=(value)=>{
      if(!budget){truncated=true;return;}
      const cut=value.slice(0,budget);
      if(cut.length<value.length)truncated=true;
      parts.push(cut);budget-=cut.length;
    };
    while((node=iterator.nextNode())) {
      if(--remainingTextNodes<0){truncated=true;break;}
      if(!budget){truncated=true;break;}
      const isText=node.nodeType===3;
      const parent=isText?node.parentElement:node;
      if(!visible(parent))continue;
      const nextOwner=ownerOf(parent);
      if(cell){
        if(parent.closest('td,th')!==el)continue; // nested-table rows capture separately
        if(isText && !node.data.trim()){
          if(owner===nextOwner && node.data) add(node.data);
          continue; // formatting whitespace between blocks must not add lines
        }
        if(!isText&&node.localName!=='br')continue;
        if(owner&&owner!==nextOwner&&parts.at(-1)!==null)parts.push(null);
        owner=nextOwner;
      }else if(link?parent.closest('a')!==el:parent!==el&&nextOwner!==el)continue;
      if(isText)add(node.data);
      else if(node.localName==='br')parts.push(null);
    }
    const control=/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]|\p{Surrogate}/gu;
    if(mode==='code')return parts.map(x=>x===null?'\n':x).join('').replace(control,'');
    const lines=[''];
    for(const part of parts){
      if(part===null)lines.push('');
      else lines[lines.length-1]+=part.replace(control,'');
    }
    return lines.map(line=>line.replace(/\s+/g,' ').trim()).join('\n');
  };
  for (const el of root.querySelectorAll(allowed)) {
    if(++examined>6000 || remainingTextNodes<=0) {truncated=true;break;}
    if(!inSection){
      if(el!==heading)continue;
      inSection=true;
    }else if(scoped&&el!==heading&&headingRank(el)<=headingRank(heading)&&isSectionHeading(el)){
      boundary='next_heading';
      break;
    }
    if(!visible(el))continue;
    const tag=el.localName;
    if(tag!=='pre'&&el.parentElement?.closest('pre'))continue;
    if(tag!=='tr'&&el.parentElement?.closest('td,th'))continue; // cells own their semantics
    if(tag==='tr'&&el.cells.length>40)truncated=true;
    const rowCells=tag==='tr'?Array.prototype.slice.call(el.cells,0,40).filter(visible):null;
    const beforeTextBudget=remainingTextNodes;
    const wasTruncated=truncated;
    const cellTexts=rowCells?.map(e=>plain(e,'cell'));
    const value=cellTexts?cellTexts.join(' | '):plain(el,tag==='pre'?'code':'prose');
    if (!value.trim()) continue;
    if (restricted(value))throw new Error('Potential credentials or opaque identifiers detected; nothing was captured.');
    if (blocks.length>=limits.blocks || size>=limits.totalBytes){truncated=true;break;}
    const next=clip(value,Math.min(limits.blockBytes,limits.totalBytes-size));
    if (next!==value) truncated=true;
    if(!next.trim())break;
    const kind=tag==='p'?(el.parentElement.closest('blockquote')?'quote':el.parentElement.closest('li')?'list_item':'paragraph'):tag==='li'?'list_item':tag==='pre'?'code':tag==='tr'?'table_row':tag==='blockquote'?'quote':'heading';
    const block={kind,text:next};
    if(kind==='heading')block.level=Number(tag[1]);
    if(el.id && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$/.test(el.id))block.anchor=el.id;
    if(tableOptIn&&rowCells){
      const complete=!wasTruncated&&!truncated&&value===next&&beforeTextBudget>0&&remainingTextNodes>0&&
        rowCells.length===el.cells.length&&rowCells.length>0&&rowCells.length<=12&&rows.length<32&&
        rowCells.every((c,i)=>c.parentElement===el&&(c.localName==='td'||c.localName==='th')&&
          [null,'1'].includes(c.getAttribute('rowspan'))&&[null,'1'].includes(c.getAttribute('colspan'))&&
          c.querySelectorAll('table').length===0&&cellTexts[i].trim().length>0);
      if(complete){
        let start=0;
        const cells=rowCells.map((c,column_index)=>{
          const end=start+cellTexts[column_index].length;
          const range={column_index,cell_kind:c.localName,start_utf16:start,end_utf16:end};
          start=end+3;
          return range;
        });
        rows.push({block_index:blocks.length,cells});
      }else ++omittedRows;
    }
    blocks.push(block);size+=encoder.encode(next).byteLength;
  }
  if(!blocks.length) throw new Error('No supported public text blocks were found.');
  // The browser tab's title is page metadata, not an arbitrary heading in hidden DOM.
  // If it is empty, fall back only to an already visibility-checked article heading.
  const title=(document.title?.trim()||blocks.find(b=>b.kind==='heading')?.text||'').trim().replace(/[\u0000-\u001f\u007f-\u009f]/g,' ');
  if(!title.trim())throw new Error('A document title could not be identified.');
  if(restricted(title))throw new Error('Potential credentials or opaque identifiers detected; nothing was captured.');
  const boundedTitle=clip(title,limits.titleBytes);
  if(boundedTitle!==title)truncated=true;
  const capture={schema_version:'zebra-doc-capture/v1',source_url:source.url,captured_at:new Date().toISOString(),title:boundedTitle,source_kind:source.kind,blocks,truncated:scoped||truncated};
  if(scoped){
    if(blocks[0]?.kind!=='heading'||blocks[0].anchor!==sectionAnchor||blocks.length<2)
      throw new Error('The approved section or its body was not retained.');
    return {capture,section_scope:{schema_version:'zebra-section-scope/v1',heading_anchor:sectionAnchor,
      boundary:truncated?'capture_limit':boundary,whole_article:false}};
  }
  const table_cell_map={schema_version:'zebra-table-cell-map/v1',rows,omitted_rows:omittedRows,capture_truncated:capture.truncated};
  if(options?.includeSameOriginLinks!==true)return tableOptIn?{capture,table_cell_map}:capture;
  // Opt-in only: discover visible candidates without visiting them. Use the
  // captured URL as base, not a potentially overriding HTML <base> element.
  const discovered_links=[], linked=new Set();
  const sensitivePath=/^(?:login|logout|log-in|sign-in|signin|register|signup|account|user|users|admin|internal|private|download|oauth|sso|search|ticket|support-portal)(?:$|[-_.])/i;
  let examinedLinks=0, link_discovery='filtered_scan_finished';
  for(const a of root.querySelectorAll('a[href]')){
    if(discovered_links.length>=20){link_discovery='retained_link_limit';break;}
    if(examinedLinks>=160){link_discovery='candidate_scan_limit';break;}
    ++examinedLinks;
    if(!visible(a)||a.getAttribute('download')!==null)continue;
    const raw=a.getAttribute('href');
    if(!raw||raw.length>1800||raw.startsWith('//')||/[?%\\\u0000-\u0020\u007f]/u.test(raw))continue;
    if(raw.split(/[\/#]/).some(s=>sensitivePath.test(s)))continue;
    let u;
    try{u=new URL(raw,source.url);}catch{continue;}
    if(u.origin!==current.origin||u.username||u.password||u.search)continue;
    if(/\/\//.test(u.pathname)||u.pathname.split('/').some(s=>sensitivePath.test(s)))continue;
    if(source.kind==='techdocs'){
      if(!/^\/[a-z][a-z0-9-]+\/(?:[A-Za-z0-9_.-]+\/)*[A-Za-z0-9_.-]*$/.test(u.pathname)||/\.(?!html$)[a-z]{2,}$/i.test(u.pathname))continue;
    }else if(!/^\/(?:content\/[a-z0-9][a-z0-9-]{1,170}|forum\/[1-9][0-9]{0,11})\/?$/.test(u.pathname))continue;
    if(u.hash&&!/^#[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$/.test(u.hash))continue;
    if(u.href.length>1800||linked.has(u.href)||(u.href===source.url&&!u.hash))continue;
    const label=clip(plain(a,'link').trim().replace(/\s+/g,' '),300);
    if(restricted(label))continue;
    linked.add(u.href);
    discovered_links.push(label?{target_url:u.href,label}:{target_url:u.href});
  }
  return {capture,discovered_links,link_discovery,...(tableOptIn?{table_cell_map}:{})};
}

export async function readActiveTab(chromeApi) {
  const [tab]=await chromeApi.tabs.query({active:true,currentWindow:true});
  if (!tab || !Number.isInteger(tab.id)) throw new Error('No active tab was found.');
  return {tabId:tab.id,source:checkSource(tab.url)};
}

export async function captureActive(chromeApi, expected) {
  const {tabId,source}=await readActiveTab(chromeApi);
  if (!expected || expected.tabId!==tabId || expected.source?.url!==source.url) throw new Error('The active page changed before capture.');
  const [response]=await chromeApi.scripting.executeScript({target:{tabId,frameIds:[0]},world:'ISOLATED',func:capturePage,args:[source,LIMITS]});
  const packet=response?.result;
  if (response?.frameId!==0 || packet?.schema_version!==SCHEMA || packet.source_url!==source.url || packet.source_kind!==source.kind || !Array.isArray(packet.blocks) || !packet.blocks.length) throw new Error('Capture did not finish on the selected page.');
  return packet;
}

/** Manual adapter entry point only; the default popup capture is unchanged. */
export async function captureMirrorActive(chromeApi, expected) {
  const {tabId,source}=await readActiveTab(chromeApi);
  if (!expected || expected.tabId!==tabId || expected.source?.url!==source.url) throw new Error('The active page changed before capture.');
  const [response]=await chromeApi.scripting.executeScript({target:{tabId,frameIds:[0]},world:'ISOLATED',func:capturePage,args:[source,LIMITS,{includeSameOriginLinks:true}]});
  const result=response?.result, packet=result?.capture;
  if (response?.frameId!==0||packet?.schema_version!==SCHEMA||packet.source_url!==source.url||
      packet.source_kind!==source.kind||!Array.isArray(packet.blocks)||!packet.blocks.length||
      !Array.isArray(result.discovered_links)||result.discovered_links.length>20)
    throw new Error('Mirror capture did not finish on the selected page.');
  if(result.link_discovery!==undefined&&!['filtered_scan_finished','retained_link_limit','candidate_scan_limit'].includes(result.link_discovery))
    throw new Error('Invalid mirror link discovery status.');
  const origin=new URL(source.url).origin;
  for(const link of result.discovered_links){
    if(typeof link?.target_url!=='string')throw new Error('Malformed mirror link.');
    const u=new URL(link.target_url);
    const checked=checkSource(u.href);
    if(u.href!==link.target_url||u.origin!==origin||checked.kind!==source.kind||
       (u.hash&&!/^#[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$/.test(u.hash)))
      throw new Error('Invalid mirror link.');
  }
  return result;
}

/** Explicit opt-in in the currently approved public TechDocs tab; no popup behavior changes. */
export async function captureTableActive(chromeApi, expected, {approved=false}={}) {
 if(approved!==true)throw new Error('Explicit local table capture approval is required.');
 const {tabId,source}=await readActiveTab(chromeApi);
 if(source.kind!=='techdocs'||expected?.tabId!==tabId||expected.source?.url!==source.url)
   throw new Error('The selected public TechDocs page changed before capture.');
 const [r]=await chromeApi.scripting.executeScript({target:{tabId,frameIds:[0]},world:'ISOLATED',
   func:capturePage,args:[source,LIMITS,{includeTableCellMap:true}]});
 const out=r?.result, cap=out?.capture, map=out?.table_cell_map;
 const invalid=()=>{throw new Error('Invalid local table-cell capture.');};
 const exact=(x, keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
 if(r?.frameId!==0||!exact(out,['capture','table_cell_map'])||
    !exact(cap,['schema_version','source_url','captured_at','title','source_kind','blocks','truncated'])||
    !exact(map,['schema_version','rows','omitted_rows','capture_truncated'])||
    cap?.schema_version!==SCHEMA||cap.source_url!==source.url||cap.source_kind!=='techdocs'||
    !Array.isArray(cap.blocks)||!cap.blocks.length||cap.blocks.length>LIMITS.blocks||typeof cap.truncated!=='boolean'||
    map?.schema_version!=='zebra-table-cell-map/v1'||!Array.isArray(map.rows)||map.rows.length>32||
    !Number.isInteger(map.omitted_rows)||map.omitted_rows<0||map.omitted_rows>cap.blocks.length||map.capture_truncated!==cap.truncated)invalid();
 if(cap.blocks.some(b=>!exact(b,['kind','text',...(Object.hasOwn(b??{},'anchor')?['anchor']:[]),...(Object.hasOwn(b??{},'level')?['level']:[])]))||
    map.rows.length+map.omitted_rows!==cap.blocks.filter(b=>b.kind==='table_row').length)invalid();
 let last=-1;
 for(const row of map.rows) {
  const index=row?.block_index, b=cap.blocks[index];
  if(!exact(row,['block_index','cells'])||!Number.isInteger(index)||index<=last||b?.kind!=='table_row'||typeof b.text!=='string'||
     !Array.isArray(row.cells)||!row.cells.length||row.cells.length>12)invalid();
  last=index;let start=0,end=0;
  for(const [i,c] of row.cells.entries()){
   if(!exact(c,['column_index','cell_kind','start_utf16','end_utf16'])||c.column_index!==i||!['td','th'].includes(c.cell_kind)||c.start_utf16!==start||
      !Number.isInteger(c.end_utf16)||c.end_utf16<=start||c.end_utf16>b.text.length)invalid();
   end=c.end_utf16;
   const text=b.text.slice(start,end);
   if(!text.trim()||/\p{Surrogate}/u.test(text)||(i+1<row.cells.length&&b.text.slice(end,end+3)!==' | '))invalid();
   start=end+3;
  }
  if(end!==b.text.length)invalid();
 }
 return out;
}


/** Explicit exact-page native-heading capture; no network, extra permissions or popup integration. */
export async function captureSectionActive(chromeApi, expected, {approved=false, sectionAnchor}={}) {
  const bad=()=>{throw new Error('The selected documentation section could not be captured.');};
  if(approved!==true||typeof sectionAnchor!=='string'||!/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$/.test(sectionAnchor)||
     expected?.sectionAnchor!==sectionAnchor)bad();
  const {tabId,source}=await readActiveTab(chromeApi);
  if(source.kind!=='techdocs'||!/^https:\/\/techdocs\.zebra\.com\/[a-z][a-z0-9-]*\/\d{1,4}(?:-\d{1,4}){1,4}\//.test(source.url)||
     expected?.tabId!==tabId||expected.source?.url!==source.url)bad();
  const [r]=await chromeApi.scripting.executeScript({target:{tabId,frameIds:[0]},world:'ISOLATED',
    func:capturePage,args:[source,LIMITS,{sectionAnchor}]});
  const out=r?.result, cap=out?.capture, scope=out?.section_scope;
  const exact=(x,keys)=>x&&typeof x==='object'&&!Array.isArray(x)&&Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
  if(r?.frameId!==0||!exact(out,['capture','section_scope'])||
     !exact(cap,['schema_version','source_url','captured_at','title','source_kind','blocks','truncated'])||
     !exact(scope,['schema_version','heading_anchor','boundary','whole_article'])||
     cap.schema_version!==SCHEMA||cap.source_url!==source.url||cap.source_kind!=='techdocs'||cap.truncated!==true||
     !Array.isArray(cap.blocks)||cap.blocks.length<2||cap.blocks.length>LIMITS.blocks||
     cap.blocks[0]?.kind!=='heading'||cap.blocks[0]?.anchor!==sectionAnchor||
     scope.schema_version!=='zebra-section-scope/v1'||scope.heading_anchor!==sectionAnchor||scope.whole_article!==false||
     !['capture_limit','article_end','next_heading'].includes(scope.boundary))bad();
  return out;
}
