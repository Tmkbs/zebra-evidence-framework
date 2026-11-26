# Executive Summary — Zebra TechDocs Answerability and Case Prevention

**Prepared:** 26 November 2026  
**Status:** Evidence-based working conclusion; not yet a final customer finding.

## The business question

Zebra receives help requests through two channels:
1. telephone-originated support tickets, including cases later classified as out of scope or working as designed;
2. public developer-forum questions, some of which wait for an expert response.

The opportunity is to answer eligible questions immediately from existing approved knowledge and prevent recurring questions by improving the documentation or the way complex concepts are explained.

## Current conclusion

The evidence supports a **targeted pilot using existing AI assistants and approved Zebra knowledge before investing in a new custom agent**. The project has implemented the software needed to inspect evidence, generate answer candidates, ask for context, route uncertain cases to review and demonstrate selected concepts visually.

The current evidence does **not** yet establish the percentage of real questions that existing AI can answer correctly, the effect of document revisions, the effect of answer strategies, or any reduction in calls/posts. Those conclusions require live, source-isolated model runs and independent human review.

## What the current case evidence suggests

A supplementary inspection of four public forum first posts found a candidate recurring issue around version context:
- Three reports do not establish the installed software version; a linked tutorial or API constant is not proof of the installed release.
- One report explicitly states DataWedge 6.2.23, providing a counterexample to asking every user for a version they have already supplied.

This suggests a practical answer rule: distinguish the reported installed version from the documentation edition; ask only for missing context that materially changes the answer; do not infer device state or diagnose a failure from the version alone.

The sample is purposive, AI-assisted and awaiting team review. It is not a random sample, held-out test set or validated global pattern.

## Recommended operating model

1. **Answer now when the evidence is sufficient.** Return a concise, version-matched answer with source links and actionable next steps.
2. **Clarify when a critical input is missing.** Ask one focused question rather than guessing or asking for information already present.
3. **Escalate when required.** Source conflicts, unsupported claims, unresolved product scope and device-specific behavior should reach a human reviewer with the evidence attached.
4. **Prevent recurrence.** Compare repeated cases, improve only the relevant documentation or reusable answer strategy, and retest on new cases.
5. **Improve understanding in Phase 2.** Create source-grounded diagrams/videos for concepts that recur and are demonstrably difficult to explain in text.

## What has been built

- A version-scoped evidence and answer workflow.
- Batch intake for public forum cases and an approval-gated schema for sanitized support samples.
- Per-case dispositions for document guidance, model candidates, clarification, human review and exclusion.
- A bounded evolutionary experiment over response-strategy ordering/emphasis.
- Interactive source-linked explanations and narrated-video generation.
- A reproducible offline build/test package.

The latest verified offline GitHub Actions run (#146) passed the browser, regression and video encode/decode checks and reproduced five narrated clips. This is software evidence, not answer-accuracy or customer-impact evidence.

## Recommended next decision for Zebra

Approve a small, controlled pilot using existing AI tools and a bounded set of independent real cases from both channels. Keep expert replies reviewer-only. Review every output against the official evidence. Use the results to decide which issues require documentation edits, which can be handled by reusable answer guidance, and which need expert/device escalation.

Do not commission a custom production agent, automatic forum posting or ticket closure until this pilot demonstrates reliable answerability and the customer approves the deployment and data controls.

## Evidence still required

- Import and verify the full published r62 public case export; its README reports 57 rows and 19 columns, but the full CSV was not included in the current reproduction.
- Run real, approved model trials and preserve complete receipts.
- Independently score answer correctness and critical errors.
- Test original versus revised documentation under fixed conditions.
- Test baseline versus pattern-guided answers on held-out case families.
- Obtain customer-authorized sanitized support samples before evaluating the telephone channel with real ticket data.
- Test the Phase 2 video on a new example before claiming a comprehension benefit.
- Measure actual user resolution and support deflection in a separate customer-side study.

**Bottom line:** improve and operationalize the knowledge Zebra already has, answer what can be answered safely, and use recurring failures to decide what needs to change. A new agent is a later option, not the first recommendation.