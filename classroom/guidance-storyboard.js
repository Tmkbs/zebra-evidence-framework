/* Portable, source-linked visual walkthrough. All scenes are authored
 * conceptual illustrations driven by the existing verified guidance map.
 * No device screen capture, model, remote media, speech API, or network.
 */
(function(root,factory){
 const api=factory();
 if(typeof module==="object"&&module.exports)module.exports=api;
 else root.ZebraStoryboard=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
"use strict";
const NS="http://www.w3.org/2000/svg";
const themes={ink:"#17393f",muted:"#536e78",line:"#adc1c5",teal:"#08796d",wash:"#e9f5f1",paper:"#f4f7f8",amber:"#a46a21",amberWash:"#fff0d9",white:"#ffffff"};
function build(map){
 if(!map||map.schema!=="zebra-visual-guide/v1"||!Array.isArray(map.nodes)||!Array.isArray(map.columns))throw Error("Expected a visual guidance map");
 const by=new Map(map.nodes.map(n=>[n.id,n]));
 const ids=map.columns.flat();
 if(!ids.length||ids.length>12||new Set(ids).size!==ids.length||ids.some(id=>!by.has(id)))throw Error("Invalid storyboard node sequence");
 const frames=ids.map((id,index)=>{
  const n=by.get(id);
  return {id,index,title:n.title,caption:n.detail,status:n.status,evidence:(n.evidence||[]).map(e=>({...e})),duration_ms:6000};
 });
 const scene=map.kind==="scan_prerequisite"?"diagnostic":map.kind==="result_discrepancy"?"comparison":map.kind==="configuration_hierarchy"?"containment":map.kind==="profile_learning"?"data_path":map.kind==="reported_path_comparison"?"reported_paths":"scope";
 return {schema:"zebra-visual-storyboard/v1",kind:map.kind,scene,title:map.title,frames,
  next_check:map.next,representation:"authored_conceptual_illustration",video_file:false,model_generated:false,device_tested:false,
  total_duration_ms:frames.reduce((n,f)=>n+f.duration_ms,0)};
}
function clampIndex(story,index){
 return Math.min(story.frames.length-1,Math.max(0,Number.isFinite(index)?Math.trunc(index):0));
}
function createSVG(doc,map,story,index,onSelect=()=>{}){
 const c=themes,frame=story.frames[clampIndex(story,index)],by=new Map(map.nodes.map(n=>[n.id,n]));
 const element=(tag,attrs={},value)=>{const n=doc.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));if(value!==undefined)n.textContent=String(value);return n};
 const svg=element("svg",{viewBox:"0 0 640 292",role:"group","aria-label":story.title+" — "+frame.title,xmlns:NS});
 svg.append(element("title",{},story.title),element("desc",{},"Conceptual visual explanation. Select an illustrated component to inspect its source and explanation. No live device operation."));
 const rect=(p,x,y,w,h,fill=c.paper,stroke=c.line,rx=12,sw=1.5)=>{const v=element("rect",{x,y,width:w,height:h,rx,fill,stroke,"stroke-width":sw});p.append(v);return v};
 const line=(p,x1,y1,x2,y2,stroke=c.line,sw=2,dash="")=>{const v=element("line",{x1,y1,x2,y2,stroke,"stroke-width":sw,"stroke-linecap":"round",...(dash?{"stroke-dasharray":dash}:{})});p.append(v);return v};
 const path=(p,d,stroke=c.ink,sw=2.5,fill="none")=>{const v=element("path",{d,stroke,"stroke-width":sw,fill,"stroke-linecap":"round","stroke-linejoin":"round"});p.append(v);return v};
 const circle=(p,cx,cy,r,fill,stroke="none")=>{const v=element("circle",{cx,cy,r,fill,stroke,"stroke-width":1.5});p.append(v);return v};
 const text=(p,x,y,value,size=16,fill=c.ink,weight=600,anchor="start",family="system-ui, sans-serif")=>p.append(element("text",{x,y,"font-size":size,fill,"font-weight":weight,"text-anchor":anchor,"font-family":family},value));
 const group=(id,label=by.get(id)?.title||id)=>{
  const g=element("g",{tabindex:"0",role:"button","aria-label":label,"aria-pressed":String(frame.id===id),"data-story-hotspot":id});
  const activate=()=>onSelect(id);
  g.addEventListener("click",activate);g.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();activate()}});
  svg.append(g);return g;
 };
 const active=id=>frame.id===id;
 const stroke=id=>active(id)?c.teal:c.line;
 const fill=id=>active(id)?c.wash:c.white;
 const mono="ui-monospace, Consolas, monospace";
 function arrow(x1,y,x2,color=c.line){
  line(svg,x1,y,x2-7,y,color,2.5);
  path(svg,"M"+(x2-13)+" "+(y-5)+" L"+(x2-6)+" "+y+" L"+(x2-13)+" "+(y+5),color,2.5);
 }
 rect(svg,1,1,638,290,c.paper,"#dce5e7",16,1);
 text(svg,20,25,"CONCEPTUAL VIEW",10,c.muted,750);
 if(story.scene==="diagnostic"){
  const g=group("command");
  rect(g,20,54,123,148,fill("command"),stroke("command"),14,active("command")?3:1.5);
  rect(g,57,69,48,71,c.white,c.ink,7,2);
  line(g,68,80,94,80,c.line,2);line(g,68,88,94,88,c.line,2);
  path(g,"M70 105 L92 105 L81 118 Z",c.teal,2,c.wash);
  circle(g,81,131,2.7,c.ink);
  text(g,81,161,"App",16,c.ink,700,"middle");
  text(g,81,180,"Trigger",13,c.muted,600,"middle");
  arrow(145,128,168,map.next.id==="profile"?c.teal:c.line);
  const profile=group("profile"),ps=map.state.profile;
  rect(profile,170,54,134,148,ps==="disabled"?c.amberWash:fill("profile"),active("profile")?c.teal:ps==="disabled"?c.amber:stroke("profile"),14,active("profile")?3:1.5);
  rect(profile,188,72,98,66,c.white,c.line,7);
  line(profile,200,85,266,85,c.line,2);line(profile,200,96,237,96,c.line,2);
  rect(profile,207,109,60,18,ps==="enabled"?c.teal:ps==="disabled"?c.amber:"#a3b5bb","none",9);
  circle(profile,ps==="enabled"?257:217,118,7,c.white);
  text(profile,237,161,"Barcode Input",14,c.ink,700,"middle");
  text(profile,237,180,ps==="unknown"?"Not checked":ps==="enabled"?"Enabled":"Disabled",12,ps==="disabled"?c.amber:c.muted,650,"middle");
  arrow(306,128,330,map.next.id==="scanner"?c.teal:c.line);
  const scanner=group("scanner"),ss=map.state.scanner,waiting=ps!=="enabled";
  rect(scanner,332,54,134,148,!waiting&&ss==="busy"?c.amberWash:fill("scanner"),active("scanner")?c.teal:!waiting&&ss==="busy"?c.amber:stroke("scanner"),14,active("scanner")?3:1.5);
  rect(scanner,361,77,76,37,c.white,c.ink,8,2);
  path(scanner,"M371 114 L378 139 L398 139 L406 114",c.ink,2,c.white);
  for(let k=0;k<7;k++)line(scanner,369+k*9,84,369+k*9,106,k%2?c.ink:c.teal,k%3===0?3:1.3);
  text(scanner,399,161,"Scanner",15,c.ink,700,"middle");
  text(scanner,399,180,waiting?"Check profile first":ss==="unknown"?"Not checked":ss==="ready"?"Ready":"Busy",12,!waiting&&ss==="busy"?c.amber:c.muted,650,"middle");
  arrow(468,128,492,map.next.id==="outcome"?c.teal:c.line);
  const out=group("outcome");
  rect(out,494,54,126,148,fill("outcome"),stroke("outcome"),14,active("outcome")?3:1.5);
  rect(out,534,73,46,64,c.white,c.ink,5,2);
  path(out,"M543 87 L550 94 L560 82",c.teal,2.5);line(out,544,105,570,105,c.line,2);line(out,544,116,568,116,c.line,2);line(out,544,127,562,127,c.line,2);
  text(out,557,161,"Check logs",15,c.ink,700,"middle");
  text(out,557,180,"Not verified",12,c.muted,600,"middle");
  rect(svg,20,222,600,46,c.white,"#dce5e7",8,1);
  circle(svg,39,245,5,c.teal);
  text(svg,53,250,"Next check: "+(by.get(map.next.id)?.title||"Inspect evidence"),15,c.ink,650);
 }else if(story.scene==="comparison"){
  const q=group("question");
  rect(q,20,40,600,40,fill("question"),stroke("question"),9,active("question")?3:1.5);
  text(q,320,65,"One question · same documentation edition",16,c.ink,700,"middle");
  const left=group("overview");
  rect(left,20,98,282,110,fill("overview"),stroke("overview"),12,active("overview")?3:1.5);
  path(left,"M35 116 L47 112 L59 116 L59 135 L47 131 L35 135 Z M47 112 L47 131",c.teal,2);
  text(left,69,128,"Overview",15,c.ink,700);
  line(left,36,142,286,142,c.line,1);
  rect(left,36,154,250,36,c.white,c.line,6,1);
  text(left,161,178,"RECEIVE_RESULT",18,c.teal,750,"middle",mono);
  const right=group("prototype");
  rect(right,338,98,282,110,fill("prototype"),stroke("prototype"),12,active("prototype")?3:1.5);
  path(right,"M352 119 L347 125 L352 131 M367 119 L372 125 L367 131 M363 115 L356 135",c.teal,2);
  text(right,382,128,"Function prototype",15,c.ink,700);
  line(right,354,142,604,142,c.line,1);
  rect(right,354,154,250,36,c.white,c.line,6,1);
  text(right,479,178,"SEND_RESULT",18,c.teal,750,"middle",mono);
  line(svg,161,208,161,222,c.line,2);line(svg,479,208,479,222,c.line,2);line(svg,161,222,479,222,c.line,2);line(svg,320,222,320,234,c.line,2);
  const boundary=group("boundary");
  rect(boundary,140,234,360,42,active("boundary")?c.wash:c.amberWash,active("boundary")?c.teal:c.amber,9,active("boundary")?3:1.5);
  text(boundary,320,260,"?  Resolve with applicable evidence",15,c.ink,700,"middle");
 }else if(story.scene==="containment"){
  const main=group("main");
  rect(main,26,43,588,184,fill("main"),stroke("main"),16,active("main")?3:1.5);
  text(main,42,66,"SET_CONFIG",19,c.ink,750,"start",mono);
  text(main,596,65,"Main bundle",12,c.muted,600,"end");
  const plugin=group("plugin");
  rect(plugin,55,79,365,132,fill("plugin"),stroke("plugin"),12,active("plugin")?3:1.5);
  text(plugin,71,102,"PLUGIN_CONFIG",18,c.ink,750,"start",mono);
  text(plugin,404,102,"One plugin",11,c.muted,600,"end");
  const params=group("params");
  rect(params,85,117,305,76,active("params")?c.wash:c.white,stroke("params"),9,active("params")?3:1.5);
  text(params,100,145,"PARAM_LIST",17,c.teal,750,"start",mono);
  line(params,101,161,283,161,c.line,2);line(params,101,172,241,172,c.line,2);
  text(params,376,177,"Settings",11,c.muted,600,"end");
  rect(svg,436,79,160,132,c.paper,c.line,12,1.5);
  text(svg,516,105,"Another plugin",13,c.ink,650,"middle");
  rect(svg,449,120,134,73,c.white,c.line,8,1);
  text(svg,516,150,"Its own",13,c.muted,600,"middle");text(svg,516,169,"PARAM_LIST",13,c.teal,700,"middle",mono);
  const boundary=group("boundary");
  rect(boundary,26,239,588,37,active("boundary")?c.wash:c.white,stroke("boundary"),8,active("boundary")?3:1.5);
  text(boundary,320,263,"Structure only · validate actual parameter values and device behavior",12,c.ink,650,"middle");
 }else if(story.scene==="reported_paths"){
  // Two reported paths. The gap is an observation boundary, not an inferred
  // failed component. Both paths are conceptual, not captured device traces.
  const report=group("report");
  rect(report,18,40,604,34,fill("report"),stroke("report"),9,active("report")?3:1.5);
  text(report,320,62,"Public report · TC700K / DataWedge 6.2.23",14,c.ink,700,"middle");
  const test=group("test"),scan=group("scan");
  rect(test,18,89,604,70,fill("test"),stroke("test"),11,active("test")?3:1.5);
  rect(test,32,102,111,43,c.white,c.line,7);
  text(test,87,128,"ADB test",15,c.ink,750,"middle");
  line(test,153,124,412,124,c.teal,3);
  path(test,"M404 117 L416 124 L404 131",c.teal,3);
  text(test,285,114,"Test broadcast",12,c.muted,600,"middle");
  rect(test,430,102,177,43,c.wash,c.teal,7);
  text(test,518,120,"Xamarin receiver",13,c.ink,700,"middle");
  text(test,518,136,"Reported received",11,c.teal,700,"middle");
  rect(scan,18,171,604,70,fill("scan"),stroke("scan"),11,active("scan")?3:1.5);
  rect(scan,32,184,111,43,c.white,c.line,7);
  text(scan,87,201,"DataWedge",14,c.ink,750,"middle");
  text(scan,87,215,"Profile",11,c.muted,600,"middle");
  line(scan,153,206,412,206,c.amber,2.5,"5 5");
  text(scan,282,195,"Configured scan-delivery path",11,c.muted,600,"middle");
  circle(scan,282,206,9,c.amberWash,c.amber);
  text(scan,282,210,"?",12,c.amber,750,"middle");
  rect(scan,430,184,177,43,c.amberWash,c.amber,7);
  text(scan,518,202,"Xamarin receiver",13,c.ink,700,"middle");
  text(scan,518,218,"Reported not received",11,c.amber,700,"middle");
  const boundary=group("boundary");
  rect(boundary,18,251,604,29,fill("boundary"),stroke("boundary"),7,active("boundary")?3:1.5);
  text(boundary,320,270,"Separate the observations · root cause remains unresolved",12,c.ink,650,"middle");
 }else if(story.scene==="data_path"){
  // Concrete profile concept: capture -> optional formatting -> deliver -> app.
  // The illustrated data is a conceptual placeholder, not device output.
  const ids=["input","process","output","application"],names=["Capture","Format","Deliver","Use in app"],notes=["Input plugin","Optional process","Output plugin","Associated app"];
  for(let k=0;k<ids.length;k++){
   const id=ids[k],x=20+153*k,g=group(id);
   rect(g,x,61,141,152,fill(id),stroke(id),12,active(id)?3:1.5);
   if(k===0){
    rect(g,x+28,79,85,63,c.white,c.ink,7,1.8);
    for(let j=0;j<10;j++)line(g,x+40+j*6,89,x+40+j*6,124,c.ink,j%3===0?3:1.3);
    text(g,x+70,135,"DATA",10,c.muted,650,"middle",mono);
   }else if(k===1){
    rect(g,x+21,80,99,64,c.white,c.line,7,1.5);
    line(g,x+34,96,x+104,96,c.teal,2);
    line(g,x+34,112,x+92,112,c.line,2);
    line(g,x+34,128,x+101,128,c.line,2);
    circle(g,x+64,96,5,c.white,c.teal);circle(g,x+81,112,5,c.white,c.teal);circle(g,x+48,128,5,c.white,c.teal);
   }else if(k===2){
    rect(g,x+19,82,103,58,c.white,c.ink,7,1.6);
    rect(g,x+30,95,26,29,c.wash,c.teal,4,1.5);
    path(g,"M"+(x+61)+" 110 H"+(x+102)+" M"+(x+96)+" 104 L"+(x+103)+" 110 L"+(x+96)+" 116",c.teal,2.6);
   }else{
    rect(g,x+45,76,51,71,c.white,c.ink,6,1.8);
    rect(g,x+52,91,37,35,c.wash,c.line,4,1);
    line(g,x+58,101,x+83,101,c.teal,2);
    line(g,x+58,110,x+81,110,c.line,2);
    line(g,x+58,118,x+74,118,c.line,2);
    circle(g,x+71,137,2.5,c.ink);
   }
   text(g,x+70,171,names[k],16,c.ink,750,"middle");
   text(g,x+70,191,notes[k],11,c.muted,600,"middle");
   if(k<3)arrow(x+141,126,x+154,c.line);
  }
  rect(svg,20,229,600,43,c.white,c.line,8,1);
  text(svg,320,255,"A profile controls the data path. Specific feature support depends on the device and build.",12,c.ink,600,"middle");
 }else{
  // Generic fallback depicts the explanation sequence, not product mechanics.
  const n=story.frames.length,w=Math.min(180,Math.floor((600-(n-1)*15)/n));
  const start=(640-(w*n+15*(n-1)))/2;
  for(let k=0;k<n;k++){
   const f=story.frames[k],x=start+k*(w+15),g=group(f.id);
   rect(g,x,75,w,122,fill(f.id),stroke(f.id),12,active(f.id)?3:1.5);
   circle(g,x+w/2,112,17,active(f.id)?c.teal:c.line);
   text(g,x+w/2,118,k+1,16,c.white,750,"middle");
   const words=f.title.split(/\s+/);let rows=[""];
   for(const word of words){if((rows.at(-1)+" "+word).trim().length>16&&rows.at(-1))rows.push(word);else rows[rows.length-1]=(rows.at(-1)+" "+word).trim()}
   rows.slice(0,3).forEach((r,i)=>text(g,x+w/2,150+i*16,r.slice(0,21),13,c.ink,650,"middle"));
   if(k<n-1)arrow(x+w+2,136,x+w+14,c.line);
  }
  text(svg,320,235,"Clarify scope and inspect sources before giving detailed advice.",14,c.muted,600,"middle");
 }
 return svg;
}

/* Local, silent short-video export. The same source-linked SVG scenes used
 * by the interactive guide are rasterized to a canvas, captioned, and
 * encoded using the browser's own MediaRecorder. No remote asset, model,
 * speech service, capture permission, or paid API is involved.
 */
const CLIP_KINDS=new Set(["scan_prerequisite","result_discrepancy","configuration_hierarchy","profile_learning","reported_path_comparison"]);
function videoPlan(map){
 if(!map||!CLIP_KINDS.has(map.kind))return null;
 const story=build(map);
 if(!story.frames.some(f=>f.evidence.some(e=>typeof e.quote==="string"&&e.quote.length>0)))return null;
 const frames=story.frames.map(f=>{
  const caption=String(f.caption||"").trim();
  if(!caption||caption.length>520)throw Error("A short, complete scene caption is required");
  const words=caption.split(/\s+/).length;
  return {...f,caption,duration_ms:Math.max(5500,Math.min(10500,Math.ceil(words/3.2)*1000+1000))};
 });
 return {schema:"zebra-contextual-clip/v1",kind:story.kind,scene:story.scene,title:story.title,frames,
  total_duration_ms:frames.reduce((n,f)=>n+f.duration_ms,0),
  representation:"silent_captioned_conceptual_explainer",device_recording:false,device_tested:false,model_generated:false,
  source_links:[...new Set(frames.flatMap(f=>f.evidence.map(e=>e.url).filter(Boolean)))],
  scope:"Rendered from the reviewed visual guide; not a device reproduction or an independently validated answer."};
}
function videoSupport(doc){
 const win=doc?.defaultView;
 const canvas=doc?.createElement?.("canvas");
 if(!win?.MediaRecorder||!canvas||typeof canvas.captureStream!=="function"||!win.URL?.createObjectURL||!win.XMLSerializer)return "";
 return ["video/webm;codecs=vp8","video/webm;codecs=vp9","video/webm"].find(m=>win.MediaRecorder.isTypeSupported(m))||"";
}
function wrapCaption(ctx,value,width){
 const lines=[];let line="";
 for(const word of String(value||"").split(/\s+/).filter(Boolean)){
  // Avoid invisible truncation of long identifiers or a source caption.
  if(ctx.measureText(word).width>width)throw Error("Caption contains an overlong unbroken token");
  const next=line?line+" "+word:word;
  if(line&&ctx.measureText(next).width>width){lines.push(line);line=word}
  else line=next;
 }
 if(line)lines.push(line);return lines;
}
function fitText(ctx,value,width,maxLines,maxSize,minSize,weight=500){
 for(let size=maxSize;size>=minSize;size--){
  ctx.font=weight+" "+size+"px system-ui, sans-serif";
  let lines;try{lines=wrapCaption(ctx,value,width)}catch{continue}
  if(lines.length<=maxLines)return {size,lines};
 }
 throw Error("Caption cannot fit without losing content");
}
function drawLines(ctx,block,x,y,spacing){for(let i=0;i<block.lines.length;i++)ctx.fillText(block.lines[i],x,y+i*spacing)}
function sourceLabel(frame){
 const kinds=new Set(frame.evidence.map(e=>e.origin));
 const labels=[];
 if(kinds.has("public_forum_report"))labels.push("Archived public self-report");
 if(kinds.has("team_release_note"))labels.push("Team release summary (not official evidence)");
 if(kinds.has("retrieved_excerpt"))labels.push("Retrieved official excerpt");
 if(kinds.has("checked_source_card"))labels.push("Checked official source card");
 if(kinds.has("selected_link"))labels.push("Selected source link (not inspected)");
 const scopes=new Set();
 for(const e of frame.evidence){try{const u=new URL(e.url),p=u.pathname.split("/").filter(Boolean);if(u.hostname==="techdocs.zebra.com"&&p[0]&&/^\d+(?:-\d+)+$/.test(p[1]||""))scopes.add(p[0]+" "+p[1].replaceAll("-","."))}catch{}}
 return labels.length?labels.join(" / ")+(scopes.size?" · "+[...scopes].join(", "):""):"Conceptual transition; no additional source claim";
}
function clipCanvas(doc,map,plan,images){
 const canvas=doc.createElement("canvas");canvas.width=1280;canvas.height=720;
 const ctx=canvas.getContext("2d",{alpha:false});if(!ctx)throw Error("Canvas rendering unavailable");
 const heading=fitText(ctx,"TECHDOCS / "+plan.title,1030,1,17,12,700);
 const titles=plan.frames.map(f=>fitText(ctx,f.title,1168,1,34,22,700));
 const captions=plan.frames.map(f=>fitText(ctx,f.caption,1168,4,27,20,500));
 function draw(index,fraction){
  const frame=plan.frames[index],caption=captions[index];
  ctx.fillStyle="#f4f8f8";ctx.fillRect(0,0,1280,720);
  ctx.fillStyle="#176b64";ctx.font="700 "+heading.size+"px system-ui, sans-serif";drawLines(ctx,heading,54,35,20);
  ctx.fillStyle="#17393f";ctx.font="700 "+titles[index].size+"px system-ui, sans-serif";drawLines(ctx,titles[index],54,76,38);
  ctx.fillStyle="#526671";ctx.font="600 19px system-ui, sans-serif";ctx.textAlign="right";ctx.fillText((index+1)+" / "+plan.frames.length,1226,35);ctx.textAlign="left";
  ctx.fillStyle="#ffffff";ctx.fillRect(184,94,912,418);
  ctx.drawImage(images[index],184,94,912,416);
  ctx.fillStyle="#17393f";ctx.font="500 "+caption.size+"px system-ui, sans-serif";
  drawLines(ctx,caption,54,548,caption.size+5);
  ctx.fillStyle="#526671";ctx.font="600 17px system-ui, sans-serif";
  ctx.fillText(sourceLabel(frame),54,678);
  ctx.textAlign="right";ctx.fillText("Conceptual illustration · not a device recording",1226,700);ctx.textAlign="left";
  ctx.fillStyle="#d2e3e2";ctx.fillRect(0,713,1280,7);ctx.fillStyle="#08796d";
  ctx.fillRect(0,713,1280*(index+Math.max(0,Math.min(1,fraction)))/plan.frames.length,7);
 }
 return {canvas,draw};
}
function cancelled(signal){if(signal?.aborted)throw new Error("Video generation cancelled")}
async function svgImage(doc,svg,signal){
 const win=doc.defaultView,serialized=new win.XMLSerializer().serializeToString(svg);
 const url=win.URL.createObjectURL(new win.Blob([serialized],{type:"image/svg+xml;charset=utf-8"}));
 try{
  cancelled(signal);
  return await new Promise((resolve,reject)=>{
   const image=new win.Image();
   let done=false,timer;
   const finish=(err)=>{if(done)return;done=true;win.clearTimeout(timer);signal?.removeEventListener("abort",abort);image.onload=null;image.onerror=null;err?reject(err):resolve(image)};
   const abort=()=>finish(Error("Video generation cancelled"));
   image.onload=()=>finish();image.onerror=()=>finish(Error("Unable to rasterize visual scene"));
   timer=win.setTimeout(()=>finish(Error("Visual scene rasterization timed out")),5000);
   signal?.addEventListener("abort",abort,{once:true});image.src=url;
  });
 }finally{win.URL.revokeObjectURL(url)}
}
async function renderClip(map,{doc,signal,onProgress=()=>{},frameMs}={}){
 if(!doc?.defaultView)throw Error("Video encoding requires a browser document");
 const win=doc.defaultView,mime=videoSupport(doc),plan=videoPlan(map);
 if(!plan)throw Error("No reviewed contextual visual is available for video export");
 if(!mime)throw Error("This browser cannot encode a local WebM video");
 if(frameMs!==undefined&&(!Number.isFinite(frameMs)||frameMs<300||frameMs>11000))throw Error("Invalid frame duration");
 const durations=plan.frames.map(f=>frameMs??f.duration_ms),total=durations.reduce((n,d)=>n+d,0);
 if(total>60000)throw Error("Video exceeds the one-minute limit");
 const story=build(map),images=[];
 let stream=null,recorder=null,recorderError=null,stopResolve=null,stopWait=null;
 const chunks=[];
 const delay=ms=>new Promise(resolve=>win.setTimeout(resolve,ms));
 try{
  for(let i=0;i<story.frames.length;i++){cancelled(signal);images.push(await svgImage(doc,createSVG(doc,map,story,i),signal))}
  cancelled(signal);
  const {canvas,draw}=clipCanvas(doc,map,plan,images);
  draw(0,0);
  stream=canvas.captureStream(12);
  recorder=new win.MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:1500000});
  stopWait=new Promise(resolve=>{stopResolve=resolve});
  recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};
  recorder.onerror=e=>{recorderError=e.error||Error("Browser video encoding failed");stopResolve()};
  recorder.onstop=()=>stopResolve();
  recorder.start(500);
  let elapsed=0;
  for(let i=0;i<durations.length;i++){
   const start=win.performance.now(),duration=durations[i];
   do{
    cancelled(signal);if(recorderError)throw recorderError;
    const t=Math.min(duration,win.performance.now()-start);
    draw(i,t/duration);onProgress(Math.min(1,(elapsed+t)/total));
    if(t>=duration)break;
    await delay(Math.min(80,Math.max(1,duration-t)));
   }while(true);
   elapsed+=duration;
  }
  cancelled(signal);
  if(recorder.state!=="inactive")recorder.stop();
  let stopTimer;try{await Promise.race([stopWait,new Promise((_,reject)=>{stopTimer=win.setTimeout(()=>reject(Error("Video encoder stop timed out")),5000)})])}finally{win.clearTimeout(stopTimer)}
  if(recorderError)throw recorderError;cancelled(signal);
  const blob=new win.Blob(chunks,{type:recorder.mimeType.split(";")[0]||"video/webm"});
  if(blob.size<256)throw Error("Browser returned an empty or incomplete video");
  onProgress(1);
  return {blob,receipt:{...plan,frames:plan.frames.map((f,i)=>({...f,duration_ms:durations[i]})),total_duration_ms:total,
   video_file:true,mime_type:blob.type,bytes:blob.size,encoded_locally:true,model_calls:0,remote_media_loaded:false}};
 }finally{
  if(recorder&&recorder.state!=="inactive"){try{recorder.stop()}catch{}}
  stream?.getTracks().forEach(t=>t.stop());
 }
}

function mount(container,{onStep=()=>{}}={}){
 const doc=container.ownerDocument||document;
 let map=null,story=null,index=0,timer=null,playing=false,destroyed=false,videoJob=null,videoURL="",receiptURL="",videoKey="",videoReceipt=null;
 const el=(tag,value="",cls="")=>{const e=doc.createElement(tag);e.textContent=String(value);if(cls)e.className=cls;return e};
 const top=el("div","","story-heading"),scene=el("div","","story-scene"),info=el("div","","story-info"),controls=el("div","","story-controls"),rail=el("div","","story-rail");
 const title=el("strong","Visual walkthrough"),counter=el("span","","muted");
 top.append(title,counter);
 const prev=el("button","Previous"),play=el("button","Play"),next=el("button","Next"),seek=el("input");seek.type="range";seek.min="0";seek.step="1";seek.setAttribute("aria-label","Walkthrough step");
 for(const [b,label] of [[prev,"Previous scene"],[play,"Play or pause walkthrough"],[next,"Next scene"]]){b.type="button";b.setAttribute("aria-label",label)}
 prev.dataset.storyAction="prev";play.dataset.storyAction="play";next.dataset.storyAction="next";
 seek.dataset.storySeek="true";
 controls.append(prev,play,next,seek);
 const videoBox=el("section","","story-video");videoBox.hidden=true;
 const videoTitle=el("strong","Short explainer video"),videoNote=el("p","","muted");
 const videoActions=el("div","","story-video-actions"),videoButton=el("button","Create short video"),cancelButton=el("button","Cancel"),videoStatus=el("p","","muted"),videoOutput=el("div","","story-video-output");
 videoButton.type="button";videoButton.dataset.storyVideo="create";cancelButton.type="button";cancelButton.dataset.storyVideo="cancel";cancelButton.hidden=true;
 videoStatus.setAttribute("role","status");
 videoActions.append(videoButton,cancelButton);videoBox.append(videoTitle,videoNote,videoActions,videoStatus,videoOutput);
 container.replaceChildren(top,scene,controls,rail,info,videoBox);
 function clearVideo(){
  if(videoJob){videoJob.abort();videoJob=null}
  const old=videoOutput.querySelector("video");if(old){old.pause();old.removeAttribute("src")}
  videoOutput.replaceChildren();
  const win=doc.defaultView;
  if(videoURL)win.URL.revokeObjectURL(videoURL);if(receiptURL)win.URL.revokeObjectURL(receiptURL);
  videoURL="";receiptURL="";videoReceipt=null;videoStatus.textContent="";cancelButton.hidden=true;
 }
 function configureVideo(nextMap){
  const key=JSON.stringify(nextMap);
  if(key!==videoKey){clearVideo();videoKey=key}
  let plan;try{plan=videoPlan(nextMap)}catch{plan=null}
  videoBox.hidden=!plan;if(!plan)return;
  const canEncode=videoSupport(doc);
  videoButton.disabled=!canEncode||!!videoJob;
  videoNote.textContent=canEncode?"Create a "+Math.round(plan.total_duration_ms/1000)+"-second silent, captioned WebM from this explanation. Keep this tab visible during local encoding. No camera, network, or model is used. Review before sharing.":"This browser does not support local WebM encoding. The interactive explanation remains available.";
 }
 videoButton.addEventListener("click",async()=>{
  if(destroyed||!map||videoJob)return;
  clearVideo();pause();
  const win=doc.defaultView,job=new win.AbortController(),currentMap=map;
  videoJob=job;videoButton.disabled=true;cancelButton.hidden=false;videoStatus.textContent="Preparing the current visual explanation…";
  let progress=-1;
  try{
   const result=await renderClip(currentMap,{doc,signal:job.signal,onProgress:f=>{
    if(videoJob!==job||destroyed)return;
    const value=Math.min(100,Math.floor(f*20)*5);
    if(value!==progress){progress=value;videoStatus.textContent="Encoding locally: "+value+"%"}
   }});
   if(videoJob!==job||destroyed||job.signal.aborted)return;
   videoReceipt=result.receipt;
   videoURL=win.URL.createObjectURL(result.blob);
   receiptURL=win.URL.createObjectURL(new win.Blob([JSON.stringify(result.receipt,null,2)+"\n"],{type:"application/json"}));
   const player=el("video");player.controls=true;player.playsInline=true;player.preload="metadata";player.src=videoURL;player.setAttribute("aria-label","Locally generated conceptual explainer");
   const links=el("div","","story-video-actions"),download=el("a","Download WebM"),receipt=el("a","Download source receipt");
   download.href=videoURL;download.download="zebra-"+currentMap.kind+".webm";receipt.href=receiptURL;receipt.download="zebra-"+currentMap.kind+"-video-sources.json";
   links.append(download,receipt);videoOutput.append(player,links);
   videoStatus.textContent="Video encoded locally ("+Math.ceil(result.blob.size/1024)+" KB). Preview and review before sharing.";
  }catch(e){if(videoJob===job&&!destroyed)videoStatus.textContent=job.signal.aborted?"Video generation cancelled.":String(e.message||e).slice(0,200)}
  finally{if(videoJob===job){videoJob=null;cancelButton.hidden=true;videoButton.disabled=!videoSupport(doc)}}
 });
 cancelButton.addEventListener("click",()=>{if(videoJob)videoJob.abort()});
 function cancel(){if(timer!==null){clearTimeout(timer);timer=null}}
 function pause(){cancel();playing=false;play.textContent="Play";play.setAttribute("aria-pressed","false")}
 function schedule(){
  cancel();if(!playing||!story||destroyed)return;
  timer=setTimeout(()=>{timer=null;if(index>=story.frames.length-1){pause();return}select(index+1,false);schedule()},story.frames[index].duration_ms);
 }
 function select(value,manual=true,focusTarget=""){
  if(!story||destroyed)return;
  if(manual)pause();
  index=clampIndex(story,value);draw();
  if(focusTarget){const found=scene.querySelector('[data-story-hotspot="'+focusTarget+'"]');found?.focus({preventScroll:true})}
  onStep(story.frames[index],index);
 }
 function draw(){
  if(!story)return;
  const f=story.frames[index];
  counter.textContent="Step "+(index+1)+" / "+story.frames.length+" · "+Math.round(story.total_duration_ms/1000)+"s walkthrough";
  scene.replaceChildren(createSVG(doc,map,story,index,id=>{const n=story.frames.findIndex(x=>x.id===id);if(n>=0)select(n,true,id)}));
  seek.max=String(story.frames.length-1);seek.value=String(index);seek.setAttribute("aria-valuetext",f.title);prev.disabled=index===0;next.disabled=index===story.frames.length-1;
  rail.replaceChildren();
  for(const item of story.frames){
   const b=el("button",String(item.index+1)+". "+item.title,"story-step");b.type="button";b.dataset.storyStep=String(item.index);b.setAttribute("aria-pressed",String(item.index===index));
   b.addEventListener("click",()=>{select(item.index);rail.querySelector('[data-story-step="'+item.index+'"]')?.focus({preventScroll:true})});rail.append(b)
  }
  info.replaceChildren(el("div","SCENE "+(index+1),"vision-kicker"),el("h3",f.title),el("p",f.caption));
  if(f.evidence.length){
   const source=el("div","","story-source");
   for(const e of f.evidence){
    const item=el("div","","story-evidence");
    item.append(el("strong",e.section||"Selected source"));
    if(e.quote)item.append(el("blockquote",e.quote));
    const meta=e.origin==="public_forum_report"?"Archived public forum self-report · not independently reproduced":e.origin==="team_release_note"?"Team release note · secondary summary, not official evidence":e.origin==="retrieved_excerpt"?"Retrieved excerpt":e.origin==="checked_source_card"?"Checked source card · "+e.checked:"Selected article · not inspected in this view";
    item.append(el("span",meta,"muted"));
    try{
     const u=new URL(e.url);
     const safe=u.protocol==="https:"&&!u.username&&!u.password&&!u.port;
     const forum=e.origin==="public_forum_report"&&u.hostname==="developer.zebra.com"&&u.pathname.startsWith("/content/")&&!u.search;
     const release=e.origin==="team_release_note"&&u.hostname==="github.com"&&/^\/1235357\/zebra-public-site-archive\/blob\/[a-f0-9]{40}\/README\.md$/.test(u.pathname)&&!u.search;
     if(safe&&(u.hostname==="techdocs.zebra.com"||forum||release)){const a=el("a",forum?"Original forum report ↗":release?"Team release note ↗":"Official source ↗");a.href=u.href;a.target="_blank";a.rel="noopener noreferrer";item.append(a)}
     if(forum&&typeof e.archive_url==="string"){const v=new URL(e.archive_url);if(v.protocol==="https:"&&v.hostname==="github.com"&&!v.username&&!v.password&&!v.port&&!v.search&&/^\/1235357\/zebra-public-site-archive\/blob\/[a-f0-9]{40}\/Zebra_Forum_Backup_2026-10-26\//.test(v.pathname)){const a=el("a","Pinned archived source ↗");a.href=v.href;a.target="_blank";a.rel="noopener noreferrer";item.append(a)}}
    }catch{}
    source.append(item)
   }
   info.append(source)
  }
  info.append(el("p","Conceptual visual walkthrough — not a recording of actual device behavior.","vision-foot"));
 }
 prev.addEventListener("click",()=>select(index-1));next.addEventListener("click",()=>select(index+1));
 seek.addEventListener("input",()=>select(Number(seek.value)));
 play.addEventListener("click",()=>{
  if(!story)return;if(playing){pause();return}
  if(index===story.frames.length-1)select(0,false);
  playing=true;play.textContent="Pause";play.setAttribute("aria-pressed","true");schedule();
 });
 const hidden=()=>{if(doc.hidden){pause();if(videoJob)videoJob.abort()}};
 doc.addEventListener("visibilitychange",hidden);
 return {
  update(nextMap,{focus=""}={}){
   if(destroyed)return;
   const previous=story,previousId=story?.frames[index]?.id;
   const previousState=map?JSON.stringify(map.state):"";
   map=nextMap;story=build(map);configureVideo(map);
   const changed=!previous||previous.kind!==story.kind||previousState!==JSON.stringify(map.state);
   if(changed||focus)pause();
   let requested=focus||(!previous||previous.kind!==story.kind?"":changed?map.next.id:previousId);
   const found=story.frames.findIndex(f=>f.id===requested);
   index=found<0?0:found;draw();
   if(playing)schedule();
  },
  destroy(){destroyed=true;pause();clearVideo();doc.removeEventListener("visibilitychange",hidden);container.replaceChildren()},
  snapshot(){return story?{story,index,playing,video_receipt:videoReceipt}:null}
 };
}
return Object.freeze({build,clampIndex,createSVG,mount,videoPlan,videoSupport,renderClip});
});
