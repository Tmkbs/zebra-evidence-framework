# Evidence Framework ↔ documentation module: integration boundary

## Current working integration

The student framework exports a reviewable finding and accepts a minimal document-revision contract. In the standalone classroom app, a local TXT/Markdown source is actually read, a particular paragraph is selected, and an approved change is applied to a **full in-memory copy** of the file. The updated full text and complete evaluation record can be downloaded. This implementation is working at the file/contract level, not at the private repository or production publishing level.

The public repository containing the teammate's archive and proposal does **not** provide the callable source of the separate \`zebra-techdocs-practicum\` implementation. The connected GitHub account cannot read that private repo. Therefore this release **does not claim to have imported, executed, or deployed the teammate's existing source code**.

## Input 1: original document

Supported file types: UTF-8 \`.txt\`, \`.text\`, \`.md\` (maximum 200,000 bytes). A source snapshot is retained in browser memory and is never overwritten. The reviewer chooses a paragraph, creating a frozen \`before\` target.

The replacement is only permitted when the exact \`before\` string appears **once** in the source. Missing or repeated targets block application. Replacing approved text or changing review decisions invalidates prior local approval.

## Input 2: document-revision/v1

The independent documentation implementation can export the following JSON:

\`\`\`json
{
  "schema": "documentation-revision/v1",
  "revision_id": "DEMO-01",
  "case_id": "SYN-01",
  "before": "Exact selected paragraph in the frozen local source.",
  "after": "Proposed replacement paragraph.",
  "rationale": "Evidence-bounded reason for this edit."
}
\`\`\`

Optional exported metadata includes \`document_id\`, \`source_filename\`, \`source_version\`, \`section\`, \`source_kind\`, \`status\`, and \`approved_for_publication\` (always false).

On import the app validates the schema, current case ID, field types and length, then places the draft into **PROPOSED**, not approved. The source exact-match check and separate human gate must still pass. No arbitrary scripts, HTML or remote sources are executed.

## Human gate

Local patch authorization requires all of:

- selected evidence, with applicability limitations preserved;
- human review decision for the candidate answer;
- classification as **possible documentation clarity gap** (only a review hypothesis);
- a nonempty change that matches the source paragraph exactly once;
- an explicit acknowledgment that testing applies only to a browser copy.

The local operation produces a new file with a \`-candidate\` suffix. It cannot modify the original on disk or publish documentation. Held-out test outcomes stay **NOT RUN** until an actual independent test is recorded.

## Output: research-documentation-handoff/v0.3

The exported record contains the current case and known/unknown facts, selected evidence, manual candidate-answer ratings, failure-diagnosis hypothesis, source document snapshot (including locally imported bytes decoded as text), proposed revision and status, copy-patch result, held-out outcomes, optional toy search results, developer-guide storyboard and an explicit **NOT AUTHORIZED** release status.

Because both the original imported source and revised text can be included in exports, these files must be treated according to their input data permissions. The classroom source fixture and cases are invented; locally imported user files may not be.

## Steps to connect the actual teammate implementation later

1. Obtain authorized access to the actual implementation and agree on its input/output semantics; do not infer an API from a prior proposal.
2. Preserve source version and exact section identifiers; agree on UTF-8 normalization, baseline checks, handling of duplicate paragraphs and error statuses.
3. Connect the teammate's revision producer to \`documentation-revision/v1\`. The present app already imports this shape and exports its own proposed drafts.
4. Run a real baseline-versus-revised evaluation on held-out cases using only sources approved for that purpose. Keep evidence and expert references separate from generation inputs.
5. Review changes with the documentation owner before publishing. Report regressions and unresolved results; do not convert local text-patch success into model performance, device validation or customer acceptance.

## Safety and validation

- No external scripts, source URLs, model endpoint or credentials exist in the standalone classroom HTML.
- Public content availability alone does not establish permission to republish it or to include it in a model request.
- Revision approval is **local-test authorization** only. It is intentionally impossible to mark any customer document as published from this demo.
- To reproduce automated mocked-DOM regression checks: \`node classroom/test_end_to_end.cjs\`.
- Complete browser QA, private source integration, endpoint validation and real device testing remain outside the verified scope.
