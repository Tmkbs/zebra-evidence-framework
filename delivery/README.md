# Zebra Forge — final delivery package

**Project:** Interactive Tech Docs with Conversation and Video  
**Team:** Yuxuan Jin, Zhentong Ye, Minyang Zhang  
**Status snapshot:** 26 November 2026  
**Code branch:** `release/enterprise-portable-20261126`  
**Release PR:** [#30 — draft, not merged](https://github.com/Tmkbs/zebra-evidence-framework/pull/30)

## The customer problem

The project covers two customer-help channels:

1. **Telephone-originated support tickets.** A customer calls the service desk; unresolved cases may move through technical support to engineering. Some are ultimately classified as out-of-scope because the product behaves as documented or the requested feature is not supported.
2. **Developer-forum cases.** Developers post questions; some remain unanswered for long periods, while others receive expert replies.

The shared question is whether existing Zebra TechDocs, official sample code and other approved public Zebra sources are enough for an existing AI assistant to answer these questions reliably. Where they are enough, the answer should be available immediately. Where they are not, the project should identify the missing context, unsupported capability, evidence gap or need for expert/device verification.

The business aim is both **immediate automated resolution of eligible questions** and **prevention of similar future calls and posts**. Actual reductions in calls, tickets or forum posts have not been measured.

## Delivery phases

### Phase 1 — documentation and answerability

- Admit real questions with source provenance, product and version context.
- Keep original questions separate from forum replies, expert answers and reviewer-only references.
- Test existing AI against permitted official documentation and sample code.
- Classify supported answers, documented limitations, clarifications, retrieval/reasoning failures, suspected documentation gaps and unresolved device checks.
- Produce exact, reviewable documentation-change proposals only where evidence justifies them.
- Generate an immediate answer candidate for each eligible question; ask for missing information or route uncertain cases to human review.

### Phase 2 — understandability

Use a recurring, evidence-supported difficult concept to create a short visual explanation or video. Every technical claim must be tied to the correct product/version source. The video should teach a concept, not simply read a page aloud. A separate new-example comprehension check is required before claiming learning benefit.

The 14 October customer transcript described video as a bonus opportunity. The current team direction treats it as the second stage after the core documentation/answerability work.

## Current implementation

- Version-pinned official TechDocs retrieval and evidence receipts.
- Existing answer engine with baseline/guided/compare modes and exact-quote screening.
- Batch intake for public forum questions and approved, sanitized support samples.
- Per-case dispositions: document guidance, model candidate, clarification, human review or excluded.
- Bounded evolutionary strategy experiment: four seeded candidates; selection, crossover and mutation operate on answer-strategy order and response emphasis. No strategy is promoted automatically.
- Source-linked interactive visual explanations and local narrated MP4 generation.
- Reusable embedded documentation widget and provider-neutral model adapter. Campus Qwen is a development option, not a customer deployment requirement.

## Reproduced software evidence

At commit `0ad9035227c4d5a543cb88f9d451423fd5ec5577`, GitHub Actions run [#146](https://github.com/Tmkbs/zebra-evidence-framework/actions/runs/45884549661) completed successfully. The offline reproduction reported:

| Check | Observed result |
|---|---:|
| Narrated clips encoded and decoded | 5 |
| Public paraphrase-manifest rows imported | 3 |
| Paraphrase rows eligible for live evaluation | 0 |
| Archived first-post groups in the supplementary version-context audit | 4 |
| Supporting version-context observations | 3 |
| Counterexample with version already reported | 1 |
| Live model calls in this reproduction | 0 |
| Validated global patterns | 0 |

The five videos are development demonstrations. The four archived reports are a purposive, AI-assisted source-inspection sample with team review pending. The three supporting observations and one counterexample are a recurring-pattern candidate, not a validated general finding.

## What is not yet established

- The full r62 public 57-row CSV has not been imported into this run; 57 is the team site's published snapshot count, not this reproduction's evaluated denominator.
- No new live Northwestern model calls are included in the offline CI run.
- No independent human scoring of real model outputs is included in the reproduction.
- No controlled original-versus-revised-document effect has been measured.
- Evolutionary fitness has not been run on real reviewed model outputs; no held-out gain is established.
- No device fix, user comprehension gain, customer acceptance or support-volume reduction is established.
- The support-ticket route accepts only explicitly approved, sanitized samples; no private ticket data or live telephone integration is included.

## Read the handoff

- [00 — Problem statement draft](07_PROBLEM_STATEMENT_DRAFT.md)
- [01 — Customer requirements and scope](01_CUSTOMER_REQUIREMENTS.md)
- [02 — Case intake and evidence protocol](02_CASE_EVIDENCE_PROTOCOL.md)
- [03 — Experiment plan](03_EXPERIMENT_PLAN.md)
- [04 — Demonstration script](04_DEMO_SCRIPT.md)
- [05 — Backlog traceability](05_BACKLOG_TRACEABILITY.md)
- [06 — Reproduction and artifact record](06_REPRODUCTION_RECORD.md)
- [Engineering rules](../AGENTS.md)
- [One-command offline reproduction](../analysis/REPRODUCE_DELIVERY.md)
- [Evolutionary strategy experiment](../analysis/STRATEGY_EVOLUTION.md)

This package is a project handoff, not a customer-approved production release.