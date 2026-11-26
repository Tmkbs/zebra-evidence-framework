"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),http=require("node:http"),crypto=require("node:crypto");
const {buildServer}=require("../campus_review_server.cjs");
test("local HTTP endpoint produces a real narrated MP4 without model or source network access",async()=>{
 const cfg={port:3000,base:"http://c3dgx0.cs.northwestern.edu:8000/v1",model:"fixture",passcode:"narration-test"};
 const server=buildServer(cfg,()=>{throw Error("Unexpected network request")});
 await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
 const input={question:"What is DataWedge and how do its profiles handle input and output?",product:"datawedge",version:"15.0",context:"",source_urls:[],public_only:true};
 const post=body=>new Promise((resolve,reject)=>{
  const req=http.request({hostname:"127.0.0.1",port:server.address().port,path:"/api/narrated-video",method:"POST",headers:{Host:"127.0.0.1:3000","X-Review-Access":cfg.passcode,"Content-Type":"application/json"}},res=>{const chunks=[];res.on("data",c=>chunks.push(c));res.on("end",()=>resolve({status:res.statusCode,body:JSON.parse(Buffer.concat(chunks).toString("utf8"))}))});req.on("error",reject);req.end(JSON.stringify(body))
 });
 try{
  const blocked=await post({...input,version:""});assert.equal(blocked.status,422);
  const r=await post(input);assert.equal(r.status,200,r.body.error);const x=r.body,v=Buffer.from(x.video_base64,"base64");
  assert.equal(x.model_calls,0);assert.equal(x.receipt.kind,"profile_learning");assert.equal(x.receipt.audio_codec,"aac");assert.equal(x.receipt.video_codec,"h264");assert.equal(x.receipt.decoded_audio_and_video,true);assert.ok(x.receipt.audio_peak_db>=-35);assert.equal(v.length,x.receipt.bytes);assert.equal(crypto.createHash("sha256").update(v).digest("hex"),x.receipt.video_sha256);assert.ok(x.captions.startsWith("WEBVTT"));assert.equal(x.receipt.device_tested,false);
 }finally{await new Promise(resolve=>server.close(resolve))}
});
