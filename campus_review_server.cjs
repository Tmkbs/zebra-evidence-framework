"use strict";
/**
 * Zebra Evidence Review: local server plus real campus inference route.
 * Serves only bundled public UI pages and uses the existing api/review.js.
 * Run "npm run campus" while connected to Northwestern VPN or eduroam.
 * No dependency, tunnel, public hosting, or client-side API credential needed.
 */
const http=require("node:http");
const fs=require("node:fs");
const path=require("node:path");
const crypto=require("node:crypto");
const review=require("./api/review.js");
const guidance=require("./analysis/answer-guidance.cjs");
const localNarration=require("./analysis/local-narration.cjs");
const Model=require("./analysis/model-provider.cjs");

const DEFAULT_API="http://c3dgx0.cs.northwestern.edu:8000/v1";
const DEFAULT_MODEL="nvidia/Qwen3.8-Flash-Next-FP4-Local";
const PUBLIC_CASE_CSV="https://zebra-techdocs-practicum.vercel.app/document-reader/zebra-cases.csv";
const UI_ROOT=path.join(__dirname,"classroom");
const PAGES=Object.freeze({
 "/":"index.html",
 "/index.html":"index.html",
 "/classroom/":"index.html",
 "/classroom/index.html":"index.html",
 "/final-delivery.html":"final-delivery.html",
 "/classroom/final-delivery.html":"final-delivery.html",
 "/answer-guidance.html":"answer-guidance.html",
 "/embedded-assistant.html":"embedded-assistant.html",
 "/classroom/embedded-assistant.html":"embedded-assistant.html",
 "/techdocs-widget.js":"techdocs-widget.js",
 "/classroom/techdocs-widget.js":"techdocs-widget.js",
 "/classroom/answer-guidance.html":"answer-guidance.html",
 "/answer-strategies.js":"answer-strategies.js",
 "/classroom/answer-strategies.js":"answer-strategies.js",
 "/guidance-planner.js":"guidance-planner.js",
 "/classroom/guidance-planner.js":"guidance-planner.js",
 "/guidance-intake.js":"guidance-intake.js",
 "/classroom/guidance-intake.js":"guidance-intake.js",
 "/guidance-visual.js":"guidance-visual.js",
 "/classroom/guidance-visual.js":"guidance-visual.js",
 "/guidance-storyboard.js":"guidance-storyboard.js",
 "/classroom/guidance-storyboard.js":"guidance-storyboard.js",
 "/visual-companion.html":"visual-companion.html",
 "/classroom/visual-companion.html":"visual-companion.html",
 "/guidance-team-bridge.js":"guidance-team-bridge.js",
 "/classroom/guidance-team-bridge.js":"guidance-team-bridge.js",
 "/analysis/zebra-pattern-analysis.html":"../analysis/zebra-pattern-analysis.html",
 "/evidence-framework-sandbox.html":"evidence-framework-sandbox.html",
 "/classroom/evidence-framework-sandbox.html":"evidence-framework-sandbox.html",
 "/course.html":"course.html",
 "/classroom/course.html":"course.html"
});
function configure(env=process.env){
 const port=Number(env.ZEBRA_REVIEW_PORT||3000);
 if(!Number.isInteger(port)||port<1024||port>65535)throw Error("Invalid local port");
 const portable=Model.configure(env,{defaultMode:"campus"});
 if(portable.mode!=="campus"){
  if(portable.mode!=="off")Model.resolve(portable,env);
  return {...portable,port,passcode:env.AI_REVIEW_ACCESS_TOKEN||crypto.randomBytes(24).toString("hex")};
 }
 const base=String(env.AI_BASE_URL||DEFAULT_API).replace(/\/+$/,"");
 let u;try{u=new URL(base)}catch{throw Error("Invalid AI_BASE_URL")}
 if(!["http:","https:"].includes(u.protocol)||u.username||u.password||u.search||u.hash||u.pathname.replace(/\/+$/,"")!=="/v1")throw Error("AI_BASE_URL must end with /v1 and have no credentials");
 const campus=u.hostname==="c3dgx0.cs.northwestern.edu";
 if(!campus)throw Error("Only the approved Northwestern campus model host is allowed");
 if(u.protocol==="http:"&&env.CAMPUS_QWEN_TOKEN&&env.CAMPUS_QWEN_TOKEN!=="token-is-ignored")throw Error("Real campus authentication tokens require HTTPS");
 // Harper's local vLLM server ignores the sample Bearer value.
 env.AI_BASE_URL=base;
 env.AI_MODEL=env.AI_MODEL||DEFAULT_MODEL;
 if(campus){
  env.AI_ALLOW_HTTP="true";
  env.AI_API_KEY="token-is-ignored";
 }
 env.AI_REVIEW_ACCESS_TOKEN=env.AI_REVIEW_ACCESS_TOKEN||crypto.randomBytes(24).toString("hex");
 const origins=["http://127.0.0.1:"+port,"http://localhost:"+port];
 env.AI_ALLOWED_ORIGINS=[...origins,...String(env.AI_ALLOWED_ORIGINS||"").split(",").filter(Boolean)].join(",");
 return{port,base,model:env.AI_MODEL,mode:"campus",token:portable.token,passcode:env.AI_REVIEW_ACCESS_TOKEN};
}
function json(res,status,body){
 res.statusCode=status;
 res.setHeader("Content-Type","application/json; charset=utf-8");
 res.setHeader("Cache-Control","no-store");
 res.end(JSON.stringify(body));
}
function allowHost(req,port){
 const h=String(req.headers.host||"").toLowerCase();
 return h==="localhost:"+port||h==="127.0.0.1:"+port;
}
async function campusStatus(cfg,request=fetch){
 try{
  const provider=Model.resolve(cfg);
  const res=await request(provider.base+"/models",{redirect:"error",headers:provider.headers,signal:AbortSignal.timeout(6000)});
  if(!res.ok)return{connected:false,model:cfg.model,error:"HTTP "+res.status+" from model-list route"};
  const payload=await res.json();
  const models=(Array.isArray(payload?.data)?payload.data:[]).map(x=>x?.id).filter(x=>typeof x==="string").slice(0,60);
  return{connected:true,model:cfg.model,model_listed:models.includes(cfg.model),available_models:models};
 }catch{
  return{connected:false,model:cfg.model,error:"Model disabled or unavailable. Check the administrator-approved endpoint and configuration."};
 }
}
async function publicCases(request=fetch){
 const result=await request(PUBLIC_CASE_CSV,{method:"GET",redirect:"manual",headers:{Accept:"text/csv,text/plain"},signal:AbortSignal.timeout(12000)});
 if(!result.ok)throw Error("Published case CSV unavailable (HTTP "+result.status+"). Use the manual public CSV import.");
 const type=String(result.headers?.get("content-type")||"");
 if(type&& !/text\/csv|text\/plain|application\/(?:csv|octet-stream)/i.test(type))throw Error("The published URL did not return a CSV file");
 if(Number(result.headers?.get("content-length")||0)>700000)throw Error("Published CSV exceeds the review size limit");
 const raw=await result.text();
 if(Buffer.byteLength(raw,"utf8")>700000||!raw.includes("\n"))throw Error("Published case CSV empty or too large");
 return{ok:true,csv:raw,source_url:PUBLIC_CASE_CSV};
}
function sameOriginRequest(req,cfg){
 const origin=String(req.headers.origin||"");
 const site=String(req.headers["sec-fetch-site"]||"");
 return(!origin||origin==="http://127.0.0.1:"+cfg.port||origin==="http://localhost:"+cfg.port)
  &&site!=="cross-site"&&site!=="same-site";
}
async function readBody(req,limit=160000){
 const parts=[];let total=0;
 for await(const b of req){total+=b.length;if(total>limit)throw Error("Request body exceeds 160 KB");parts.push(b)}
 return Buffer.concat(parts).toString("utf8");
}
function buildServer(cfg,request=fetch,generateNarration=localNarration.generate){
 let rendering=false;
 return http.createServer(async(req,res)=>{
  res.setHeader("Cache-Control","no-store");
  res.setHeader("X-Content-Type-Options","nosniff");
  res.setHeader("Referrer-Policy","no-referrer");
  if(!allowHost(req,cfg.port))return json(res,403,{ok:false,error:"Open the site using its localhost address."});
  let route;
  try{route=new URL(req.url||"/","http://127.0.0.1:"+cfg.port).pathname}catch{return json(res,400,{ok:false,error:"Bad URL"})}
  if(route==="/api/session"){
   if(req.method!=="GET")return json(res,405,{ok:false,error:"GET required"});
   if(!sameOriginRequest(req,cfg))return json(res,403,{ok:false,error:"Same-origin local review only"});
   return json(res,200,{ok:true,local_session:true,model:cfg.model,model_config:Model.publicConfig(cfg),review_access:cfg.passcode});
  }
  if(route==="/api/public-cases"){
   if(req.method!=="GET")return json(res,405,{ok:false,error:"GET required"});
   if(!sameOriginRequest(req,cfg))return json(res,403,{ok:false,error:"Same-origin local review only"});
   try{return json(res,200,await publicCases(request))}
   catch(e){return json(res,502,{ok:false,error:String(e.message).slice(0,260)})}
  }
  if(route==="/api/campus-status"||route==="/api/model-status"){
   if(req.method!=="GET")return json(res,405,{ok:false,error:"GET required"});
   if(!sameOriginRequest(req,cfg))return json(res,403,{ok:false,error:"Same-origin local review only"});
   return json(res,200,await campusStatus(cfg,request));
  }
  if(route==="/api/answer-guidance"){
   if(req.method!=="POST")return json(res,405,{ok:false,error:"POST required"});
   if(!sameOriginRequest(req,cfg))return json(res,403,{ok:false,error:"Same-origin local guidance only"});
   const supplied=Buffer.from(String(req.headers["x-review-access"]||"")),expected=Buffer.from(String(cfg.passcode||""));
   if(!expected.length||supplied.length!==expected.length||!crypto.timingSafeEqual(supplied,expected))
    return json(res,401,{ok:false,error:"Local session required"});
   let input;
   try{input=JSON.parse(await readBody(req,12000))}catch{return json(res,400,{ok:false,error:"Invalid JSON or request too large"})}
   try{return json(res,200,await guidance.run(input,cfg,request))}
   catch(e){return json(res,422,{ok:false,error:String(e.message).slice(0,300),model_calls_confirmed:false})}
  }
  if(route==="/api/narrated-video"){
   if(req.method!=="POST")return json(res,405,{ok:false,error:"POST required"});
   if(!sameOriginRequest(req,cfg))return json(res,403,{ok:false,error:"Same-origin local rendering only"});
   const supplied=Buffer.from(String(req.headers["x-review-access"]||"")),expected=Buffer.from(String(cfg.passcode||""));
   if(!expected.length||supplied.length!==expected.length||!crypto.timingSafeEqual(supplied,expected))return json(res,401,{ok:false,error:"Local session required"});
   let input;
   try{input=JSON.parse(await readBody(req,12000))}catch{return json(res,400,{ok:false,error:"Invalid JSON or request too large"})}
   if(input?.public_only!==true)return json(res,422,{ok:false,error:"Confirm public/approved material first"});
   if(rendering)return json(res,409,{ok:false,error:"A local rendering job is already running"});
   rendering=true;
   try{return json(res,200,await generateNarration(input))}
   catch(e){return json(res,422,{ok:false,error:String(e.message).slice(0,500)})}
   finally{rendering=false}
  }
  if(route==="/api/review"){
   if(cfg.mode&&cfg.mode!=="campus")return json(res,403,{ok:false,error:"Legacy document-review model route is disabled in portable mode. Use Ask & Guide."});
   if(req.method==="POST"){
    try{req.body=JSON.parse(await readBody(req))}catch{return json(res,400,{ok:false,error:"Invalid JSON or request too large"})}
   }
   return review(req,res);
  }
  if(req.method!=="GET")return json(res,405,{ok:false,error:"GET required"});
  const page=PAGES[route];
  if(!page)return json(res,404,{ok:false,error:"Page not found"});
  try{
   const html=fs.readFileSync(path.join(UI_ROOT,page));
   res.statusCode=200;
   res.setHeader("Content-Type",page.endsWith(".js")?"application/javascript; charset=utf-8":"text/html; charset=utf-8");
   res.setHeader("Content-Security-Policy","default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self' https:; img-src 'self' data: blob: https:; media-src blob:; form-action 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'");
   return res.end(html);
  }catch{return json(res,500,{ok:false,error:"Bundled page unavailable"})}
 });
}
function start(){
 const cfg=configure();
 const server=buildServer(cfg);
 server.listen(cfg.port,"127.0.0.1",()=>{
  console.log("Zebra final AI review: http://127.0.0.1:"+cfg.port+"/final-delivery.html");
  console.log("Classroom evidence demo: http://127.0.0.1:"+cfg.port+"/");
  console.log("New-question answer guidance: http://127.0.0.1:"+cfg.port+"/answer-guidance.html");
  console.log("Campus status check: http://127.0.0.1:"+cfg.port+"/api/campus-status");
  console.log("Configured model: "+cfg.model);
  console.log("Local prototype session is available; model mode: "+(cfg.mode||"campus"));
  console.log("Send PUBLIC/approved document excerpts only. Press Ctrl+C to stop.");
 });
 return server;
}
if(require.main===module)start();
module.exports={configure,allowHost,sameOriginRequest,publicCases,campusStatus,buildServer,start};
