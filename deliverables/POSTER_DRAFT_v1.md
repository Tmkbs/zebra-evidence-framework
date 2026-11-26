# Draft poster — COMP_SCI 338 / Zebra Forge
Draft due November 27, 2026, 11:59 PM CT. Final due December 2. Confirmed specification: 24 × 36 inches, portrait. This is a content/layout brief, not a rendered submission.

## Title and attribution
**Interactive Tech Docs with Conversation and Video**
Evidence-Guided Documentation and Answer Improvement
Yuxuan Jin · Zhentong Ye · Minyang Zhang
Northwestern University · COMP_SCI 338 / The Forge · Fall 2026 · Zebra Technologies

## Problem
Developers frequently need to combine forum questions, official documentation, software versions and device context. Documentation gaps make self-service difficult; AI may produce confident answers without sufficient applicable evidence. Address both barriers using the same source-linked evidence, while keeping documentation improvement and answer guidance distinct.

## Approach — central figure
Public developer question → product, edition, and context check → official evidence retrieval → evidence-linked review.
- Documentation path (existing case reader and proposed revision workflow): identify the exact passage, distinguish a possible documentation gap from a device/configuration issue, propose a bounded edit, display original versus proposed text for writer review.
- Answer path (existing strategy registry): compare reviewed cases, select provisional reusable answer strategies based on a new question and applicable evidence, prepare a guided answer or clarification. When connected and authorized, compare baseline and guided model outputs under the same model, evidence and settings.
- Shared evaluation and handoff: preserve the question, evidence, source edition, review status and unresolved checks. Proposed shared JSON/CSV and end-to-end batch integration remain integration work, not a delivered joint service.
- Optional user-facing output: source-linked visual diagrams and a 33-second narrated DataWedge concept explainer.

## Documentation path: demonstrated
57 English documentation-review case rows in the team's r62 release, not 57 verified product bugs or held-out test results.
Example: DataWedge 6.2 Intent Output. The proposed revision clarifies that the receiving app declares the intent filter, and distinguishes a test broadcast from actual barcode delivery. No device root cause is claimed.
Existing writer view: https://zebra-techdocs-practicum.vercel.app/document-reader/dw62-intent-receiver/index.html#receiving-app-intent-filter
Evidence-discovery methods and edition-routing replays exist on selected development examples. Automatically processing arbitrary new questions and issuing reviewable patches is the next engineering target; no client publication is claimed.

## Answer path: demonstrated
A separate three-case research snapshot contains seven evidence records (six official-source records and one forum report). Six provisional response strategies are implemented. One candidate (version boundary) has two nominal mentions, reduced to one independently supporting case against a threshold of two. Zero global patterns are validated.
Examples:
- A DataWedge update failure and an Enterprise Browser upgrade failure both trigger the candidate version-clarification strategy. This demonstrates rule reuse, not a validated universal pattern.
- The DataWedge 6.8 **Intent Result Codes** article contains RECEIVE_RESULT in its overview and SEND_RESULT in its code example; show both passages and request review, not an invented resolution.
- The separate Soft Scan Trigger article provides a documented barcode-input prerequisite; do not confuse it with the result-code discrepancy.
Public demo: https://tmkbs.github.io/zebra-evidence-framework/classroom/demo.html
Research snapshot: https://tmkbs.github.io/zebra-evidence-framework/analysis/zebra-pattern-analysis.html

## Evaluation
Two separate proposed experiments on fresh forum questions:
1. Human answer-finding using original vs proposed documentation, measuring supported answer completion, time and uncertainty.
2. AI baseline vs strategy-guided answer using identical model, evidence and settings; capture exact inputs and outputs and score semantic source support, applicability, clarification and unsupported claims separately.
Current offline and browser regression tests check behavior and traceability, not measured answer quality or user learning.
Do not include the earlier 1/4 vs 4/4 pilot claim: a reproducible run receipt and matching configuration have not been established from the repository.
No completed held-out study, device validation, production integration or support-cost reduction is claimed.

## Proposed completion ownership (team confirmation required)
Zhentong Ye: document-side discovery, revision runner and reviewer-facing output.
Yuxuan Jin: evidence review, cross-case candidate strategy registry, answer evaluation and visual explanation.
Minyang Zhang: integration, repeatable batch execution and end-to-end QA/reporting.

## Layout / production checklist
24 × 36 in portrait, three clear content areas (shared approach; documentation; answer guidance), bottom strip for evaluation/limitations and links. Put the two existing demos side by side; use actual screenshots from the respective pages. Do not simulate a live model result. Render to PDF with readable text; confirm the Canvas assignment requirements, final team credit and screenshots before submission. No submitted or rendered poster is implied by this file.
