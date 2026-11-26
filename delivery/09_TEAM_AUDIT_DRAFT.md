# Team Audit — current working draft

**Project:** Interactive Tech Docs with Conversation and Video  
**Client:** Zebra Technologies  
**Team:** Yuxuan Jin, Zhentong Ye, Minyang Zhang  
**Prepared:** 26 November 2026  
**Status:** Draft for three-person confirmation; not yet approved for submission.

## Project summary

The project addresses two customer-help channels: telephone-originated support tickets and developer-forum questions. It investigates whether existing Zebra TechDocs, sample code and approved public sources can support immediate AI answers, and why some questions still require support or expert intervention.

The intended outcomes are:
- answer eligible questions immediately with version-matched evidence;
- ask for missing context or escalate safely when evidence is insufficient;
- identify recurring misunderstandings and improve the relevant documentation or reusable answer strategies;
- in Phase 2, use concise source-grounded visual explanations or videos to make difficult concepts easier to understand.

The current deliverable is an evidence-based evaluation and reproducible prototype, not a production phone bot, forum auto-poster or customer-approved agent.

## Team contributions

### Yuxuan Jin — Team Lead / Evidence Intelligence Framework

**Current contribution evidenced in the project repository:**
- Maintains the independent answer-side framework and shared case/evidence/run workflow.
- Implements version-scoped answer planning, official-source retrieval, model-run receipts and answer dispositions.
- Integrates public forum and approved sanitized support-sample intake.
- Develops reusable answer strategies and the experimental evolutionary selection workflow.
- Builds source-linked interactive explanations, narrated-video production and the consolidated reproduction/acceptance process.
- Coordinates the final delivery scope and project communication.

**Relevant strengths:** Python/JavaScript, retrieval and evidence workflows, document/media processing, model integration, evaluation and reproducibility.

### Zhentong Ye — Documentation and Case Evidence

**Current contribution reflected in the existing team audit and public team-reader work:**
- Organizes real developer cases and their product/version context.
- Reviews official TechDocs and sample-code evidence.
- Prepares documentation revisions and links changes to the relevant case records.
- Maintains the team-facing case/document reader and evidence presentation.

**Relevant strengths:** React/TypeScript, knowledge graphs, citation/source checks and documentation work.

### Minyang Zhang — Prototype Integration and Testing

The 4 November team audit proposed this contribution area:
- prototype integration;
- test execution;
- reproducibility checks.

**Confirmation needed:** update this section with Minyang's latest concrete implementation, tests and deliverables before sending the audit. Do not attribute unverified recent work to him.

## Shared responsibilities

All three members should review:
- the admitted case set and original-question provenance;
- product/version applicability and official evidence;
- model output and reviewer-only reference separation;
- documentation proposals and answer-strategy findings;
- the final demo, limitations and client-facing conclusions.

Named owners for individual backlog stories, independent technical reviewers and the next review cadence still require team agreement.

## Current engineering status

At the tested framework commit `0ad9035227c4d5a543cb88f9d451423fd5ec5577`, GitHub Actions run [#146](https://github.com/Tmkbs/zebra-evidence-framework/actions/runs/45884549661) passed the offline software/browser/video checks. The offline reproduction encoded and decoded five narrated clips and reproduced the supplementary four-report version-context count.

The same reproduction made zero live model calls. It did not measure documentation-revision effects, answer-strategy effects, evolutionary fitness, human learning or support-volume reduction. The team's public r62 release reports 57 case rows, but the full export was not imported in that CI run. These limits must remain visible in any submission.

## Skills and remaining needs

The team covers source organization, documentation analysis, answer-engine implementation, interactive presentation and practical software testing.

Remaining needs:
- complete original public questions and approved support samples;
- Zebra product/domain review for ambiguous or conflicting evidence;
- independent human assessment of actual model outputs;
- confirmed product/version and device/runtime details for any hardware-dependent claim;
- team agreement on story ownership, reviewer assignment, showcase availability and next meeting times.

## Before submission

1. Yuxuan, Zhentong and Minyang confirm the role descriptions and add any missing concrete contributions.
2. Confirm whether the current press release was already submitted by a teammate; avoid sending a duplicate.
3. Confirm the exact requested audit format and whether a PDF/DOCX export is needed.
4. Agree the next bounded real-case evaluation and independent reviewer.
5. Keep all unrun acceptance checks and customer-impact claims explicitly NOT RUN / NOT MEASURED.

This draft is intended to replace stale role/status descriptions only after team confirmation. It does not send email or submit the audit automatically.