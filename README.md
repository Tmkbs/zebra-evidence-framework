# Zebra Forge — Interactive Tech Docs with Conversation and Video

**Current handoff:** [Final delivery package](delivery/README.md)  
**Engineering branch:** `release/enterprise-portable-20261126`  
**Review:** [Draft PR #30](https://github.com/Tmkbs/zebra-evidence-framework/pull/30) — not merged

## Customer goal

Reduce avoidable help-seeking through two complementary outcomes:

1. **Immediate automated resolution:** answer eligible questions from approved Zebra documentation and sample code; ask for missing context or escalate when evidence is insufficient.
2. **Proactive case prevention:** compare recurring telephone-originated support tickets and developer-forum cases, then improve the relevant documentation, answer strategies and, in Phase 2, difficult-concept explanations.

The two intake channels share one evidence and answer workflow. The current prototype supports public forum records and a schema for approved, sanitized support samples. It is not connected to Zebra's phone system or production forum and does not post answers or close tickets.

## Delivery phases

- **Phase 1 — documentation and answerability:** original question → product/version scope → official evidence → existing-AI answer → independent review → finding and proposed document/strategy change.
- **Phase 2 — understandability:** source-grounded diagrams and short videos for recurring difficult concepts. Video should teach a concept, not read a document aloud. Learning benefit remains unmeasured.

## Start here

- [Executive summary for client review](delivery/00_EXECUTIVE_SUMMARY.md)
- [Final delivery and current status](delivery/README.md)
- [Updated problem statement draft](delivery/07_PROBLEM_STATEMENT_DRAFT.md)
- [Customer requirements and two channels](delivery/01_CUSTOMER_REQUIREMENTS.md)
- [Case intake and evidence protocol](delivery/02_CASE_EVIDENCE_PROTOCOL.md)
- [Experiment plan](delivery/03_EXPERIMENT_PLAN.md)
- [Demonstration script](delivery/04_DEMO_SCRIPT.md)
- [Backlog traceability](delivery/05_BACKLOG_TRACEABILITY.md)
- [Reproduction record](delivery/06_REPRODUCTION_RECORD.md)
- [Existing file inventory and disposition](delivery/08_SOURCE_FILE_INVENTORY.md)
- [Updated three-person Team Audit draft](delivery/09_TEAM_AUDIT_DRAFT.md)

## Existing prototype

- [Ask & Guide](classroom/answer-guidance.html): version-scoped answer guidance, evidence retrieval, clarification and baseline/guided comparison.
- [Embedded assistant example](classroom/embedded-assistant.html): reusable host-page integration example.
- [Team visual companion](classroom/visual-companion.html?reader=dw62-intent-receiver): read-only handoff from a public team document case.
- [Batch workflow](analysis/BATCH_AUTOMATION.md): offline intake, evidence processing, optional model runs and narrated-video generation.
- [Offline reproduction](analysis/REPRODUCE_DELIVERY.md): one-command reproduction of the current software/video test package.
- [Evolutionary strategy experiment](analysis/STRATEGY_EVOLUTION.md): bounded experimental search over existing response strategies; no automatic promotion.

## Verified software status

At commit `0ad9035227c4d5a543cb88f9d451423fd5ec5577`, GitHub Actions run [#146](https://github.com/Tmkbs/zebra-evidence-framework/actions/runs/45884549661) passed both offline regression jobs. The consolidated reproduction encoded and decoded five narrated clips, imported three paraphrase-manifest rows, and recounted four archived public report groups (three supporting observations, one counterexample) for a version-context candidate.

These are software and annotated-input checks, not live model accuracy results. The reproduction recorded zero live model calls, zero validated global patterns, evolutionary fitness NOT RUN, and document-revision/answer-strategy/learning effects NOT MEASURED.

The team's public r62 README reports a 57-row, 19-column case export. The full CSV was not loaded in the cited CI run; do not present 57 as the evaluated denominator.

## Northwestern model and enterprise portability

A local Northwestern-compatible model adapter remains available for development/testing. The CI workflow is offline and does not call the campus endpoint. Confirm the actual endpoint, model identity and live response in the authorized local environment before claiming a current successful inference. Do not infer the port from old examples.

The same answer engine can use an explicitly administrator-approved HTTPS OpenAI-compatible enterprise gateway. The enterprise prototype defaults to model inference off. No Zebra production gateway, private knowledge base, private ticket feed or external model provider has been connected in this branch.

## Data and safety boundaries

- Use original public forum first posts and approved public sources for clean docs-only evaluation.
- Keep expert/forum replies and scoring references out of generation inputs.
- Support-ticket examples require explicit customer authorization and sanitization; never commit raw customer tickets, personal information, secrets or proprietary logs.
- Preserve product and version boundaries. A model failure is not automatically a documentation defect.
- No device fix, user resolution, customer acceptance, support-volume reduction or learning gain is claimed without separate evidence.

## Development

Requirements: Node 20+. For narrated MP4 generation, see `analysis/LOCAL_NARRATION.md` for Python/Pillow, FFmpeg, eSpeak and font requirements.

```sh
npm test
npm run reproduce -- runs/reproduction-01
```

The output directory must be new. Real model experiments are separate, explicit, approved runs; mock/offline CI is never counted as a live model trial.
