"use strict";
const fs=require("node:fs/promises"),os=require("node:os"),path=require("node:path"),crypto=require("node:crypto");
const B=require("./batch-answer.cjs");
async function generate(input){
 if(!input||input.public_only!==true)throw Error("Confirm public/approved material first");
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),"zebra-local-narration-"));
 try{
  const packet={schema:"zebra-batch-input/v1",cases:[{id:"narrated-question",question_origin:"user_question",question:input.question,product:input.product||"",version:input.version||"",context:input.context||"",source_urls:input.source_urls||[]}]};
  const report=await B.execute(packet,{request:()=>{throw Error("Local video cannot make a network request")},renderVideo:B.localRenderer(dir)});
  const row=report.rows[0];
  if(row.video?.status!=="encoded_and_decoded")throw Error(row.video?.error||row.error||"No reviewed visual explanation matches this question and edition");
  const [video,captions,receiptRaw]=await Promise.all([fs.readFile(path.join(dir,row.video.video_file)),fs.readFile(path.join(dir,row.video.caption_file),"utf8"),fs.readFile(path.join(dir,row.video.receipt_file),"utf8")]);
  const receipt=JSON.parse(receiptRaw),sha=crypto.createHash("sha256").update(video).digest("hex");
  if(video.length>12*1024*1024||video.length!==receipt.bytes||receipt.video_sha256!==sha||receipt.decoded_audio_and_video!==true)throw Error("Video receipt verification failed");
  return {ok:true,video_base64:video.toString("base64"),captions,receipt,model_calls:0};
 }finally{await fs.rm(dir,{recursive:true,force:true})}
}
module.exports={generate};
