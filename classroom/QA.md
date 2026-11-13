# QA and provenance checks — public-case revision (13 November 2026)

## Data sources

Default mode contains **three traced public-source research examples**, documented in [public_case_manifest.json](public_case_manifest.json). The first is a November 2 published team case report; the other two are publicly archived forum questions. Published summary evidence is labeled by record origin and scope. A November 10 public team website update describes TC26 and MultiBarcode analyses, but does not prove these particular forum posts are the same exact reviewed cases.

No restricted customer/support content was imported. Official manual paragraphs are **not** reproduced as editable baseline text. The built-in text to revise is a newly paraphrased editorial research-note draft.

## Functional verification

The regression script [test_end_to_end.cjs](test_end_to_end.cjs) checks the actual committed HTML in a simulated DOM using `node classroom/test_end_to_end.cjs`. A pull-request-triggered GitHub Actions run executes the same script; its pass/fail status is the authoritative CI result.

The checks cover:

- Public research case is first, not a fictional example; links and source provenance are explicit.
- Saved model answers and actual optimization metrics are **NOT RUN / NOT MEASURED** for real cases.
- Preferring a missing model output cannot pass the local review gate.
- A documentation-only review can propose an **editorial note** change with human acknowledgment.
- The copy-only patch never modifies the frozen original and cannot authorize publication.
- TC26 and TC52 public forum cases retain their original links and limits.
- Synthetic QA fixtures remain separate and can still exercise the toy search algorithm.
- Local TXT/Markdown import, paragraph selection, unique-match checks, revision JSON import/export, and safe candidate file download.
- No client data transmission, remote model call, automatic source fetching, external scripts, browser tracking or credential storage.

## Agent Continue interoperability

The Review page exports Agent Continue's actual version-1 settings JSON (checked against public v2.2.1 release source), with queue-once and a maximum of one send, **requiring manual task start** in the extension. Selected public source links are included, but no local imported document, credential or secret. A manually returned JSON answer is checked against the exact current case ID before entering Candidate A/B; import provenance is marked unverified and human scores remain blank. The website cannot directly control or detect the Chrome extension.

The regression suite checks JSON structure, absence of automatic sends, wrong-case rejection, provenance on valid manual import, clearing receipts after later edits, and synthetic-only case exclusion. See [Agent Continue bridge](AGENT_CONTINUE_BRIDGE.md).

## Manual/static checks

JavaScript and Node test syntax compiled, all UI element references resolved, no duplicate element IDs, 10 workflow sections preserved. In a prior iteration the local DOM simulation passed 18 public-case-specific assertions. This is separate from actual browser acceptance and is not an empirical model result.

## Remaining limitations

**Not completed:** private teammate editor source integration, exact data from the private website's underlying implementation, approved model runs, real review-time measurements, optimization benchmarks, device testing, official documentation publication or customer signoff. The current public cases are credible source-grounded **research inputs**, not verified resolutions or an already completed controlled model experiment.

GitHub Pages deployment should be checked after the merged commit reaches the main branch.
