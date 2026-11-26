"use strict";
const {test}=require("node:test"),assert=require("node:assert/strict"),A=require("./reviewed-pattern-audit.cjs"),data=require("./archived-version-context.json");
test("four independently archived reports: three missing version facts, one explicit version",()=>{
 const r=A.mine(data),p=r.patterns[0];
 assert.equal(r.input_cases,4);assert.equal(p.independent_supporting_report_groups,3);
 assert.equal(p.independent_counterexample_groups,1);
 assert.equal(p.status,"recurring_candidate_requires_independent_team_review");
 assert.equal(r.global_patterns_validated,0);assert.equal(r.documentation_defects_established,0);
});
test("reused forum or archive evidence is not a new independent report",()=>{
 const a=data.cases[0],r=A.mine({...data,cases:[...data.cases,{...a,id:"duplicate"},{...a,id:"copy",forum_url:"https://developer.zebra.com/content/another-copy"}]});
 assert.equal(r.patterns[0].nominal_supporting_rows,5);assert.equal(r.patterns[0].independent_supporting_report_groups,3);
 assert.equal(r.patterns[0].deduplicated_rows,2);
});
test("conflicting labels of one report are excluded from both sides",()=>{
 const a=data.cases[0],r=A.mine({...data,cases:[...data.cases,{...a,id:"counterlabel",observations:[{...a.observations[0],support:false}]}]});
 assert.equal(r.patterns[0].independent_supporting_report_groups,2);assert.equal(r.patterns[0].conflicting_groups.length,1);
});
test("uninspected rows and unidentified evidence cannot add support",()=>{
 const a=data.cases[0],r=A.mine({...data,cases:[a,{...a,id:"unreviewed",review_status:"not_reviewed"}]});
 assert.equal(r.excluded.length,1);assert.equal(r.patterns[0].status,"insufficient_recurrence");
 assert.throws(()=>A.mine({...data,cases:[{...a,archive_blob_sha:"bad"}]}),/Pinned archive/);
});
test("new pattern categories can be grouped without hard-coding case IDs",()=>{
 const a=data.cases[0],b=data.cases[1],r=A.mine({...data,cases:[a,b].map(c=>({...c,observations:[{...c.observations[0],pattern_id:"new_reviewed_candidate"}]}))});
 assert.equal(r.patterns[0].pattern_id,"new_reviewed_candidate");assert.equal(r.patterns[0].independent_supporting_report_groups,2);
});
