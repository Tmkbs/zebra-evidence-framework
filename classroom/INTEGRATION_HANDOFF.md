# Evidence Framework × Documentation Revision: integration contract

## Scope and current truth

The student framework and the documentation-analysis workstream are **separate components**. This classroom build demonstrates a real, offline data flow between them: selected evidence and human diagnosis lead to a proposed wording change; a reviewer authorizes a copy-only patch; a held-out test record and an end-to-end delivery packet can be exported.

**This repository does not contain, execute or claim to have imported the teammate's independent editing source code.** The existing project analysis has documented bounded case findings and proposed revisions, but those are not equivalent to a callable service. The bridge here is a **working local JSON import contract plus an in-browser copy-preview**, not a customer documentation deployment.

The classroom HTML and example revision use **invented data only**. Do not add real client reports, access-controlled sources, meeting notes, internal URLs, model keys, secrets, proprietary manuals or confidential test outputs to this public repository. Public visibility of some material does not by itself establish redistribution permission.

## Local adapter contract

Import a JSON file at **Document revision → Future module adapter**.

Required fields:

```json
{
  "schema": "documentation-revision/v1",
  "case_id": "SYN-01",
  "before": "The exact baseline paragraph from the synthetic demo",
  "after": "A proposed replacement paragraph",
  "rationale": "Why this bounded change may help"
}
```

Optional: `revision_id`. Other keys are ignored. The browser rejects invalid schema/case, oversized content and empty paragraphs; it checks the `before` text against the current synthetic baseline before local-test approval. Imported drafts always start **PROPOSED**, never approved. No remote request occurs.

Review gate: possible documentation clarity issue + at least one selected evidence record + explicit answer-review decision + a nonempty change that matches the frozen original + a human consent check.

The **Approve for local retest** button authorizes only a change to an in-memory disposable text copy. Any material revision or upstream review change invalidates the old approval. There is no customer publishing action.

## End-to-end record

`research-documentation-handoff/v0.2` carries:

- **Case**: stable synthetic ID, question, known and missing facts.
- **Evidence**: selected record IDs and their applicability limitations.
- **Candidate answers**: current visible text and manual criterion scores.
- **Diagnosis**: root-cause hypothesis, not a confirmed root cause.
- **Proposed revision**: source version/section, before/after, rationale, selected evidence IDs, review state.
- **Copy verification**: whether the in-browser copy was actually updated; original remains unchanged.
- **Held-out evaluation**: frozen questions, explicitly NOT RUN until a reviewer enters observed results.
- **Developer guide concept**: synthetic answer, supporting reference labels, explanatory storyboard; no live AI or video claims.
- **Release**: permanent NOT AUTHORIZED for classroom data; customer acceptance and device validation NOT RUN.

## What is still required for real teammate-code integration

1. Obtain the actual, authorized revision module repository or code artifact and its input/output format. Do not infer APIs from an old proposal document.
2. Map its versioned source identifiers and editing granularity to the revision schema. Define preconditions, exact-match checks, idempotency, provenance and error outcomes.
3. Replace mock documents with **approved** development fixtures held outside public student repos. Keep original-source bytes and reference answers separate from model input.
4. Run integration tests against the real module and save execution evidence. A passing copy-preview test here does not substitute for that.
5. Record a real controlled model attempt, manual source verification and a held-out original-vs-revised comparison. Preserve failures and regressions. Do not claim accuracy uplift from the current synthetic scores.
6. Require documentation-owner review, version checking, publication authorization and feedback before changing any customer documentation.
7. If a conversational guide or video feature is delivered, separately test its grounding, accessibility, performance and suitability for the relevant product/version.

## Classroom walkthrough (about 3–5 minutes)

1. **Architecture** — explain the framework/document-editor boundary.
2. **Question** — select a fictional technical issue and list missing context.
3. **Evidence** — select source records, point out their limits.
4. **Review** — inspect or manually replace sample answers, record a reviewer decision.
5. **Diagnosis** — select *possible documentation clarity gap* (a hypothesis).
6. **Document revision** — edit the minimal proposed paragraph, acknowledge the gate, approve for a local test.
7. **Retest** — apply to a disposable copy; show the NOT RUN held-out questions.
8. **Developer preview** — show the candidate conversational answer, evidence and storyboard.
9. **Delivery** — download JSON/Markdown with explicit provenance and unresolved statuses.

The **Optional search lab** explores a small fictional constrained-optimization problem and is not required for the project workflow. It makes no evolutionary-algorithm claims.

## Verification

The HTML was exercised with synthetic DOM interaction tests for approval, refusal, copy application, revision invalidation, mismatched import, guide dataflow and export generation. This is **not a full Chromium or mobile-browser test**. Real module integration, campus model calls, held-out result verification and live publication have not been performed.
