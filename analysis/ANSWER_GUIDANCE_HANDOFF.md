# Answer-side integration — 24 November 2026

## Keep the division of work

- Team case/document reader (Zhentong Ye): public forum reports, original articles, proposed in-place revisions, source provenance and evidence-discovery methods.
- Pattern research (existing Qwen-generated snapshot): candidate recurrence, independent-support deductions, Track A/B evidence. Preserve its published snapshot and its finding of zero defensible global patterns; do not treat that as an answer-quality benchmark.
- New-question guidance (this PR): decide whether to clarify or retrieve an edition-specific official source; answer a new question with the campus model; test whether provisional response safeguards affect the answer under matched evidence. Do not copy the document editor, case table, or revised article bodies.

## Demonstrate the actual workflow

Use a separate checkout or branch to avoid overwriting local changes. On an authorized machine connected to Northwestern:

    npm test
    npm run campus:check
    npm run campus

Open http://127.0.0.1:3000/answer-guidance.html. Use the existing configured campus host and active port; set AI_BASE_URL if the lab uses a different port. The current model identifier comes from AI_MODEL or the existing campus default. No external paid-model API is allowed by the active Node campus guidance/review paths. A real campus authentication token, if specifically required by the institution, must be set as CAMPUS_QWEN_TOKEN over HTTPS, not a generic external-provider key.

1. Select **Try missing version** and **Plan only**. The program asks for the missing edition without retrieving documents or calling a model.
2. Load the result-code example (the public DataWedge 6.8 Intent Result Codes page). The example is a known development example, not a held-out user test. Confirm the context is public and approved, then choose **Ask campus Qwen**.
3. Inspect the actual retrieved excerpt and any literal RECEIVE_RESULT / SEND_RESULT occurrences. These tokens are not proof of an API defect or of correct on-device behavior. The model's candidate claims have exact-quote checks, not semantic approval.
4. Optionally **Compare baseline / guided**. Both arms use the same frozen excerpts, reported version, context, model identifier, temperature and token limit. A valid pair requires both responses and the same reported model. A pair is not a performance conclusion. Download the receipt for independent review.

The current run receipt is `zebra-answer-plan/v1` inside the response. It includes input and excerpt hashes, actual source URL and retrieval time, raw model responses, exact quote checks, completion/error states, and no device/publication approval.

## Team site integration

Link to the existing pattern snapshot and the answer-side page; do not rebuild the case reader. The public static preview intentionally does not call the campus model, and a public website must not embed the localhost inference service or expose its credentials.

The answer UI accepts the public developer-forum case JSON contract documented in HANDOFF.md, one record at a time. Import reads its ZF ID, question, and up to two official source URLs only; imported document text is not accepted as verified evidence. It leaves the installed version blank. The user must establish the applicable edition before the live run. The existing 57-case CSV remains owned by the team case/document workflow. This PR does not claim it was fetched, converted into independent cases, or evaluated.

If the team owns a deployable shared backend and obtains approval, it can mount the UI plus the campus-only answer endpoint behind an authorized internal service. Until then use the one project navigation and an explicitly local demonstration.

## Next Qwen handoff

On the campus-connected machine, execute a fresh question (not the known DW68 example) with its original official source and export the result. Select a genuinely held-out public forum report with a version-compatible source, then run a paired comparison without giving the expected answer to either model. Independently check applicability, technical correctness, useful next action, and appropriate abstention. Report raw results and unresolved cases. Do not change the pattern snapshot's defensible count based on these answer runs.

No live Qwen call or device validation is claimed by this PR's offline tests. The next real run is the milestone, not another static dashboard.
