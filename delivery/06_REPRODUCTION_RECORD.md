# 06 — Reproduction and artifact record

## Source state

- Repository: `Tmkbs/zebra-evidence-framework`
- Branch: `release/enterprise-portable-20261126`
- Tested commit: `0ad9035227c4d5a543cb88f9d451423fd5ec5577`
- Draft PR: [#30](https://github.com/Tmkbs/zebra-evidence-framework/pull/30)
- Default branch: `main`
- At the last comparison, the delivery branch was 51 commits ahead of main and 0 behind. No merge or deployment was performed.

## Automated run

GitHub Actions run [#146](https://github.com/Tmkbs/zebra-evidence-framework/actions/runs/45884549661) completed successfully:
- Offline regression: passed.
- Actual Chromium interactive-vision test: passed.
- Team-reader visual companion browser test: passed.
- Contextual video encode/decode test: passed.
- Narrated regression and consolidated reproduction: passed.

The reproduction command is:

```sh
npm run reproduce -- runs/reproduction-01
```

The output directory must be new. Requirements and expected outputs are in `analysis/REPRODUCE_DELIVERY.md`.

## Observed reproduction summary

The CI log records:
- 5 narrated clips encoded and decoded.
- 3 public paraphrase-manifest rows imported; 0 eligible for live evaluation.
- 4 archived public first-post groups in the supplementary version-context audit.
- 3 supporting observations and 1 counterexample for the version-context candidate.
- 0 model trials in this offline run.
- Document revision effect: NOT MEASURED.
- Answer strategy effect: NOT MEASURED.
- Evolutionary fitness: NOT RUN.
- Human learning effect: NOT MEASURED.

Two artifacts were retained:
- `contextual-video-preview` — 1,612,204 bytes.
- `narrated-answer-batch` — 2,376,200 bytes.

These artifacts are CI outputs with limited retention, not permanent customer deliverables.

## What a successful reproduction proves

It proves that the tested commit can run the offline regression suite, render and decode the included development videos, create evidence receipts and reproduce the annotated-case counts under the recorded environment.

It does not prove:
- that the live campus or enterprise model endpoint was called;
- that an answer to a real case is correct;
- that expert replies were isolated in every possible browsing path;
- that a document revision improves answer quality;
- that evolutionary strategies improve held-out performance;
- that the videos improve user understanding;
- that a device works or that a support ticket/forum post was prevented.

## Next evidence to add

For each live case run, save a separate immutable record with case ID, channel, origin review, exact question/context, product and installed version, documentation edition, official source URLs and hashes, provider/model identity, settings, full prompt and retrieval payload, raw output, timestamp, latency/usage when available, failure status, independent reviewer scores and critical-error decision. Keep private review keys and customer data outside the public repository.