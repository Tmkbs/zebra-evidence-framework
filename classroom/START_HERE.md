# Evidence Framework — Public-source research release

## Open the site

**Interactive webpage:** https://tmkbs.github.io/zebra-evidence-framework/classroom/

**Offline option:** Save [evidence-framework-sandbox.html](evidence-framework-sandbox.html) via GitHub Raw and open it locally in Chrome or Edge. The file uses no external scripts, model endpoints, API calls, tracking or storage. Clicking a public citation deliberately opens a separate public website.

## Five-minute in-browser presentation

Open the [interactive demo](https://tmkbs.github.io/zebra-evidence-framework/classroom/) and click **Presenter mode · 5 min** in the top-right header. Nine English cue cards provide **Say** and **On screen** prompts and let you move between the real workflow pages.

The cue cards **do not perform approvals or make up data**. On the real public case, choose **Documentation-only review · no model run**, then **Possible documentation clarity gap**, approve the proposed editorial review-note text for a **local retest**, and apply it to a temporary copy. End at Delivery, which exports the full record.

[Full speaker script (5 minutes + 90-second backup)](../PRESENTER_NOTES.md). The optional Search Lab is for toy algorithm QA, **not real-case performance evidence**.

## What actually comes from the team's research

The default case is **ZF-WEB-INTEGRATION**, based on the team's [published November 2 case report](https://github.com/1235357/zebra-public-site-archive/blob/main/faculty-checkin-2026-11-02/demo/report.json) and its cited DataWedge 15.0 official documentation. It provides actual public-source references and a carefully scoped editorial finding. It is not a saved AI result, device test or approved Zebra documentation change.

Two additional public archive examples are **TC26 Xamarin scanner configuration** and **TC52 DataWedge MultiBarcode**. The [team public project overview](https://github.com/1235357/zebra-public-site-archive/blob/main/README.md), dated November 10, also identifies TC26 scanner-lifecycle and MultiBarcode case reports on its [read-only project website](https://zebra-techdocs-practicum.vercel.app/). The original publicly archived forum threads included here are traceable real questions, but the overview **does not establish they are identical to the individual private-site reports**; we do not claim a match.

[Public case manifest](public_case_manifest.json) preserves the source URLs, version/scope caveats and NOT RUN status in a reusable format. According to the team's [November 5 technical status](https://github.com/1235357/zebra-public-site-archive/blob/main/TECHNICAL_STATUS.md), the larger archive contains 2,854 unique admitted forum records and an initial development set of eight cases linked to 12 official source URLs. **These counts are not model scores or independently validated solutions.**

The final two selector options are explicitly marked **Synthetic QA only**. Their Search Lab uses invented cost and priority values solely to exercise an optimization prototype; it is disabled for real cases until real measurements exist.

## Walk through the real research workflow

1. **Architecture:** show that this is a research/evaluation framework linked to the team's actual public-source case work.
2. **Question:** pick the default public Android web integration case and open its original forum link and public report, if the audience wants to verify the provenance.
3. **Evidence:** select relevant published source reviews, emphasizing applicability and missing conditions. For the first case, a versioned native soft-scan command is not proof of browser integration.
4. **Review:** actual model runs are **NOT RUN**. Choose **Documentation-only review · no model run** instead of pretending candidates A/B were generated.
5. **Diagnosis:** select *Possible documentation clarity gap* as a **hypothesis**, not a confirmed device or documentation defect.
6. **Document revision:** the built-in paragraph is an **editorial case-review note**, not Zebra's official source text. The proposed change can make that note more precise. Confirm human acknowledgment.
7. **Retest:** approve the candidate and apply it to a temporary **review-note** copy. This validates the file-editing mechanics only. Held-out checks remain NOT RUN.
8. **Developer preview:** inspect source-linked context, the explicit lack of a verified model answer and a *storyboard only* visual plan.
9. **Delivery:** export the case report and structured JSON containing original URLs, evidence limits, non-verification and review state.

### Real document patching (separate from the public built-in review notes)

If an approved, properly licensed TXT or Markdown document is available, use **Document revision → Load approved TXT/Markdown file**, select a paragraph, propose a change and use the same review gate to generate a new candidate document. The original local file remains unchanged. This does **not** automatically change the manufacturer's documentation.

The [revision JSON example](revision_adapter_example.json) matches the default public case-review note. [A separate synthetic file](sample_document.md) remains useful for testing file imports without publishing restricted content.

## What's finished, what's still missing

**Completed here:** traceable public-source case summaries, source links and limits, documentation-only review mode, safe local document revision workflow, a repeatable import/export contract, developer-facing preview, no-run labeling, report export and automated simulated-DOM checks.

**Not completed/claimed:** the teammate's inaccessible private editor source code, exact private website report data, restricted customer/support cases, live model comparisons, actual optimization outcomes, official documentation approval, device-level verification, or generated video.

[Engineering handoff](INTEGRATION_HANDOFF.md) · [Automated tests](test_end_to_end.cjs) · [QA boundaries](QA.md)
