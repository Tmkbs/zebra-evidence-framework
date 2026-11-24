# Reusable answer strategies — 24 November 2026

## What is being generalized

The system reuses **response strategies**, not old answers or case-specific fixes. A strategy has:
- an explicit trigger;
- required user context;
- required source evidence;
- a safe next action;
- an abstention boundary;
- provenance back to the case/evidence snapshot;
- a research status that distinguishes a candidate from a validated pattern.

The registry is classroom/answer-strategies.js. The same selector is used by the public demo and by analysis/answer-guidance.cjs before the guided campus-Qwen prompt. Baseline prompts do not receive the selected strategies; the guided arm receives only strategies that matched the current question and source evidence.

## Six current strategy candidates

| Strategy | Trigger | Provenance / current status |
|---|---|---|
| version_boundary | Question explicitly mentions update, upgrade, compatibility, deprecation or version-dependent behavior | 2 nominal case mentions, 1 independent support after shared-evidence and unestablished-version exclusions; threshold 2; **not validated** |
| missing_context | Failure symptom with no diagnostic context | One case: DW-FORUM-00476; single-case observation |
| missing_prerequisite | A matched official excerpt explicitly states a prerequisite | One case association; applied only when an exact product/edition-matched source passage is present |
| example_body_conflict | The same matched official source contains both conflicting terms in separate sections | One case: DW68-RESULT-CONSISTENCY; single-case observation |
| naming_inconsistency | A matched source contains differently spelled API identifiers | Same single-case source observation; preserve exact names and locations |
| unverified_device_claim | A real-device failure is described without a reproducible device test | One case: DW68-RESULT-CONSISTENCY; single-case guardrail |

The source snapshot explicitly says there is **no defensible global pattern** in the three reviewed cases. The registry therefore does not mark any strategy as validated. In particular, the version candidate has only one independent supporting case after discounting reused evidence and the forum report whose installed version was not established.

## Example of reuse on a new product

The version-boundary candidate can be selected for both:
- “After an update, my DataWedge scanner no longer sends data.”
- “After upgrading Enterprise Browser, the app no longer opens.”

The product and symptom differ, but the same candidate response action is reusable: ask for the exact installed version/build and keep any later source retrieval pinned to that edition. This demonstrates **cross-product application of a candidate rule**, not proof that the pattern is globally valid.

## Evidence gates

- Prerequisite checks require a source URL whose product and edition exactly match the plan, plus an excerpt that explicitly says “only when”, “requires”, “must be enabled”, or equivalent.
- A prose/example discrepancy requires both RECEIVE_RESULT and SEND_RESULT in the **same** matched source. Mentioning both names in a user's question is not evidence of a documentation conflict.
- Exact API names are preserved, not silently normalized.
- Real-device claims remain unverified unless a reproducible device test is explicitly recorded.
- Reused evidence is not counted as independent support.

## Validation added

The new offline tests cover:
- candidate provenance and independent-support threshold;
- positive triggers on a different Zebra product;
- generic-question and false-positive suppression;
- missing versus supplied diagnostic context;
- exact source/edition requirements for prerequisite and conflict strategies;
- prevention of combining identifiers from separate sources;
- suppression of the device-claim guardrail only when a device test is explicitly recorded;
- visible selected strategies and provenance in the browser demo;
- inclusion of the same selected strategies in the guided campus-model prompt.

These tests verify deterministic selection and safe prompting. They do not measure answer-quality improvement, prove semantic pattern recurrence, run the live campus model, or test a physical device.
