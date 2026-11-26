"use strict";
// Server-owned model adapter. No request body can set a host, model, or secret.
const CAMPUS="c3dgx0.cs.northwestern.edu";
const DEFAULT_BASE="http://"+CAMPUS+":8000/v1";
const DEFAULT_MODEL="nvidia/Qwen3.8-Flash-Next-FP4-Local";
function configure(env=process.env,{defaultMode="off"}={}){
 const mode=env.ZEBRA_MODEL_MODE||defaultMode;
 if(!["off","campus","enterprise"].includes(mode))throw Error("Unknown ZEBRA_MODEL_MODE");
 if(mode==="off")return {mode,model:"disabled",base:null};
 if(mode==="campus")return {mode,base:env.AI_BASE_URL||DEFAULT_BASE,model:env.AI_MODEL||DEFAULT_MODEL,token:env.CAMPUS_QWEN_TOKEN||"token-is-ignored"};
 const approved=env.ZEBRA_MODEL_APPROVED_ORIGIN;
 if(!approved||!env.ZEBRA_MODEL_BASE_URL||!env.ZEBRA_MODEL_NAME)throw Error("Enterprise model requires approved origin, base URL and model name");
 return {mode,base:env.ZEBRA_MODEL_BASE_URL,model:env.ZEBRA_MODEL_NAME,approved_origin:approved,token:env.ZEBRA_MODEL_API_KEY||""};
}
function resolve(cfg,env=process.env){
 const mode=cfg.mode||"campus";
 if(mode==="off")throw Error("Model inference is disabled by administrator");
 if(!["campus","enterprise"].includes(mode))throw Error("Unknown model adapter");
 let u;try{u=new URL(cfg.base)}catch{throw Error("Invalid model endpoint")}
 if(u.username||u.password||u.search||u.hash||u.pathname.replace(/\/+$/,"")!=="/v1")throw Error("Model endpoint must end with /v1 and contain no credentials");
 const model=cfg.model;
 if(typeof model!=="string"||!model.trim()||model.length>180)throw Error("Invalid model name");
 let token;
 if(mode==="campus"){
  if(u.hostname!==CAMPUS||!["http:","https:"].includes(u.protocol))throw Error("Answer guidance permits only Northwestern's campus model endpoint in campus mode");
  token=cfg.token??env.CAMPUS_QWEN_TOKEN??"token-is-ignored";
  if(u.protocol==="http:"&&token!=="token-is-ignored")throw Error("Real authentication tokens require HTTPS");
 }else{
  if(u.protocol!=="https:"||typeof cfg.approved_origin!=="string"||u.origin!==cfg.approved_origin)throw Error("Enterprise endpoint must use its explicitly approved HTTPS origin");
  token=cfg.token||"";
 }
 if(typeof token!=="string"||/[\r\n]/.test(token))throw Error("Invalid provider credential");
 return {mode,base:u.href.replace(/\/+$/,""),model,headers:{Accept:"application/json",...(token?{Authorization:"Bearer "+token}:{})}};
}
function publicConfig(cfg){return {mode:cfg.mode||"campus",enabled:cfg.mode!=="off",model:cfg.mode==="off"?null:cfg.model};}
module.exports={configure,resolve,publicConfig,DEFAULT_BASE,DEFAULT_MODEL};
