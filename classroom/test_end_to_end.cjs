"use strict";
/* Zero-dependency regression test: node classroom/test_end_to_end.cjs */
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const assert = require("node:assert/strict");

const html = fs.readFileSync(path.join(__dirname, "evidence-framework-sandbox.html"), "utf8");
const script = html.split("<script>")[1]?.split("</script>")[0];
assert.ok(script, "Expected one inline application script");
assert.equal((html.match(/<section class="page/g) || []).length, 10);
assert.ok(!/fetch\s*\(|XMLHttpRequest|WebSocket/i.test(html), "No automatic network requests; public sources are only click-through links");

class FakeElement {
  constructor(name) {
    this.name = name; this.value = ""; this.checked = false; this.disabled = false;
    this.textContent = ""; this.children = []; this.listeners = {};
    this.dataset = {}; this.style = {}; this.files = [];
    this.classList = { toggle() {}, add() {}, remove() {} };
  }
  append(...elements) { this.children.push(...elements); }
  appendChild(x) { this.children.push(x); }
  replaceChildren(...elements) { this.children = elements; }
  setAttribute(key, value) { this[key] = value; }
  addEventListener(key, listener) { this.listeners[key] = listener; }
  remove() {}
  select() {}
  click() { this.listeners.click?.(); }
}
const ids = [...html.matchAll(/id="([^"]+)"/g)].map(x => x[1]);
assert.equal(new Set(ids).size, ids.length, "Duplicate HTML ids");
const elements = new Map(ids.map(id => [id, new FakeElement(id)]));
const pages = [...html.matchAll(/<section class="page(?: active)?" id="([^"]+)"/g)].map(m => m[1]);
const nav = [...html.matchAll(/data-page="([^"]+)"/g)].map(m => {
  const el = new FakeElement("nav"); el.dataset.page = m[1]; return el;
});
const next = [...html.matchAll(/data-next="([^"]+)"/g)].map(m => {
  const el = new FakeElement("next"); el.dataset.next = m[1]; return el;
});
const document = {
  getElementById: id => elements.get(id) || null,
  createElement: tag => new FakeElement(tag),
  querySelectorAll: q => q === ".page" ? pages.map(p => elements.get(p)) : q === "[data-page]" ? nav : q === "[data-next]" ? next : [],
  body: new FakeElement("body"), execCommand: () => true
};
const fakeWindow = { scrollTo() {}, isSecureContext: false };
const fakeBlob = class { constructor(parts, opts) { this.parts = parts; this.opts = opts; } };
const fakeURL = { createObjectURL: () => "blob:fake", revokeObjectURL() {} };
const sandbox = { document, window: fakeWindow, Blob: fakeBlob, URL: fakeURL, setTimeout: () => 1 };
vm.runInNewContext(script + "\nthis.app={payload,gateReasons,sourceHits,importDocument,importRevision,reset,revisedFilename,revisionAdapter,searchResults,show};", sandbox, { timeout: 5000 });
const app = sandbox.app;
const element = id => {
  assert.ok(elements.has(id), "Missing element " + id);
  return elements.get(id);
};
const change = (id, value, key = "change") => {
  assert.ok(element(id).listeners[key], "Missing listener " + id + "." + key);
  element(id).listeners[key]({ target: { value, checked: value, files: [] } });
};
const click = id => {
  assert.ok(element(id).listeners.click, "Missing click listener " + id);
  element(id).click();
};
let tests = 0;
const test = (name, fn) => {
  fn(); tests++; process.stdout.write("PASS " + name + "\n");
};

async function main() {
  test("public project report loads as the default case", () => {
    const p=app.payload();
    assert.equal(p.case.id,"ZF-WEB-INTEGRATION");
    assert.equal(p.fictional_demo,false);
    assert.equal(p.record_kind,"PUBLIC_SOURCE_RESEARCH");
    assert.equal(p.case.model_execution_status,"NOT_RUN");
    assert.ok(p.case.case_url.includes("developer.zebra.com"));
    assert.ok(p.evidence.every(x=>x.public_url?.startsWith("https://")));
    assert.equal(p.optional_search_experiment,null);
    assert.equal(p.document_source_kind,"public_review_note");
    assert.equal(element("budget-value").textContent,"NOT MEASURED");
  });
  test("unrun model outputs cannot be presented as evidence", () => {
    const p=app.payload();
    assert.equal(p.recorded_answers[0].source,"NOT_RUN");
    assert.equal(p.recorded_answers[1].output,"");
    assert.equal(p.release.publication,false);
  });
  test("presenter cue cards open with real-source narration", () => {
    assert.equal(element("presenter-panel").hidden,true);
    click("presenter-toggle");
    assert.equal(element("presenter-panel").hidden,false);
    assert.equal(element("presenter-toggle")["aria-expanded"],"true");
    assert.ok(element("presenter-say").textContent.includes("real developer questions"));
    assert.ok(element("presenter-do").textContent.includes("accuracy"));
  });
  test("all nine presenter steps navigate working app sections", () => {
    const crumbs=["Architecture","Question","Evidence","Human review","Failure diagnosis","Document revision","Retest","Developer preview","Delivery"];
    for(let i=0;i<crumbs.length;i++){
      assert.equal(element("crumb").textContent,crumbs[i]);
      assert.ok(element("presenter-count").textContent.startsWith(String(i+1).padStart(2,"0")+" / 09"));
      if(i<crumbs.length-1)click("presenter-next");
    }
    click("presenter-next");
    assert.equal(element("crumb").textContent,"Architecture");
    assert.equal(element("presenter-count").textContent.slice(0,2),"01");
  });
  test("presenter mode never fabricates model outputs or approves an edit", () => {
    click("presenter-close");
    const p=app.payload();
    assert.equal(element("presenter-panel").hidden,true);
    assert.equal(element("presenter-toggle")["aria-expanded"],"false");
    assert.equal(p.recorded_answers[0].source,"NOT_RUN");
    assert.equal(p.proposed_revision.status,"proposed");
    assert.equal(p.patch_execution.status,"not_run");
  });
  change("decision","prefer_b");
  change("failure-class","clarity");
  change("review-ack",true);
  test("cannot approve a nonexistent model answer", () => {
    assert.ok(app.gateReasons().some(x=>x.includes("unrun model response")));
  });
  change("decision","document_review_only");
  test("real case note can use documentation-only human review", () => {
    assert.equal(app.gateReasons().length,0);
  });
  click("revision-approve");
  click("run-preview");
  test("public research note patch is isolated and never an official documentation fix", () => {
    const p=app.payload();
    assert.equal(p.patch_execution.status,"applied_to_copy");
    assert.equal(p.patch_execution.original_modified,false);
    assert.equal(p.release.real_device_validation,"NOT_RUN");
    assert.equal(p.proposed_revision.customer_publication_approved,false);
  });
  app.reset(1);
  test("TC26 original public forum source is present", () => {
    const p=app.payload();
    assert.equal(p.case.id,"PUBLIC-TC26-XAMARIN");
    assert.ok(p.case.case_url.includes("developer.zebra.com"));
    assert.equal(p.optional_search_experiment,null);
  });
  app.reset(2);
  test("TC52 MultiBarcode original public source is present", () => {
    const p=app.payload();
    assert.equal(p.case.id,"PUBLIC-TC52-MULTIBARCODE");
    assert.ok(p.case.case_url.includes("25873"));
    assert.equal(p.recorded_answers[0].source,"NOT_RUN");
  });
  app.reset(3);
  test("synthetic document starts unapproved", () => {
    const p = app.payload();
    assert.equal(p.document_source_kind, "synthetic");
    assert.equal(p.patch_execution.status, "not_run");
    assert.equal(p.release.publication, false);
    assert.equal(p.document_snapshot.exact_match_count, 1);
  });
  test("unauthorized preview cannot edit", () => {
    click("run-preview");
    assert.notEqual(app.payload().patch_execution.status, "applied_to_copy");
  });
  change("decision", "prefer_b");
  change("failure-class", "clarity");
  change("review-ack", true);
  test("reviewer gate opens", () => assert.equal(app.gateReasons().length, 0));
  click("revision-approve");
  click("run-preview");
  test("approved synthetic patch updates a disposable copy", () => {
    const p = app.payload();
    assert.equal(p.patch_execution.status, "applied_to_copy");
    assert.equal(p.patch_execution.result_copy, p.proposed_revision.after);
    assert.equal(p.patch_execution.original_modified, false);
    assert.equal(p.heldout_evaluation.questions[0].outcome, "not_run");
  });
  const example = fs.readFileSync(path.join(__dirname, "sample_document.md"), "utf8");
  await app.importDocument({name:"sample_document.md",size:Buffer.byteLength(example),text:async()=>example});
  test("local source import works", () => {
    const p=app.payload();
    assert.equal(p.document_snapshot.original_text, example);
    assert.equal(p.document_source_kind, "local_import");
    assert.equal(p.patch_execution.status, "not_run");
    assert.ok(element("doc-blocks").children.length >= 3);
  });
  const targetIndex=element("doc-blocks").children.findIndex(o=>o.textContent.includes("reconnect callback"));
  assert.ok(targetIndex>=0,"Sample fixture should expose target paragraph");
  element("doc-blocks").value=String(targetIndex);
  click("doc-select-block");
  test("target paragraph selection preserves full source", () => {
    const p=app.payload();
    assert.ok(p.proposed_revision.before.includes("refresh()"));
    assert.equal(p.document_snapshot.original_text, example);
    assert.equal(p.proposed_revision.status, "proposed");
  });
  const proposal="The reconnect callback reports restored transport only. Run refresh() and check its completion before reporting a new value.";
  change("document-after",proposal,"input");
  change("document-reason","Bounded clarification for the example.","input");
  change("review-ack",true);
  test("new paragraph must receive new explicit approval", () => assert.equal(app.gateReasons().length,0));
  click("revision-approve");
  click("run-preview");
  test("full-file replacement preserves unrelated text", () => {
    const p=app.payload();
    assert.equal(p.patch_execution.status,"applied_to_copy");
    assert.ok(p.patch_execution.result_copy.includes("This is a fictional sample"));
    assert.ok(p.patch_execution.result_copy.includes(proposal));
    assert.ok(!p.patch_execution.result_copy.includes("Applications can call refresh() to request a new snapshot."));
    assert.ok(p.document_snapshot.original_text.includes("Applications can call refresh() to request a new snapshot."));
    assert.equal(app.revisedFilename(),"sample_document-candidate.md");
  });
  test("portable revision contract stays unapproved for publication", () => {
    const r=app.revisionAdapter();
    assert.equal(r.schema,"documentation-revision/v1");
    assert.equal(r.exact_original_occurrences,1);
    assert.equal(r.approved_for_publication,false);
  });
  change("document-after","Second unapproved text change","input");
  test("editing after approval invalidates patch", () => {
    const p=app.payload();
    assert.equal(p.patch_execution.status,"not_run");
    assert.equal(p.proposed_revision.status,"proposed");
  });
  await app.importRevision({size:120,text:async()=>JSON.stringify({schema:"documentation-revision/v1",case_id:"SYN-01",before:"not present",after:"replacement",rationale:"test"})});
  test("mismatched revision source is blocked", () => assert.ok(app.gateReasons().some(x=>x.includes("exactly once"))));
  await app.importDocument({name:"duplicate.txt",size:61,text:async()=> "A repeated example paragraph.\n\nA repeated example paragraph."});
  test("repeated matching text is blocked", () => assert.equal(app.sourceHits(app.payload().proposed_revision.before),2));
  test("extra search lab remains functional", () => assert.equal(app.searchResults().plans.length,32));
  app.reset(4);
  test("scenario switch clears potentially stale imported content", () => {
    const p=app.payload();
    assert.equal(p.document_source_kind,"synthetic");
    assert.equal(p.case.id,"SYN-02");
    assert.equal(p.patch_execution.status,"not_run");
  });
  process.stdout.write("\n" + tests + " regression assertions passed.\n");
}
main().catch(err => { console.error(err); process.exitCode=1; });
