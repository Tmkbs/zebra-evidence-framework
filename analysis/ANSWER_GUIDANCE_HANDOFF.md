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

## Offline continuation during campus network outage (Nov 24)

The same Ask & Guide page is now usable from GitHub Pages or the local checkout without campus inference. **Offline guidance** runs the identical deterministic planning function used by the server. It asks for missing product/version context and displays a candidate source route. For the two inspected DataWedge 6.8 articles, it presents short, edition-matched, previously checked source snippets and conditional next checks. These are source cards, not a live AI answer or a full article snapshot. Other topics have no cached excerpts unless explicitly added with source review.

If the public Internet is reachable but the campus model is not, run the existing local server and select **Fetch official excerpts only**. This retrieves, hashes and displays official evidence without contacting any model endpoint. The result can be exported as a receipt. An offline receipt is not a scored model run.

The public team CSV can be loaded on demand from the existing published endpoint or imported as a file. Intake admits unique ZF-format rows but does not infer origin or installed version from identifiers or document links. Only an explicit original/question column may populate the question field. A recommendation, root-cause breakdown or title cannot substitute for the question. Missing original questions stay missing. The operator must inspect the forum source and confirm the text; all admitted records begin with zero evaluation eligibility. This is an intake bridge, not a claim to have independently evaluated the 57 public cases. The current execution environment could not retrieve the published CSV; tests use synthetic rows matching the known export schema.

### Qwen next step after connection recovery

Use the existing shared planner and evidence-only path. Recover a real public question through the team's CSV or original forum, confirm its provenance and reported installed version, freeze the applicable official evidence, and perform the campus-only paired run. Independently review the resulting claims and classify applicability, semantic correctness, useful next action, and appropriate abstention. Do not convert offline or synthetic receipts into live evaluation metrics. Do not extend the document editor or claim a new recurring global cause based on these source cards.

## Interactive Vision — answer-side visual framework (Nov 24)

The existing Ask & Guide page is the visual-first entry, not a separate application. `classroom/guidance-visual.js` converts the prepared plan and matching evidence into a portable `zebra-visual-guide/v1` map (nodes, guide-sequence links, next check, controls and provenance). The first two checked templates use DataWedge 6.8's [Soft Scan Trigger](https://techdocs.zebra.com/datawedge/6-8/guide/api/softscantrigger/) and [Intent Result Codes](https://techdocs.zebra.com/datawedge/6-8/guide/api/resultinfo/) articles. Scan-trigger choices are interactive, with all nine profile/scanner states covered by tests. The parameter map compares the two source spellings without deciding device correctness. A newly retrieved excerpt must contain the matching passages before the visual template is used as retrieved evidence. Otherwise the map falls back to the generic route.

Scenario choices do not enter a model prompt. Only an explicit confirmation and Use as reported context action adds user-reported observations to the existing context field, then rebuilds the answer plan. Changing conditions invalidates the old generated context and any stale receipt. The visual receipt preserves hypothetical versus reported status. No hardware access, actual computer vision, live model run, or device fix is claimed. To integrate with Ye's site, reuse the visual module and the existing question/source handoff contract rather than copying the case catalog; preserve his document reader. For new visual templates, add version-pinned source evidence, state-transition tests and source inspection nodes first. Never invent a device screen or video.

## Visual storyboard continuation

The Ask & Guide visual-first entry now renders the existing decision map as a source-linked illustrated walkthrough via `classroom/guidance-storyboard.js`. A `zebra-visual-storyboard/v1` object contains a distinct scene type, ordered node-linked frames, captions, exact source references, and timings. Users can click accessible SVG hotspots, step manually, seek, or play/pause the walkthrough. No auto-playing media, speech service, external image request, or model call is required. The third visual template covers the official DataWedge 15.0 [Set Config](https://techdocs.zebra.com/datawedge/15-0/guide/api/setconfig/) nested bundle structure, independently version-gated; it does not assert that a particular user configuration is valid. The timeline derives from the same map and retains its evidence boundaries. Hypothetical scenario inputs still require explicit user confirmation before entering answer context. The current result export includes both the map and storyboard, so the team website can reuse the visual layer without duplicating the case reader. New topics should begin with a version-pinned source, appropriate visual form (diagnostic, comparison, containment, or generic fallback), and tested frame transitions. The player is a conceptual animated explainer, not an actual device recording or generated MP4.
