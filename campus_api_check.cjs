"use strict";
// One real (non-mocked) OpenAI-compatible call containing NO Zebra or personal data.
// Run only on Northwestern VPN / eduroam: npm run campus:check
const base=String(process.env.AI_BASE_URL||"http://c3dgx0.cs.northwestern.edu:8000/v1").replace(/\/+$/,"");
const model=String(process.env.AI_MODEL||"nvidia/Qwen3.8-Flash-Next-FP4-Local");
const key=String(process.env.CAMPUS_QWEN_TOKEN||"token-is-ignored");
async function main(){
 const u=new URL(base);
 if(!["https:","http:"].includes(u.protocol)||u.hostname!=="c3dgx0.cs.northwestern.edu"||u.pathname!=="/v1"||u.username||u.password||u.search||u.hash)throw Error("Only the approved Northwestern campus /v1 endpoint is allowed");
 if(u.protocol==="http:"&&key!=="token-is-ignored")throw Error("Real campus authentication tokens require HTTPS");
 console.log("Checking campus model: "+model);
 let answer;
 try{
  answer=await fetch(base+"/chat/completions",{method:"POST",redirect:"error",headers:{"Content-Type":"application/json",Authorization:"Bearer "+key},body:JSON.stringify({model,messages:[{role:"system",content:"Respond with the single word READY."},{role:"user",content:"Connection probe: reply READY."}],temperature:0,max_tokens:64,stream:false}),signal:AbortSignal.timeout(25000)});
 }catch(e){
  throw Error("Model network request failed. Verify VPN/eduroam and the active 8000/8080 port. Cause: "+String(e.cause?.code||e.message));
 }
 const raw=await answer.text();
 if(!answer.ok)throw Error("Model API returned HTTP "+answer.status+" (first 200 chars: "+raw.slice(0,200)+")");
 let data;try{data=JSON.parse(raw)}catch{throw Error("Model did not return valid JSON")}
 const text=data?.choices?.[0]?.message?.content;
 if(typeof text!=="string"||!text.trim())throw Error("Model completion contained no visible text");
 console.log(JSON.stringify({live_model_call:true,model:data.model||model,reply:text.slice(0,400),tokens:data.usage?.total_tokens??null,request_contains_only_synthetic_text:true},null,2));
}
main().catch(e=>{console.error("NOT CONNECTED: "+e.message);process.exitCode=1});
