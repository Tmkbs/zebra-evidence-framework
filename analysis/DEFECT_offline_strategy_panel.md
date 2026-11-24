# Defect — the offline "Reusable answer strategies" panel is always empty

Found by reading committed source at `332b3880194cf3b4f0c7b7a0583659801ffd9b05` (`main`).

> **Method note — read this first.** This is *static* code analysis by reading the committed files.
> Nothing below was executed. The local execution layer on the machine where this was written could not
> start processes, so no test run and no browser session backs these claims. Treat the patch as a proposal
> to be run, not a verified fix.

## Summary

On `classroom/answer-guidance.html` ("Ask & Guide"), the **Response safeguards** section never renders any
strategy cards when the user clicks **"Offline guidance · no model"**. It always falls through to
"No specialized strategy matched.", even for a question that the registry would match.

This is demo-visible: that button is the safe, no-network, no-model path, and it is also the path the page
invokes itself on load.

## Evidence

1. `classroom/answer-strategies.js` — `select(plan, evidence)` is the real registry selector. It returns the
   objects with `label`, `application_status`, `match_reason`, `safe_next_action`, `research_status`. Correct.
2. `classroom/guidance-planner.js` — `prepare(input)` returns
   `{ ..., policies: policies.map(id => ({id, strategy, status})), ... }`.
   It produces a **`policies`** key and **never a `strategies` key**. It never imports `answer-strategies.js`.
3. `classroom/answer-guidance.html`, `drawPlan(p)` (≈ lines 186–201) reads **only** `p.strategies`:

   ```js
   for(const strategy of p.strategies||[]){ ... }
   if(!(p.strategies||[]).length)out.append(text("p","No specialized strategy matched. …","muted"));
   ```

4. Same file, the `action === "plan"` branch of `run(action)` (≈ line 248 onward) passes the raw planner
   output straight into that renderer:

   ```js
   const plan=ZebraGuidance.prepare(input),packet=ZebraIntake.offlineEvidence(plan);
   last={schema:"zebra-offline-handoff/v1",mode:packet.mode,plan,offline_evidence:packet, …};
   drawPlan(plan);drawCards(packet);drawVision(last);
   ```

   `plan` has `policies`, not `strategies`, so `p.strategies` is `undefined` → the empty-state line always
   prints.

5. The page's script block loads `guidance-planner.js`, `guidance-intake.js`, `guidance-visual.js`,
   `guidance-storyboard.js`, `guidance-team-bridge.js`. **`answer-strategies.js` is not loaded on this page**,
   so the page cannot compute `strategies` locally even if it wanted to.

The live path is not affected in the same way: `analysis/answer-guidance.cjs` builds
`plan = {...plan, strategies: AnswerStrategies.select(plan, sources)}` server-side before returning, so
`result.plan.strategies` does exist for `evidence` / `ask` / `compare`. Only the offline path is broken.

## Impact

- The newest feature (the shared strategy registry from `332b388`) is invisible on the page an audience is
  most likely to click first, because it is the one button that needs no token and no network.
- `last`, the downloaded handoff JSON for an offline run, also carries `plan.policies` and no `strategies`,
  so an offline handoff record does not show which strategies the registry would have selected.
- The strategy catalogue is shown on the separate pattern-analysis page (`ZebraAnswerStrategies.catalog()`),
  which makes the gap easy to miss in review: the catalogue looks populated, the panel does not.

## Proposed patch — two edits

Both in `classroom/answer-guidance.html`. Deliberately not applied here: the file is ~38 KB of dense
single-line JS and a safe partial edit needs real file access plus a test run.

**1. Load the registry on this page.** Add it to the existing script block, alongside the other modules:

```html
<script src="answer-strategies.js"></script>
```

**2. Compute strategies in the offline branch** and hand them to the renderer:

```js
if(action==="plan"){
  const plan=ZebraGuidance.prepare(input),packet=ZebraIntake.offlineEvidence(plan);
  const strategies=window.ZebraAnswerStrategies
    ?ZebraAnswerStrategies.select(plan,packet.cards||[])
    :[];
  const shown={...plan,strategies};
  last={schema:"zebra-offline-handoff/v1",mode:packet.mode,plan:shown,offline_evidence:packet,
        model_attempts:0,model_runs_completed:0,device_tested:false,created_at:new Date().toISOString()};
  drawPlan(shown);drawCards(packet);drawVision(last);
  …
}
```

Notes for whoever applies this:

- Pass `packet.cards` as the evidence argument. `offlineEvidence()` already returns version-matched cached
  source cards, so the source-backed strategies (`missing_prerequisite`, `example_body_conflict`,
  `naming_inconsistency`) can fire offline — but only through `sourceMatchesPlan()`, which still requires
  `https://techdocs.zebra.com/<product>/<edition>/…`. Keep that guard; the existing untrusted-URL test
  depends on it.
- The page's module-presence guard at the bottom of the file checks
  `window.ZebraGuidance&&window.ZebraIntake&&window.ZebraVisual&&window.ZebraStoryboard&&window.ZebraTeamVisual`.
  Add `window.ZebraAnswerStrategies` there only if you want a missing file to disable the page; the guard
  above keeps it optional instead.
- The empty-state copy stays correct: a genuinely unmatched question should still say "No specialized
  strategy matched."

## Second finding — two selectors that disagree, and a test gap

`prepare()` still calls `policySelection(question, context)` in `classroom/guidance-planner.js`, and that
function selects `example_body_conflict` and `naming_inconsistency` when **the user's own question and
context text** mention both identifiers:

```js
if(/\b(RECEIVE_RESULT)\b/i.test(s)&&/\b(SEND_RESULT)\b/i.test(s))
  ids.push("example_body_conflict","naming_inconsistency");
```

`analysis/REUSABLE_ANSWER_STRATEGIES.md` states the opposite as a hard gate:

> A prose/example discrepancy requires both RECEIVE_RESULT and SEND_RESULT in the **same** matched source.
> Mentioning both names in a user's question is not evidence of a documentation conflict.

The registry honours that gate; `policySelection` does not. So the same plan object can carry a
source-discrepancy flag that the project's own documentation forbids.

Why no test catches it: `analysis/test_answer_strategies.cjs` has exactly the right case, but it asserts on
the registry path only —

```js
const p=plan("I heard RECEIVE_RESULT and SEND_RESULT. Which should I use?","datawedge","6.8");
assert.ok(!S.select(p,[]).some(x=>x.id==="example_body_conflict"));
```

`P.prepare()` runs `policySelection` on that same input and populates `plan.policies` with
`example_body_conflict`. Nothing asserts on `plan.policies`, so the contradiction is untested.

Two ways to close it — pick one, don't leave both selectors live:

- **Preferred:** make `policySelection` the cheap pre-retrieval hint only (drop `example_body_conflict` and
  `naming_inconsistency` from it entirely), and rename `plan.policies` → `plan.context_requests` so nobody
  reads it as a source-backed finding. Update `classroom/test_end_to_end.cjs` accordingly — it is the
  dependency-free simulated-browser regression and is the test most likely to assert on the old field name.
- Or: have `prepare()` delegate to `AnswerStrategies.select()` so there is genuinely one selector, which is
  what `REUSABLE_ANSWER_STRATEGIES.md` already claims ("The same selector is used by …").

## Verification to run before this is called fixed

```
npm test
node --test analysis/test_answer_strategies.cjs
node classroom/test_end_to_end.cjs
```

Then, by hand, on `classroom/answer-guidance.html` served from a full checkout:

1. Enterprise Browser upgrade question, version left empty, click **Offline guidance · no model** →
   expect two or three cards including *Confirm the applicable version* with `ask for version`, and
   `model_attempts: 0` in the downloaded JSON.
2. DataWedge software scan trigger question, version `6.8` → expect *Check a documented prerequisite* with
   `source backed`.
3. Question that only *mentions* both result identifiers, no matched source → expect **no**
   *Show both sides of a source discrepancy* card.
4. Download the handoff JSON for each run and keep it; the poster and video must cite the same run.

## Not verified

- Whether `classroom/test_end_to_end.cjs` asserts on `plan.policies` (I could not read that 20 KB file in
  this pass). Check it before renaming the field.
- Whether `campus_review_server.cjs` exposes `plan.policies` to any other consumer.
- Any claim about the reported `1/4` vs `4/4` paired run. The committed `infer()` in
  `analysis/answer-guidance.cjs` sends only `{model, messages, temperature: 0, max_tokens: 1800}` — there is
  **no thinking/reasoning toggle in the committed code**, so a reported "thinking mode disabled on both
  arms" is not reproducible from this commit and must be pinned down before it is quoted anywhere.
