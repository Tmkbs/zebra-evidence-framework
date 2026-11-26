# Final prototype acceptance — paired answer pilot

This is the release gate for the existing Ask & Guide prototype, not another case dashboard. The reviewer tool reads the existing batch-report.json. It makes no network or model calls.

## Demonstrate the product

On an authorized Northwestern-connected machine, run npm test, npm run campus:check and npm run campus. Open http://127.0.0.1:3000/answer-guidance.html. Demonstrate a known question, its source-linked visual explanation and the short video; local narration requires the documented Python/FFmpeg/eSpeak dependencies. Then demonstrate missing version: clarification must happen rather than a guessed answer. The team reader remains the documentation proposal and evidence source.

## Capture real comparisons

Use the public team CSV to locate original questions. Inspect the original report, confirm public/approved scope and establish the applicable version before preparing reviewed-public-input.json per BATCH_AUTOMATION.md. Do not include private client data or analyst answers. Keep development and held-out cases separate.

```sh
npm run batch -- --input reviewed-public-input.json --output runs/paired --mode compare --allow-network
node analysis/review-pairs.cjs prepare runs/paired/batch-report.json runs/paired-review
```

The review tool admits only receipts reporting two completed same-model calls, reviewed public origins, matching version-specific sources, consistent settings and internal digests. It preserves exclusion reasons and deduplicates question/forum groups. A receipt/hash is not proof of authenticity or actual server execution; inspect the real run independently.

## Independent review

Give the reviewer review-packet.json and review-scores.json only, not review-key.private.json or original condition labels. Randomized A/B order hides the mapping, though wording may reveal it. Score every dimension 0/1/2 and enter a concrete rationale and critical-error boolean for each response:

- Source support: 0 unsupported; 1 partly supported; 2 claims entailed by evidence.
- Technical correctness: 0 serious error; 1 incomplete/minor error; 2 sound within established scope.
- Version applicability: 0 wrong scope; 1 unclear; 2 correct and explicit.
- Uncertainty calibration: 0 false certainty; 1 some limitations omitted; 2 appropriate uncertainty and abstention.
- Useful next action: 0 unsafe/unhelpful; 1 generic; 2 actionable and grounded.

Flag critical errors independently of total score, e.g. invented capability, consequential wrong command, false device test or confidently wrong edition. Enter the reviewer and independent-review confirmation only after actual review.

```sh
node analysis/review-pairs.cjs grade runs/paired-review/review-packet.json runs/paired-review/review-key.private.json runs/paired-review/review-scores.json runs/paired-review/summary.json
node --test analysis/test_review_pairs.cjs
```

The summary includes per-case scores, paired differences, critical errors and exclusions. Zero admitted runs produce null means. No held-out or effectiveness claim is automatic. Keep private keys and actual run/question files out of Git.

## Client handoff gates

1. Offline prototype and source-backed video demonstration.
2. Actual campus smoke check and public-only paired runs.
3. Independent technical scoring and publication approval.
4. Verify hosted team reader -> visual companion -> Ask & Guide navigation.
5. Present documentation proposals and answer-side results separately; label unperformed steps NOT RUN. No device-fix, support-ticket reduction, or learning-effect claim without independent evidence.

This branch changes neither the private application nor its deployed site.
