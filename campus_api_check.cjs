"use strict";
// Live, harmless Northwestern model probe. Automatically tries the prior
// documented 8080 endpoint first, then 8000 if needed. No Zebra or personal data.
const M=require("./analysis/model-provider.cjs");
const CAMPUS="c3dgx0.cs.northwestern.edu";
const KNOWN=["Qwen3.8-Flash-Next-FP4-Local","DeepSeek-V4-Flash-0731/DeepSeek-V4-Flash-0731-UD-IQ3_XXS","DeepSeek-V4-Flash-0731"];
function normalize(raw){
 const u=new URL(raw);
 if(!["http:","https:"].includes(u.protocol)||u.hostname!==CAMPUS||u.pathname.replace(/\\/+$/,"")!=="/v1"||u.username||u.password||u.search||u.hash)throw Error("Only the approved Northwestern campus /v1 endpoint is allowed");
 return u.href.replace(/\\/+$/,"");
}
function endpoints(env=process.env){
 if(env.AI_BASE_URL){
  const first=normalize(env.AI_BASE_URL),port=new URL(first).port,other=port==="8080"?"8000":port==="8000"?"8080":null;
  return [first,...(other?[first.replace(":"+port+"/v1",":"+other+"/v1")]:[])];
 }
 return [8080,8000].map(port=>"http://"+CAMPUS+":"+port+"/v1");
}
function chooseModel(available,env=process.env){
 if(env.AI_MODEL)return env.AI_MODEL;
 return KNOWN.find(x=>available.includes(x))||available[0]||M.DEFAULT_MODEL;
}
async function probeCampus({env=process.env,request=fetch}={}){
 const key=String(env.CAMPUS_QWEN_TOKEN||"token-is-ignored"),attempts=[];
 for(const base of endpoints(env)){
  let available=[];
  try{
   const list=await request(base+"/models",{method:"GET",redirect:"error",headers:{Accept:"application/json",Authorization:"Bearer "+key},signal:AbortSignal.timeout(6000)});
   if(list.ok){const payload=await list.json();available=(Array.isArray(payload?.data)?payload.data:[]).map(x=>x?.id).filter(x=>typeof x==="string")}
   else attempts.push({port:new URL(base).port,stage:"models",status:list.status});
  }catch(e){attempts.push({port:new URL(base).port,stage:"models",error:String(e.cause?.code||e.message).slice(0,100)})}
  const model=chooseModel(available,env);
  try{
   const started=Date.now();
   const response=await request(base+"/chat/completions",{method:"POST",redirect:"error",headers:{"Content-Type":"application/json",Authorization:"Bearer "+key},body:JSON.stringify({model,messages:[{role:"system",content:"Respond with the single word READY."},{role:"user",content:"Connection probe: reply READY."}],temperature:0,max_tokens:64,stream:false}),signal:AbortSignal.timeout(25000)});
   if(!response.ok){attempts.push({port:new URL(base).port,stage:"chat/completions",status:response.status});continue}
   const data=await response.json(),reply=data?.choices?.[0]?.message?.content;
   if(typeof reply!=="string"||!reply.trim()){attempts.push({port:new URL(base).port,stage:"chat/completions",error:"Empty model response"});continue}
   return {live_model_call:true,endpoint:base,port:new URL(base).port,requested_model:model,reported_model:data.model||null,model_listed:available.length?available.includes(model):null,available_models:available,reply:reply.slice(0,400),tokens:data.usage?.total_tokens??null,latency_ms:Date.now()-started,request_contains_only_synthetic_text:true,attempts};
  }catch(e){attempts.push({port:new URL(base).port,stage:"chat/completions",error:String(e.cause?.code||e.message).slice(0,120)})}
 }
 throw Error("No Northwestern Chat Completions endpoint responded. Attempts: "+JSON.stringify(attempts));
}
async function main(){
 try{const result=await probeCampus();console.log(JSON.stringify(result,null,2))}
 catch(e){console.error("NOT CONNECTED: "+e.message);process.exitCode=1}
}
if(require.main===module)main();
module.exports={probeCampus,endpoints,chooseModel,normalize};
