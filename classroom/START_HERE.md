# End-to-end Evidence Framework — classroom release

## Open it

**Direct browser version:** https://tmkbs.github.io/zebra-evidence-framework/classroom/

**Offline backup:** open [evidence-framework-sandbox.html](evidence-framework-sandbox.html) on GitHub, click **Raw**, save it as `evidence-framework-sandbox.html`, and double-click the saved file in Chrome or Edge. It does not require a server, internet connection or credentials.

The GitHub code-view screen is source code, not the running interface.

## Full presentation (8 stages)

**Architecture → Question → Evidence → Review → Diagnosis → Revision → Retest → Developer preview → Delivery**

The numbered UI includes the full pipeline; **Search lab** is an optional side experiment, not a claim that an evolutionary algorithm is deployed.

Suggested walkthrough:

1. Pick one of the two clearly fictional developer questions.
2. Keep or change the selected evidence, and show how each source has an applicability limit.
3. Review candidates A/B and choose *Prefer B for further review*.
4. Under **Failure diagnosis**, choose *Possible documentation clarity gap*. Explain that this is still a hypothesis, not proof the docs caused the problem.
5. In **Document revision**, review the before/after text, check the acknowledgment and approve **for local retest only**.
6. Under **Retest**, apply the patch to a disposable browser copy. The original paragraph stays unchanged.
7. In **Developer preview**, show the draft answer, selected references, follow-up questions and proposed three-frame video storyboard. No real model inference or video generation takes place.
8. In **Delivery**, export both the full JSON review package and a Markdown case report. Held-out model/device testing correctly remains **NOT RUN**.

## Demonstrate an actual editable document, not just a fixed paragraph

A public-safe fixture is provided at [sample_document.md](sample_document.md).

1. Download that file and open **Document revision → Load approved TXT/Markdown file**.
2. Select the paragraph containing **"The reconnect callback"**, then click **Use selected paragraph**.
3. Edit the proposed replacement. The original imported source stays frozen.
4. Confirm the review decisions and approve the new draft for local testing. The system blocks changes that lack approval, have missing/multiple source matches or differ from the frozen source.
5. In **Retest**, apply the edit to a full-document copy and click **Download revised file**.
6. To exchange a revision with another module, use **Export revision adapter JSON**, or import the [adapter example](revision_adapter_example.json) after selecting the matching paragraph.

The app supports approved local UTF-8 `.txt`, `.text`, and `.md` files up to 200 KB. It makes no network requests, sends no files to a server and does not overwrite the original. Because exports contain source text, **do not use restricted customer data or share an unapproved export**.

## Tests

From the repository root:

```bash
node classroom/test_end_to_end.cjs
```

This zero-dependency regression script exercises the complete offline UI data flow using a simulated DOM. It is not a substitute for testing in Chrome/Edge against the actual source documents or a model endpoint.

## What is finished versus still external

**Implemented:** offline evidence/review workflow, failure classification, revision JSON import/export, permitted local text file import, unique-match paragraph replacement, review-state invalidation, full-copy download, staged retest tracking, user-facing concept preview and portable case reports.

**Not claimed:** the private teammate repository or actual external editor has been imported; model calls, grounded customer answers, generated video, source-owner approval, device validation, measured accuracy or customer publication.

See [Integration handoff](INTEGRATION_HANDOFF.md) for the external module contract and [Verification notes](QA.md) for the evidence boundary.
