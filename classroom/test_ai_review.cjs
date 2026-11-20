"use strict";
const assert=require("node:assert/strict");
const handler=require("../api/review.js");
const original='<html><main><h2 id="linkremoval">Link Removal</h2><p>Delete the entire link tag from enterprisehomescreen.xml, and redeploy the changed configuration file to the Zebra device. The documented original action is conditional on the correct Enterprise Home Screen installation and selected user-mode view.</p></main></html>';
const proposal='<html><main><h2 id="linkremoval">Link Removal</h2><p>Delete the entire link tag from enterprisehomescreen.xml, then redeploy the changed file. The proposed E1 clarification additionally tells administrators to review version compatibility and confirm the link was removed after configuration reload.</p></main></html>';
const aiResponse=JSON.stringify({
 verdict:"needs_revision",summary:"Some proposed details need version checking.",
 findings:[{severity:"medium",issue:"Original already explains removal",source:"original",quote:"Delete the entire link tag",reasoning:"Documented previously",next_check:"Confirm no redundant wording"},
 {severity:"high",issue:"Invented supporting quote",source:"proposal",quote:"Unsupported phrase nowhere in source",reasoning:"Not grounded",next_check:"Review citation"}],
 suggested_revision:"Keep the existing removal steps and clarify version scope.",next_checks:["Confirm installed EHS version"],limitations:["No device tests were performed"]
});
const oldEnv={AI_API_KEY:process.env.AI_API_KEY,AI_REVIEW_ACCESS_TOKEN:process.env.AI_REVIEW_ACCESS_TOKEN,AI_MODEL:process.env.AI_MODEL};
const originalFetch=global.fetch;
process.env.AI_API_KEY="MOCK_TEST_ONLY";
process.env.AI_REVIEW_ACCESS_TOKEN="test-secret";
process.env.AI_MODEL="mock-model";
let calls=[];
global.fetch=async function(url,options={}){
 calls.push({url:String(url),method:options.method||"GET"});
 if(String(url).endsWith("/chat/completions"))return new Response(JSON.stringify({model:"mock-model",choices:[{message:{content:aiResponse}}]}),{status:200,headers:{"content-type":"application/json"}});
 if(String(url).includes("techdocs.zebra.com"))return new Response(original,{status:200,headers:{"content-type":"text/html"}});
 if(String(url).includes("zebra-techdocs-practicum.vercel.app"))return new Response(proposal,{status:200,headers:{"content-type":"text/html"}});
 throw Error("Unexpected URL: "+url);
};
const response=()=>({statusCode:200,headers:{},setHeader(k,v){this.headers[k]=v},end(v){this.data=v?JSON.parse(v):null}});
const request=(method,body,token="test-secret",origin="https://tmkbs.github.io")=>({method,body,headers:{host:"example.vercel.app",origin,"x-review-access":token}});
let count=0;
async function test(name,callback){await callback();count++;console.log("PASS "+name)}
async function main(){
 await test("route does not expose secrets in health response",async()=>{const res=response();await handler(request("GET"),res);assert.equal(res.statusCode,200);assert.equal(res.data.ai_configured,true);assert.ok(!JSON.stringify(res.data).includes("MOCK_TEST_ONLY"))});
 await test("wrong origin rejected",async()=>{const res=response();await handler(request("POST",{case_id:"EHS28"},"test-secret","https://evil.invalid"),res);assert.equal(res.statusCode,403)});
 await test("wrong passcode rejected without upstream requests",async()=>{const n=calls.length,res=response();await handler(request("POST",{case_id:"EHS28"},"bad-secret"),res);assert.equal(res.statusCode,401);assert.equal(calls.length,n)});
 await test("real endpoint fetches two public documents and calls the model",async()=>{
  const res=response();await handler(request("POST",{case_id:"EHS28"}),res);
  assert.equal(res.statusCode,200);assert.equal(res.data.mode,"live_ai_document_comparison");
  assert.equal(res.data.source_receipts.length,2);assert.equal(res.data.review.verdict,"needs_revision");
  assert.equal(res.data.review.findings[0].quote_verified,true);assert.equal(res.data.review.findings[1].quote_verified,false);
  assert.equal(res.data.review.findings[1].quote,"");assert.equal(res.data.device_tested,false);
  assert.equal(res.data.publication_approved,false);assert.equal(calls.filter(x=>x.url.endsWith("/chat/completions")).length,1);
 });
 await test("manually supplied text uses model without document fetch",async()=>{
  const n=calls.length,res=response();
  await handler(request("POST",{case_id:"CUSTOM",question:"Compare two paragraphs",original_text:original.repeat(2),proposal_text:proposal.repeat(2)}),res);
  assert.equal(res.statusCode,200);assert.equal(calls.length,n+1);assert.equal(res.data.source_receipts[0].source,"manual_text");
 });
 await test("unrecognized case with no documents rejected",async()=>{const res=response();await handler(request("POST",{case_id:"UNKNOWN"}),res);assert.equal(res.statusCode,422)});
 await test("any public team revision can be reviewed with the live model route",async()=>{
  const n=calls.length,res=response();
  await handler(request("POST",{
    case_id:"ZF-PUBLIC-CASE-57",question:"Does the proposed note explain the missing scope?",
    topic:"DataWedge",original_url:"https://techdocs.zebra.com/datawedge/13-0/guide/api/setconfig/",
    proposal_url:"https://zebra-techdocs-practicum.vercel.app/document-reader/sc13-revised.html#plugin_configbundle"
  }),res);
  assert.equal(res.statusCode,200);
  assert.equal(res.data.case_id,"ZF-PUBLIC-CASE-57");
  assert.equal(res.data.source_receipts.length,2);
  assert.equal(res.data.source_receipts[0].source,"public_url");
  assert.equal(res.data.mode,"live_ai_document_comparison");
  assert.match(res.data.run_id,/^[0-9a-f-]{36}$/i);
  assert.match(res.data.review_input_sha256,/^[0-9a-f]{64}$/);
  assert.match(res.data.prompt_sha256,/^[0-9a-f]{64}$/);
  assert.equal(res.data.publication_approved,false);
  assert.equal(calls.length,n+3,"two public pages and one model call");
 });
 await test("hostile public-source URL does not reach the network",async()=>{
  const n=calls.length,res=response();
  await handler(request("POST",{
   case_id:"ZF-2",question:"Should this document change?",
   original_url:"https://evil.test/secret",
   proposal_url:"https://zebra-techdocs-practicum.vercel.app/document-reader/revised.html"
  }),res);
  assert.equal(res.statusCode,422);
  assert.equal(res.data.code,"unapproved_source");
  assert.equal(calls.length,n);
 });
 await test("official and proposed hosts cannot be silently swapped",async()=>{
  const n=calls.length,res=response();
  await handler(request("POST",{
   case_id:"ZF-3",question:"Compare revisions",
   original_url:"https://zebra-techdocs-practicum.vercel.app/document-reader/test.html",
   proposal_url:"https://techdocs.zebra.com/ehs/2-8/guide/settings/"
  }),res);
  assert.equal(res.statusCode,422);
  assert.equal(calls.length,n);
 });
 await test("partial URL pairs and private query links are rejected",async()=>{
  assert.throws(()=>handler._internals.dynamicSourceConfig({original_url:"https://techdocs.zebra.com/foo/"}));
  assert.throws(()=>handler._internals.dynamicSourceConfig({original_url:"https://techdocs.zebra.com/foo/?token=abcd",proposal_url:"https://zebra-techdocs-practicum.vercel.app/document-reader/x.html"}));
  assert.throws(()=>handler._internals.dynamicSourceConfig({original_url:"https://techdocs.zebra.com/foo/",proposal_url:"https://zebra-techdocs-practicum.vercel.app/secret/private.html"}));
 });
 await test("unapproved source URLs rejected",async()=>{
  assert.throws(()=>handler._internals.validateURL("http://techdocs.zebra.com/private"));
  assert.throws(()=>handler._internals.validateURL("https://localhost/private"));
  assert.throws(()=>handler._internals.validateURL("https://techdocs.zebra.com.evil.org/page"));
 });
 await test("extract actual section from document HTML",async()=>{
  const x=handler._internals.extractPage(original,{anchor:"linkremoval",hint:"Link Removal"});
  assert.ok(x.text.includes("Delete the entire link tag"));assert.equal(x.method,"anchor");
 });
 await test("model JSON parser rejects unstructured output",async()=>{
  assert.equal(handler._internals.parseModel(aiResponse).verdict,"needs_revision");
  assert.throws(()=>handler._internals.parseModel("No JSON"));
 });
 console.log("\n"+count+" AI backend checks passed.");
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>{
 global.fetch=originalFetch;
 for(const [k,v] of Object.entries(oldEnv)){if(v===undefined)delete process.env[k];else process.env[k]=v}
});
