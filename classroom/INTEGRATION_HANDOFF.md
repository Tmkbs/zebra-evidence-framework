# Framework ↔ Documentation implementation — integration contract

## Existing source data

Three public research cases are preloaded; see [public_case_manifest.json](public_case_manifest.json). The first is the team's publicly published November 2 structured report. The other two are public forum questions from the team's archive with links to the November 10 public project overview. The source and report are not asserted to be the same exact case unless that link was verified.

No raw customer support ticket, privileged transcript, proprietary manual, API key, or private editor source is bundled. The public manifest carries **real question summaries** but no verified real model output or reviewer-timing measurements. Public access does not automatically grant unrestricted redistribution or model-processing rights.

## Boundary between framework and documentation editing

The framework owns question/evidence/reference metadata, human review decisions, failure hypotheses and exportable case records. The documentation workstream owns source paragraphs, patch proposals, validation and approval. This app implements a functional **local TXT/Markdown paragraph-revision adapter** and original-file preservation. It does **not** claim to integrate the teammate's separate private source code.

The public built-in case texts in the **Revision** page are **editorial research-note drafts**. They are not copied official Zebra documentation paragraphs. Use the separately authorized **Import TXT/Markdown** control when the actual versioned product-document text is permitted to be tested.

## Revision adapter

A downstream editor can exchange `documentation-revision/v1` JSON:

```json
{
  "schema": "documentation-revision/v1",
  "case_id": "ZF-WEB-INTEGRATION",
  "before": "An exact frozen paragraph in the selected research note or local file.",
  "after": "A proposed bounded replacement.",
  "rationale": "Why the evidence warrants a textual clarification."
}
```

[Example JSON for the default case](revision_adapter_example.json). The import checks case identity, field types, length, original paragraph exact-match (once), review decision and local-test acknowledgment. A document-only review is valid when no model has run; choosing a nonexistent model response is explicitly blocked.

Approved changes apply only to a new **temporary browser copy**. The original is never overwritten. Candidate files, case report, guide preview and `research-documentation-handoff/v0.4` JSON can be exported.

For real cases, `recorded_answers[].source` is `NOT_RUN` until something is explicitly entered. Manual text is marked `MANUAL_ENTRY_NOT_VERIFIED`, not a reproducible model run. `optional_search_experiment` is `null` for real cases, because no measured review-time and optimization labels have been supplied. The release gate is permanently `NOT_AUTHORIZED`.

## Remaining validation needed for final customer delivery

1. Obtain the actual private implementation with authorized access, and map its concrete input/output formats rather than guessing endpoints.
2. Agree on source versions, paragraph IDs, exact-match and duplicate-handling policies, review permissions and permitted data retention.
3. Run repeatable, recorded model trials on approved public/authorized data, with a frozen prompt and source snapshot; compare source support and error rates only after independent review.
4. Validate the proposed original/revised documentation change on held-out examples and, if necessary, authorized device builds; preserve regressions.
5. Measure actual review effort before treating any Search Lab prioritization as empirical optimization.
6. Obtain documentation-owner and client approval before publication.

## Tests

`node classroom/test_end_to_end.cjs` is the dependency-free simulated-browser regression. GitHub Actions runs the same test on pull requests. This checks the offline research UI and copy-patching flow; it is not a browser deployment test or customer acceptance.
