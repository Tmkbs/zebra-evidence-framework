import {checkSource, readActiveTab, captureMirrorActive} from './capture.js';
import {createMirrorCache, normalizeCapture} from './engine.js';

function canonical(url) {
  const source=checkSource(url);
  if(source.url!==url)throw new Error('Select an exact canonical public page URL.');
  return source;
}

/** Call from an explicit UI, not from a background handler. Extension API is injected. */
export function createCaptureMirrorSession(chromeApi, {roots, budget}={}) {
  if(!Array.isArray(roots))throw new Error('Select exact public page roots before starting.');
  const approvedRoots=new Set(roots.map(url=>canonical(url).url));
  let cache=createMirrorCache({roots:[...roots],allowed_origins:[...new Set(roots.map(url=>new URL(url).origin))],budget});
  let epoch=0, busy=false, staged=new Set(), preview=null;
  const requireIdle=()=>{if(busy)throw new Error('Capture already in progress.');};
  async function capture({approved=false,expected}={}) {
    requireIdle();
    if(approved!==true||!expected||!Number.isInteger(expected.tabId))throw new Error('Confirm the selected public page before capturing.');
    const source=canonical(expected.source?.url);
    if(!approvedRoots.has(source.url)||staged.has(source.url))throw new Error('This page is outside the selected roots or already staged.');
    const generation=epoch;
    busy=true;
    preview=null;
    try {
      const row=await captureMirrorActive(chromeApi,{tabId:expected.tabId,source});
      const result=normalizeCapture(row.capture);
      if(generation!==epoch)throw new Error('Mirror session was cleared; capture discarded.');
      const token={};
      preview={token,result,links:structuredClone(row.discovered_links)};
      return {token,packet:structuredClone(result),links:structuredClone(preview.links)};
    } finally {
      busy=false;
    }
  }
  function stage({approved=false, token}={}) {
    requireIdle();
    if(approved!==true||!preview||preview.token!==token)throw new Error('Review and approve this capture before staging.');
    const {result,links}=preview;
    const count=cache.stage({capture:result,discovered_links:links});
    staged.add(result.source_url);
    preview=null;
    return count;
  }
  function build({approved=false}={}) {
    requireIdle();
    if(approved!==true||!staged.size)throw new Error('Approve building after at least one reviewed page is staged.');
    return cache.build();
  }
  function clear() {
    ++epoch;
    staged.clear();
    preview=null;
    return cache.clear();
  }
  return Object.freeze({selectActive:()=>readActiveTab(chromeApi),capture,stage,build,clear});
}
