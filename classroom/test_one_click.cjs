"use strict";
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const html=fs.readFileSync(path.join(__dirname,"index.html"),"utf8");
const code=html.split("<script>")[1]?.split("</script>")[0];
assert.ok(code,"inline script exists");
assert.ok(!/\bfetch\s*\(|XMLHttpRequest|WebSocket/i.test(code),"automatic page never fetches an external URL");
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(ids.length,new Set(ids).size,"HTML IDs are unique");

class FakeNode{
 constructor(tag){this.tag=tag;this.value="";this.textContent="";this.children=[];this.listeners={};this.hidden=false;this.href="";this.disabled=false;this.files=[];this.dataset={};this.style={};this.className=""}
 addEventListener(k,f){this.listeners[k]=f}
 append(...nodes){this.children.push(...nodes)}
 replaceChildren(...nodes){this.children=nodes}
 click(){this.listeners.click?.()}
 select(){}
 remove(){}
 scrollIntoView(){}
}
const elements=new Map(ids.map(id=>[id,new FakeNode(id)]));
const document={
 getElementById:id=>elements.get(id),
 createElement:tag=>new FakeNode(tag),
 body:new FakeNode("body"),
 execCommand:()=>true
};
const box={document,window:{isSecureContext:false},navigator:{},
 Blob:class{constructor(parts,options){this.parts=parts;this.options=options}},
 URL:{createObjectURL:()=>"blob:test",revokeObjectURL(){}},
 setTimeout:()=>1
};
vm.runInNewContext(code+"\nthis.reviewAPI={CASES,analyzeCase,scanText,safeURL,parseCSV,importCSV,markdownReport};",box,{timeout:10000});
const api=box.reviewAPI;
const node=id=>elements.get(id);
let count=0;
function test(name,fn){fn();count++;console.log("PASS "+name)}

test("five real-source summaries available without setup",()=>{
 assert.equal(api.CASES.length,5);
 assert.equal(node("case-select").children.length,5);
 assert.equal(node("report").hidden,true);
});
test("one click generates source-linked research result",()=>{
 node("run").click();
 assert.equal(node("report").hidden,false);
 assert.equal(node("waiting").hidden,true);
 assert.equal(node("source-count").textContent,"2");
 assert.ok(Number(node("gap-count").textContent)>=4);
 assert.ok(node("draft-output").textContent.includes("SET_CONFIG"));
});
test("no public case is presented as an independently verified fix",()=>{
 for(const c of api.CASES){
  const result=api.analyzeCase(c,c.draft);
  assert.equal(result.model_executed,false);
  assert.equal(result.device_test_executed,false);
  assert.equal(result.customer_approved,false);
  assert.equal(result.technical_fix_confirmed,false);
  assert.ok(result.open_checks.length>=3);
  assert.ok(result.evidence.every(x=>x.url.startsWith("https://")));
 }
});
test("default unsafe wording is automatically flagged",()=>{
 assert.ok(api.analyzeCase(api.CASES[0],api.CASES[0].draft).wording_flags.some(x=>x.code==="absolute_claim"));
});
test("version mismatch and device overclaim are flagged",()=>{
 const f=api.scanText("DataWedge 12.0 is verified on the device and always works","13.0");
 assert.ok(f.some(x=>x.code==="version_conflict"));
 assert.ok(f.some(x=>x.code==="absolute_claim"));
 assert.ok(f.some(x=>x.code==="device_claim"));
});
test("changing a case clears the prior report",()=>{
 node("case-select").value="2";
 node("case-select").listeners.change({target:{value:"2"}});
 assert.equal(node("report").hidden,true);
 assert.ok(node("case-question").textContent.includes("Chrome"));
 node("run").click();
 assert.equal(node("source-count").textContent,"3");
});
test("markdown report includes limitations and citations",()=>{
 const p=api.analyzeCase(api.CASES[0],api.CASES[0].draft);
 const md=api.markdownReport(p);
 assert.ok(md.includes("## Open checks"));
 assert.ok(md.includes("No model execution"));
 assert.ok(md.includes("github.com"));
});
test("safe URL policy rejects script and lookalike domains",()=>{
 assert.equal(api.safeURL("javascript:alert(1)"),"");
 assert.equal(api.safeURL("https://github.com.evil.com/test"),"");
 assert.ok(api.safeURL("https://github.com/user/repo"));
});
test("CSV parser preserves quoted commas and line breaks",()=>{
 const csv="title,question,source url\n"+
   "\"A, B\",\"Two lines\nof input\",https://github.com/u/r\n";
 const rows=api.parseCSV(csv);
 assert.equal(rows.rows.length,1);
 assert.equal(rows.rows[0][0],"A, B");
 assert.equal(rows.rows[0][1],"Two lines\nof input");
});
test("imported CSV cases cannot be mistaken for technical verification",()=>{
 const csv="title,question,source url,version\nX,Does this work?,https://github.com/u/r,13.0\nY,Unknown issue,,\n";
 const result=api.importCSV(csv);
 assert.equal(result.count,2);
 assert.equal(api.CASES.length,7);
 assert.equal(node("case-select").children.length,7);
 const second=api.analyzeCase(api.CASES[6],api.CASES[6].draft);
 assert.ok(second.open_checks.some(x=>x.code==="source_missing"));
 assert.equal(second.customer_approved,false);
});
test("malformed CSV rejected",()=>{
 assert.throws(()=>api.parseCSV('title,question\n"unclosed,broken'),/Unclosed/);
});
console.log("\n"+count+" one-click regression checks passed.");
