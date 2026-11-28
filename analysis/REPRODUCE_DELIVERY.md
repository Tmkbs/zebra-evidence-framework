# Reproduce the delivery candidate

Run the entire offline release reproduction with one command, from a clean
checkout of the selected release branch or commit:

```sh
npm run reproduce -- runs/reproduction-01
```

Requirements: Node 20+, Git, Python 3 with Pillow, FFmpeg/ffprobe,
eSpeak NG or eSpeak, and a usable font (see LOCAL_NARRATION.md). This command
uses no model, campus network, credentials, or external document retrieval.
The destination must not exist. A failed run returns a nonzero exit status;
do not present partial output as a passing release.

The run produces:
- reproduction.json: commit, tool versions, input fingerprints, verified clip
  digests and paths, explicit scope and non-results.
- narrated-batch/ and document-lesson/: five playable MP4s, subtitles,
  source-linked narration inputs, media verification receipts, batch reports.
- public-manifest-intake/: provenance-aware intake of paraphrased cases
  (not a scored dataset).
- pattern-report.json: the repeatable count from four annotated public reports,
  including three version-context gaps and one counterexample.
- strategy-population-0.json: four reproducible experimental candidate genomes;
  no real fitness assessment or promotion. See STRATEGY_EVOLUTION.md.

The annotations are frozen, AI-assisted source inspections awaiting team review;
this command recomputes their counts, not the original forum inspection.
The five videos are development demonstrations, not five successful customer
answerability tests. A repeat run must preserve the logical scope, counts,
source links and receipt checks. Byte-identical video output across encoder
versions is not required. A dirty tracked working tree is recorded.

The GitHub Classroom end-to-end QA workflow invokes this exact entry point
and publishes the reproduction folder as its narrated-answer-batch artifact.
The existing browser, server, and software regression tests remain separate.

## What this can and cannot tell Zebra

There is evidence of recurring version-context uncertainty in this small,
purposefully selected public sample. The team also has proposed clarifications
of prerequisites, feature boundaries, and ambiguous instructions. Recommend
targeted evidence-based document review and testing with existing AI first.
Do not infer global documentation defects, increased answer accuracy, improved
comprehension, fewer support requests, or a need for a custom deployed agent.
The real-source-only AI trials and original/revised-document comparisons are
separate evidence gates; the reproduction manifest explicitly marks them
NOT_MEASURED. No new product feature is introduced.
