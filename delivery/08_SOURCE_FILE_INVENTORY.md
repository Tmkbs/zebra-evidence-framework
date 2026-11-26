# 08 — Existing file inventory and disposition

This inventory is based on files discoverable in the current project Library and repository as of 26 November 2026. It prevents old drafts, historical status panels and sensitive support material from being mistaken for the current release.

| Existing file | What it is | Disposition |
|---|---|---|
| `Zebra_Integrated_Proposal_EN_2026-10-27.docx` | 25-page faculty proposal; preserves the 26 October backlog namespace, six epics, sixteen stories, sixty-four tasks and thirty-two criteria | Retain as the historical backlog/architecture reference. Do not silently rewrite IDs or claim its proposed acceptance tests passed. The exact source workbook remains authoritative. |
| `Zebra_Problem_Statement_Revised_20261123.pdf` | Ordinary Problem Statement revision, not the separate Canvas “Actually Written by the Team” assignment | Retain for history. The new `07_PROBLEM_STATEMENT_DRAFT.md` reflects the current two-channel and automated-answer scope; it still requires team review and is not yet approved for submission. |
| `Zebra_Problem_Statement_Review_Notes_20261123.txt` | Editorial decision record for the 23 November revision | Retain as rationale/traceability, not a submission artifact. |
| `Zebra_Forge_Team_Review_Pack.docx` / `.pdf` | 4 November submission and team review pack | Supporting reference only. Its Harper email is marked proposed/not sent. It says the earlier audit was sent on 7 October, but the current audit is outdated. Do not send a duplicate press release without teammate confirmation. |
| `Zebra_Team_Profile_FINAL.docx` | 4 November team profile and proposed contributions | Historical team context. Contributions are proposed, not confirmed ownership. |
| `Zebra_Framework_Professor_Showcase.pdf` | Five-page professor showcase draft | Historical presentation source. Rebuild/refresh before using as the final customer showcase; current experiment and delivery statuses differ. |
| `07_Draft_Poster_24x36.pdf` | Draft 24×36 poster | Do not print as final until the 57-row snapshot, experiment status, two-channel scope and video status are refreshed. |
| `visual-intelligence.html` | Earlier visual research workbench preview | Historical preview, not the canonical current status. Its delivery panel still mentions “22 files uncommitted”, an unconfirmed source verifier and a November 11 campus receipt. Those are stale relative to the current GitHub branch and CI run. Use this delivery folder and current PR/Actions record instead. |
| `PRIVATE_SPR_115_review_queue.xlsx` | Private support review material | Sensitive. Do not copy into the public repository, use in public/model experiments or expose in a showcase. Support samples require explicit customer permission and sanitization. |
| Team r62 `zebra-cases.csv` / `.xlsx` | Published 57-row, 19-column public case export referenced by the team site's r62 README | Not imported into the current CI reproduction. The published CSV endpoint was inaccessible to the current fetch session. Do not claim 57 cases were evaluated. |
| `Zebra_Professor_Backlog_Evidence_Update_2026-10-26.xlsx` | Referenced as the authoritative detailed backlog workbook | Not found in the available Library search. Do not reconstruct its exact task/criterion fields from the proposal summary. |
| `Zebra_PRFAQ_v8.docx` | Referenced in the 4 November review pack | Not found in the available Library search. Do not claim it was revised or submitted. |
| `Zebra_Team_Audit_FINAL.pdf` | Earlier audit sent on 7 October | Historical and reported outdated in the 4 November review pack. A current three-person audit should be agreed before submission. |

## Current canonical files

Use these files as the current project handoff:
- `delivery/README.md` — overall purpose, phases, status and limitations.
- `delivery/07_PROBLEM_STATEMENT_DRAFT.md` — current problem-statement working draft.
- `delivery/01_CUSTOMER_REQUIREMENTS.md` — two channels and business outcomes.
- `delivery/02_CASE_EVIDENCE_PROTOCOL.md` — case admission, privacy, isolation and dispositions.
- `delivery/03_EXPERIMENT_PLAN.md` — answerability, strategy, document-revision and video experiments.
- `delivery/04_DEMO_SCRIPT.md` — concise demonstration sequence.
- `delivery/05_BACKLOG_TRACEABILITY.md` — historical story IDs mapped to current implementation status.
- `delivery/06_REPRODUCTION_RECORD.md` — exact software reproduction and non-results.

## File decisions not made automatically

No email, Canvas submission, poster printing, team ownership change, private ticket ingestion or production deployment has been performed. Those require team approval or customer authorization.