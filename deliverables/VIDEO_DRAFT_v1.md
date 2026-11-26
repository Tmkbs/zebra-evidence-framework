# First draft video — Zebra Forge / COMP_SCI 338
Draft due November 27, 2026, 11:59 PM CT; final due December 4. Proposed length about 3:30; screen recording plus narration. Confirm assignment-specific length and format in Canvas. This is a recording script, not a recorded video.

Title: Interactive Tech Docs with Conversation and Video
Yuxuan Jin · Zhentong Ye · Minyang Zhang
Northwestern University · Fall 2026 · Zebra Technologies

## Recording sequence
| Time | On screen | Narration |
|---|---|---|
| 0:00–0:20 | Title and project problem | Developers have difficulty finding the right technical guidance, and AI can give plausible but unsupported answers. Our project approaches both problems using shared evidence. |
| 0:20–0:40 | Diagram: question → version and evidence review → documentation path / answer path | We separate two outcomes: improve the document so users can find the answer themselves, and improve how AI responds when users still have questions. |
| 0:40–1:20 | Team case reader: DataWedge 6.2 Intent Output original/proposed edit | Zhentong's document-side work identifies applicable official passages and proposes an edit for review. In this example, the change clarifies which app declares the intent filter and distinguishes a test broadcast from scan delivery. It does not establish the device root cause. The public release contains 57 review cases. |
| 1:20–1:45 | Main Demo, Evidence Framework and Pattern Recognition | On the answer side, we inspect evidence and compare cases. The separate three-case snapshot has seven evidence records. The version candidate has two nominal mentions, but only one independent supporting case. No global pattern is validated. |
| 1:45–2:25 | Main Demo, Apply answer guidance; then Try the same rule on another product | Instead of reusing an old answer, we reuse an answer strategy. Both the DataWedge update question and the Enterprise Browser upgrade question trigger the version-clarification rule. The selected strategy and its provenance are visible. This is rule-based planning, not a live model answer. |
| 2:25–2:45 | Try a source-backed question; show Soft Scan Trigger excerpt | A source-specific prerequisite check is only applied when the product and edition match the checked official source. The result is a useful next check, not a verified device fix. |
| 2:45–3:00 | Optional narrated DataWedge concept clip (brief excerpt) | We also explore diagrams and short narrated explanations to make technical concepts easier to understand. |
| 3:00–3:30 | Architecture and evaluation plan | We aim to integrate both paths into one repeatable workflow. We will test human answer-finding with revised documentation separately from baseline-versus-guided AI answers. Our tests verify software behavior; real-world answer quality, device outcomes, and support savings still need validation. |

## Source links
- Team reader: https://zebra-techdocs-practicum.vercel.app/document-reader/dw62-intent-receiver/index.html#receiving-app-intent-filter
- Current public demo: https://tmkbs.github.io/zebra-evidence-framework/classroom/demo.html
- Official result-code discrepancy: https://techdocs.zebra.com/datawedge/6-8/guide/api/resultinfo/
- Official prerequisite: https://techdocs.zebra.com/datawedge/6-8/guide/api/softscantrigger/

## Optional live comparison
Only include a real campus-model comparison when the campus endpoint is reachable, the same model/settings and evidence are frozen, and an actual JSON receipt is retained. Exact quote matching is mechanical, not semantic accuracy. Do not cite the unverified 1/4 vs 4/4 observation or create a fake response. The first draft can be recorded using the two public prototypes without live model inference.

## Before recording
Confirm the team-reader route and public demo are accessible. Use the main demo rather than relying on the previously broken extended offline strategy panel until PR #24 is verified and deployed. Use actual screen capture with no private material or credentials. Make the shared automation and integration a proposed next step until demonstrated; do not credit individual members with work that has not been confirmed. Suggested split: Zhentong provides document-side footage, Yuxuan provides evidence/answer/visual footage, Minyang integrates recording and QA; confirm with the team. Save the video and its evidence receipts; this script alone is not a Canvas submission.
