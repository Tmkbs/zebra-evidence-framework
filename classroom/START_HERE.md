# Classroom demo — start here

**Primary artifact:** [End-to-end Evidence Framework](evidence-framework-sandbox.html)

Download `evidence-framework-sandbox.html` from GitHub (**Raw → Save as**, preserving the `.html` extension), then double-click it in a browser. It runs offline, without a server or student/campus API credentials. GitHub's code-view page is not the running web app.

## Present the complete workflow

Architecture → Question → Evidence → Review → Failure diagnosis → Document revision → Retest → Developer preview → Delivery.

The main path uses synthetic data and runs fully offline. The **Optional search lab** is a separate constrained-search experiment, not a required part of the documentation workflow.

To demonstrate the editing gate:

1. Select a fictional case and at least one evidence record.
2. In **Review**, make a human decision.
3. In **Failure diagnosis**, select **Possible documentation clarity gap**.
4. In **Document revision**, edit the proposed paragraph, tick the local-only review acknowledgment and choose **Approve for local retest**.
5. In **Retest**, click **Apply to temporary copy**. Notice the original remains unchanged and held-out tests stay NOT RUN.
6. In **Developer preview**, switch between the two recorded candidate answers and inspect the cited synthetic evidence, latest local paragraph and proposed video storyboard.
7. In **Delivery**, export the JSON packet or Markdown case report.

The [synthetic revision JSON](revision_adapter_example.json) is an import example for the separate documentation workstream. The exact source text must match the current classroom case to pass the local gate. For engineering integration requirements and remaining real-world validation, read [Integration handoff](INTEGRATION_HANDOFF.md).

## Boundaries

- All case, doc and evidence text is invented.
- The guide is a conceptual interface, not a verified AI system.
- Local copy modification is a functioning sandbox operation, not an external document edit.
- The teammate's actual editing code is **not** in the accessible repository and has **not** been silently recreated or claimed as connected.
- No real model comparisons, device verification, customer acceptance or generated video are claimed.
- No production release or publication controls are active.
