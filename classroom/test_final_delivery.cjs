"use strict";
const fs=require("node:fs"),path=require("node:path"),vm=require("node:vm"),assert=require("node:assert/strict");
const html=fs.readFileSync(path.join(__dirname,"final-delivery.html"),"utf8");
const script=html.split("<script>")[1]?.split("</script>")[0];
assert.ok(script,"final delivery script");
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(ids.length,new Set(ids).size,"no duplicated IDs");
assert.ok(!/https?:\/\/[^"']+\.js/i.test(html),"no remote JavaScript dependencies");
assert.ok(!/\blocalStorage\b|\bsessionStorage\b/.test(script),"no browser storage for reviewer notes");
const elements=new Map(ids.map(id=>[id,{value:"",textContent:"",hidden:true,children:[],listeners:{},append(...n){this.children.push(...n)},replaceChildren(...n){this.children=n},addEventListener(k,fn){this.listeners[k]=fn},scrollIntoView(){}}]));
const document={getElementById:id=>elements.get(id),createElement:tag=>({tag,textContent:"",value:"",children:[],append(...n){this.children.push(...n)},remove(){},click(){}}),body:{append(){}}};
const sandbox={document,URL,Blob,setTimeout, navigator:{clipboard:{writeText:async()=>{}}},module:{exports:{}}};
vm.runInNewContext(script,sandbox,{timeout:5000});
const api=sandbox.module.exports;
assert.equal(elements.get("case-count").textContent,"2","two sourced fallback cases must render without public CSV");
assert.ok(elements.get("official-url").value.startsWith("https://techdocs.zebra.com/"));
assert.ok(elements.get("revision-url").value.includes("/document-reader/"));
const csv='case id,title,question,version,source url,revision url\n'+
'ZF-1,"Scanning, revised","Can it scan?",13.0,https://developer.zebra.com/content/a-example,https://zebra-techdocs-practicum.vercel.app/document-reader/ehs28-revised.html\n';
const parsed=api.parseCSV(csv);
assert.equal(parsed.rows.length,1);
assert.equal(parsed.rows[0][1],"Scanning, revised");
assert.throws(()=>api.parseCSV('a,b\n"bad'),/Unclosed/);
assert.equal(api.safeURL("javascript:alert(1)"),"");
assert.equal(api.safeURL("https://github.com.evil.test/"),"");
assert.equal(api.safeURL("https://github.com/u/r"),"https://github.com/u/r");
const mapping=api.mapColumns(parsed.headers);
assert.equal(mapping.title,1);assert.equal(mapping.version,3);
const caseData={id:"ZF-1",title:"Scanning revised",question:"Can it scan?",version:"13.0",product:"DataWedge",source_url:"https://developer.zebra.com/content/example",proposal_url:"https://zebra-techdocs-practicum.vercel.app/document-reader/ehs28-revised.html",row_number:1};
const fields={decision:"READY_FOR_CLIENT_REVIEW",claim:"Document clearer version scope",evidence:"Checked linked original guide and marked revision",checks:"Verify installed DataWedge version; test real device",next:"TechDocs owner review",reviewer:"student team"};
const packet=api.buildPacket(caseData,fields);
assert.equal(packet.schema,"zebra-final-review-handoff/v1");
assert.equal(packet.review.disposition,"READY_FOR_CLIENT_REVIEW");
assert.equal(packet.provenance.model_executed,false);
assert.equal(packet.provenance.device_test_executed,false);
assert.equal(packet.provenance.customer_approved,false);
assert.equal(packet.publication_authorized,false);
assert.throws(()=>api.buildPacket(caseData,{...fields,evidence:""}),/requires an actual evidence/);
assert.throws(()=>api.buildPacket(null,fields),/Import a public case/);
assert.ok(html.includes('id="case-file"')&&html.includes('id="export"'));
const publicSixColumn=[
 "SPR Key","Feature / Component","Documentation Root Cause Category",
 "Target TechDocs Page / Section","Root Cause Breakdown & Missing Content","Recommended TechDocs Action"
].join(",")+"\n"+
 'ZF-019,DataWedge input,Version guidance,https://techdocs.zebra.com/datawedge/13-0/guide/api/setconfig/,Unclear version scope,Explain the version prerequisites without claiming a fix\n';
const mappedSix=api.mapColumns(api.parseCSV(publicSixColumn).headers);
assert.equal(mappedSix.id,0);
assert.equal(mappedSix.title,1);
assert.equal(mappedSix.question,4);
assert.equal(mappedSix.official,3);
assert.equal(mappedSix.recommendation,5);
const sixResult=api.importText(publicSixColumn);
assert.equal(sixResult.count,1);
assert.equal(elements.get("case-count").textContent,"1");
assert.equal(elements.get("claim").value,"Explain the version prerequisites without claiming a fix");
assert.equal(elements.get("evidence").value,"");
assert.equal(elements.get("decision").value,"NEEDS_EVIDENCE");
assert.equal(elements.get("official-url").value,"https://techdocs.zebra.com/datawedge/13-0/guide/api/setconfig/");
assert.equal(elements.get("revision-url").value,"");
assert.equal(api.approvedPair({official_url:"https://techdocs.zebra.com/datawedge/13-0/guide/api/setconfig/",proposal_url:"https://zebra-techdocs-practicum.vercel.app/document-reader/sc13-revised.html"}),true);
assert.equal(api.approvedPair({official_url:"https://attacker.invalid/data",proposal_url:"https://zebra-techdocs-practicum.vercel.app/document-reader/sc13-revised.html"}),false);
const publicRecord={id:"ZF-019",title:"DataWedge input",question:"Unclear version scope",product:"DataWedge",source_url:"",official_url:"https://techdocs.zebra.com/datawedge/13-0/guide/api/setconfig/",proposal_url:"",version:"13.0",row_number:1};
const unapproved=api.buildPacket(publicRecord,{...fields,decision:"NEEDS_EVIDENCE",evidence:""});
assert.equal(unapproved.publication_authorized,false);
assert.ok(unapproved.review.unresolved_gates.some(x=>x.includes("revision link")));
assert.equal(unapproved.provenance.model_executed,false);

console.log("PASS final delivery handoff: SPR six-column CSV, source mapping, explicit manual review, non-approval, local export UI");
