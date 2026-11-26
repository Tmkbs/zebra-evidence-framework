# 03 — Experiment plan

The experiments answer different questions. Do not collapse them into one four-cell API comparison.

## Experiment A — Can existing AI answer the real question from approved knowledge?

**Purpose:** establish whether current documentation and sample code support self-service for actual forum and support questions.

1. Admit a real first-post question or approved sanitized ticket sample.
2. Freeze the original question, known context, product/version and official source snapshot.
3. Run an existing approved AI assistant with the permitted public/approved sources.
4. Keep the target forum's expert reply and reviewer reference out of the generation input.
5. Save the actual prompt, sources, raw answer, model identity/settings when available, timestamps, errors and observed tool access.
6. Independently assess each material claim and each requirement.

For an exploratory natural-discovery condition, record browsing exposure. For a docs-only condition, use a frozen approved source corpus. These are different conditions and must not be described as equivalent. A direct-evidence diagnostic after failure is a separate condition with an information advantage, not a hidden rerun.

## Experiment B — Does cross-case answer guidance improve a new answer?

**Purpose:** test the project's pattern/strategy contribution.

- Development cases: identify recurring, source-supported failure patterns and draft candidate response strategies.
- Held-out cases: reserve entire case families before strategy tuning; do not use them to choose or evolve strategies.
- Baseline: same existing model and same official evidence, with no specialized pattern-guided instruction.
- Guided: same model, question, evidence bytes and generation settings, with only the pre-specified matched response strategy added.
- Review: blind/randomized answer labels where feasible; score source support, technical correctness, version applicability, uncertainty calibration and useful next action; record critical errors separately.

The evolutionary experiment operates only on development receipts. The current implementation seeds four candidates and can select/crossover/mutate bounded strategy order and response emphasis. Real fitness is NOT RUN. No candidate is promoted until independently reviewed development results and a separate held-out evaluation support it.

## Experiment C — Does a proposed documentation revision help?

This is separate from Experiment B.

- Freeze the question, model, prompt, settings and all unrelated sources.
- Change only the exact revised passage/context.
- Run original and revised document conditions.
- Preserve both actual outputs and the precise source snapshots.
- Independently score claim support, requirement coverage, clarification and regressions.
- Use a held-out case family that was not used to draft the revision.

An answer improvement after a direct-evidence diagnostic does not prove that a document revision caused the improvement. A suspected gap is not a confirmed defect until the source review is complete.

## Experiment D — Does a visual explanation improve understanding?

This is Phase 2 and should use a concept supported by recurring case evidence.

- Compare the same source-grounded concept in text-only and text-plus-visual/video conditions.
- Ask a new-example transfer question, not merely whether the viewer liked the video.
- Record correct interpretation, useful next action, time and remaining confusion.
- Keep sample size, participants and method explicit.
- Until this is run, the five current MP4s are software demonstrations only; learning effect is NOT MEASURED.

## Current candidate case material

The supplementary archive audit inspected four public first posts at a pinned archive commit. It records three supporting observations and one counterexample for a possible installed-version-context pattern. The sample is purposive, team review is pending, and it is not a random or held-out set. This candidate should not be described as a validated global pattern.

The team website's r62 README reports a 57-row, 19-column public case export. The current offline reproduction imported three paraphrased manifest rows, not the full 57-row CSV; none was eligible for live evaluation. Obtain and verify the actual export before reporting 57 as an evaluated denominator.

## Minimum first real run

Use a small, agreed set of 5–8 independent case families:
- At least one documented limitation/out-of-scope example.
- At least one forum question with an expert reply held out for review.
- At least one question where version/context is incomplete.
- At least one question requiring a nuanced multi-step or code-based answer.

Do not select only easy cases. Retain all failures, exclusions, abstentions and regressions.