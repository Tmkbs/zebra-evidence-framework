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
  if (u.hostname === 'developer.zebra.com' && /^\/content\/[a-z0-9][a-z0-9-]{1,170}\/?$/.test(path)) return {url:u.origin+path,kind:'forum'};
  throw new Error('Use a public TechDocs article or a Zebra Developer forum topic.');
}

// Chrome serializes this function for isolated execution. No module globals, page writes or requests.
export function capturePage(source, limits) {
  const current = new URL(location.href);
  if (current.protocol !== 'https:' || current.search || current.username || current.password || current.origin+current.pathname !== source.url || window.top !== window.self)
    throw new Error('The page changed before capture. Reopen the extension and try again.');
  if (document.querySelector('input[type="password"],[data-private="true"],[data-access="private"],.access-denied, .page-user-login') ||
      /(?:sign in|log in|access denied|authentication required|page not found|404)(?:\s*[|:–-]|$)/i.test(document.title))
    throw new Error('This page looks restricted or unavailable. Nothing was captured.');
  const excluded='script,style,template,noscript,form,input,textarea,select,button,nav,aside,header,footer,iframe,object,embed,[hidden],[inert],[aria-hidden="true"],[contenteditable]:not([contenteditable="false"]),.comment,.comments,.user-info,.author,.node__meta,.profile,.toolbar,.forum-topic__meta,.forum-topic__attachments,.forum-topic__comments-list,.forum-topic__replies-header';
  let root;
  if (source.kind === 'forum') {
    const selector=['article.node--type-forum main.forum-topic__content .forum-topic__body','article.forum-topic-page .forum-topic__body','main article.node--type-forum .field--name-body','main article.node--type-forum .node__content','main .node-forum .field-name-body','main .node--type-forum .field--name-body','[role="main"] article.node--type-forum .field--name-body'];
    for (const s of selector) {
      const matches=[...document.querySelectorAll(s)].filter(el=>!el.closest(excluded));
      if (matches.length===1) {root=matches[0];break;}
      if (matches.length>1) throw new Error('The original forum post could not be identified uniquely.');
    }
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
  let size=0, truncated=false, examined=0, remainingTextNodes=18000;
  const visible=(el)=>{
    for(let n=el; n; n=n.parentElement){
      if(n.matches(excluded))return false;
      const style=getComputedStyle(n);
      if(style.display==='none'||style.visibility==='hidden'||style.contentVisibility==='hidden')return false;
      if(n===root)break;
    }
    return true;
  };
  // Bound consumption even when a page embeds an unexpectedly large text node.
  const plain=(el,code)=>{
    const iterator=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
    const parts=[];
    let node, budget=limits.blockBytes*3;
    while((node=iterator.nextNode())) {
      if(--remainingTextNodes<0){truncated=true;break;}
      if(!visible(node.parentElement))continue;
      if(node.parentElement!==el && node.parentElement.closest(allowed)!==el && !['td','th'].includes(el.localName))continue;
      if(!budget){truncated=true;break;}
      const cut=node.data.slice(0,budget);
      if(cut.length<node.data.length)truncated=true;
      parts.push(cut);budget-=cut.length;
    }
    const s=parts.join('').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g,'');
    return code?s:s.replace(/\s+/g,' ').trim();
  };
  for (const el of root.querySelectorAll(allowed)) {
    if(++examined>6000 || remainingTextNodes<=0) {truncated=true;break;}
    if(!visible(el))continue;
    const tag=el.localName;
    if(tag!=='pre'&&el.parentElement?.closest('pre'))continue;
    if(tag==='tr'&&el.cells.length>40)truncated=true;
    let value=tag==='tr'?Array.prototype.slice.call(el.cells,0,40).filter(visible).map(e=>e.querySelector(allowed)?[...e.querySelectorAll('p')].filter(visible).map(p=>plain(p,false)).join(' '):plain(e,false)).join(' | '):plain(el,tag==='pre');
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
    blocks.push(block);size+=encoder.encode(next).byteLength;
  }
  if(!blocks.length) throw new Error('No supported public text blocks were found.');
  const title=(document.querySelector('article.forum-topic-page h1,main h1,[role="main"] h1')?.innerText||document.title||'').trim().replace(/[\u0000-\u001f\u007f-\u009f]/g,' ');
  if(!title.trim())throw new Error('A document title could not be identified.');
  if(restricted(title))throw new Error('Potential credentials or opaque identifiers detected; nothing was captured.');
  const boundedTitle=clip(title,limits.titleBytes);
  if(boundedTitle!==title)truncated=true;
  return {schema_version:'zebra-doc-capture/v1',source_url:source.url,captured_at:new Date().toISOString(),title:boundedTitle,source_kind:source.kind,blocks,truncated};
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
