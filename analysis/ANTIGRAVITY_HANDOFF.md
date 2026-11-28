# Local Antigravity engineering handoff

Goal: one reusable prototype that demonstrates the client's ordered phases. Do not assume school-model connectivity is the milestone. The current enterprise-portable branch already has the model adapter and embedded widget; avoid duplicating them.

## First pass: read-only audit and reproduction
1. Inspect git status, branch and current changes. Do not overwrite uncommitted work. Read AGENTS.md, README.md, analysis/ENTERPRISE_HANDOFF.md, analysis/LOCAL_NARRATION.md, analysis/ARCHIVED_VERSION_CONTEXT_AUDIT.md and the existing answer/visual modules. Review PR #29 (paired answer evaluation) separately; do not silently merge it.
2. Run npm test, then npm run enterprise (default inference off), inspect http://127.0.0.1:3000/embedded-assistant.html and /answer-guidance.html in a real browser. Reproduce one existing source-backed interaction and one missing-version refusal. Report exact results; don't assert an actual enterprise model or private knowledge base is connected.
3. Inspect where the Phase 1 document evidence handoff reaches Phase 2. In particular inspect classroom/guidance-team-bridge.js, guidance-planner.js, answer-strategies.js, guidance-visual.js, guidance-storyboard.js, techdocs-widget.js, analysis/local-narration.cjs. The current narrated video covers four known source families. Check whether a new, reviewed document can enter the pipeline without manually coding a new page. Locate gaps rather than creating a second UI.

## Next implementation slice: evidence into comprehensible video
- Choose one public, version-pinned document or team review case outside the four existing narration fixtures; verify the source and choose a technical concept or decision to teach. Do not infer the device version from an unrelated link.
- Introduce the smallest reusable contract needed to carry verified document sections and source references into a bounded lesson/storyboard (concept, prerequisite, action, observable result or uncertainty, source evidence). If the source cannot support a scene, abstain. Reuse existing renderer and export receipts. Avoid generated images or narration that imply real device footage or verified runtime.
- Integrate into the existing assistant rather than a separate dashboard. Keep the content independent of the selected inference provider. No secrets, private SPRs, external model calls or changes to the teammate's private application.
- Add tests for a genuinely distinct supported scope, a version mismatch, missing evidence and a misleading scene. Run the actual local video render and verify audio, captions, decode and traceability. Record the input question, official URLs, version, clip digest, actual test commands and outcomes. Keep output artifacts local unless explicitly cleared.
- Provide a simple pilot comparison plan for the same text evidence with and without the clip: assess correct interpretation, useful next action, time and unresolved confusion. Don't fabricate participant results or claim comprehension improved without data.

Deliver one bounded, reviewed change set. Stop before merge or production release. Report failures separately from successes. The user can inspect the diff and approve the next slice.
