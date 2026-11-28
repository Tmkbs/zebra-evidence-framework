# Experimental evolutionary strategy selection

The client goal is avoidable-case prevention and automated resolution. This
experimental research extension uses evolutionary computation to search
existing answer strategies, without inventing more product features or
relaxing source/version/authorization gates. The six registered strategies
remain in every genome. A candidate changes only their prompt order and a
bounded response emphasis; all applicable matched strategies remain included.

Generate a deterministic four-candidate population:

```sh
node analysis/strategy-evolution.cjs seed population-0.json 26
```

For each candidate ID, use the existing batch runner with the same reviewed
development questions, same configured provider, same versioned evidence,
and same settings. This is an opt-in experiment with approved non-confidential
inputs only:

```sh
npm run batch -- --input reviewed-approved-input.json --output runs/candidate-1 --mode guided --allow-network --population population-0.json --candidate S-REPLACE_WITH_REAL_ID
```

Use a new output path for each candidate. A changed document excerpt, model
or case group makes the comparison invalid; the fitter checks frozen input
and raw-answer digests. The reviewer should score randomized answer labels
without seeing candidate identity; the operator then binds the completed
review to the exact answer hash. The five 0–2 dimensions are source support,
technical correctness, version applicability, uncertainty calibration and
useful next action. Record critical errors separately and a rationale.
Do not use the held-out split for selection.

Create a private JSON packet with schema zebra-strategy-fitness/v1,
generation, case_split "development", evidence_kind "reviewed_model_runs",
reviewer, independent_review_confirmed true, and rounds. Each round contains
candidate_id, report (the actual batch-report object), and reviews (each
containing id, raw_answer_sha256, scores keyed by the five rubric dimensions
using the snake_case names in the code, critical_error, and rationale).
At least three distinct approved original questions are required for each
of the four candidates. Never upload the review packet or raw answers
unless explicitly approved. Receipt consistency is not proof of actual
model execution or reviewer independence.

```sh
node analysis/strategy-evolution.cjs advance population-0.json reviewed-fitness.json population-1.json
```

Selection prioritizes fewer critical errors, then higher mean rubric
score, with a stable tie-break. The two parents survive; two new offspring
are produced by order crossover and mutation. The next population remains
experimental. Only actual separately reviewed held-out results and team
approval can justify changing the default policy; this script never
promotes or deploys a strategy. It does not evolve the documents, model
weights, safety constraints, or user data. Strategy-order effects may be
small; no gain is guaranteed.

Tests use synthetic receipts to verify algorithm mechanics. Offline
reproduction can generate the initial population, but must label real
fitness evaluation NOT RUN until actual model answers and human review
exist. Do not present fixture fitness as customer impact.
