# Engineering rules — Zebra Interactive Tech Docs

## Product scope and ordering
- Phase 1: process real technical documentation and identify evidenced misunderstandings, gaps, or version/applicability conflicts. Preserve the team's document-reader ownership and existing case provenance.
- Phase 2: improve understandability using contextual conversation, diagrams and videos derived from verified document content. A generic presentation, narrated summary, or simulated device result is not a verified technical explanation.
- Prefer a reusable, embeddable assistant and provider-neutral interfaces. The Northwestern model is a development adapter, not a customer requirement. No new provider, external API, credential, production deployment or private-data ingest without explicit approval.
- Read existing modules before changing them. Reuse the actual planner, source gates, strategy registry, visual and storyboard renderer, and widget. Do not clone a dashboard or replace the architecture to solve a small task.

## Final-delivery feature freeze
The primary deliverable is a defensible answerability assessment of existing technical documentation and sample code using existing AI tools. Preserve the distinction between (1) original documentation sufficiency, (2) the effect of a document revision, (3) the effect of an answer strategy, and (4) human understanding of a concept. None is a substitute for another.
- Start from real, provenance-checked first-post questions or authorized support samples. Keep original questions separate from forum replies, analyst recommendations, and reference answers. A baseline must not access the target thread's answer, directly or via unrestricted web search.
- Evaluate existing official documentation/sample-code evidence first. Categorize valid answers, unsupported capabilities, missing user context, retrieval/reasoning failures, actual documentation gaps and unresolved issues. An AI failure is not sufficient proof of a documentation defect. Preserve version boundaries.
- If testing a proposed document revision, freeze question, model, prompt, settings and all unrelated sources. Change only the documented passage/context, and report actual before/after outputs and independent assessment. The existing same-evidence strategy comparison answers a different research question.
- Secondary deliverable: use the already implemented source-linked visual/short-video pipeline to demonstrate a difficult concept with a comprehension check. Do not claim measured learning gains from encoding or self-check functionality.
- No new standalone apps, browser extensions, new agent architecture, new model providers or extra video templates for this release. Retain the existing embedded widget as an optional integration example, not a release gate. Customer deployment, forum auto-posting, private ingestion and support-volume reduction are out of scope unless separately approved and evidenced.
- Release priority: actual source-only trials and independently reviewed findings; exact original/revised passages; a concise reproducible demo and limitations. No synthetic case counts, mocked runs, or test passes may be substituted for real answerability results.

## Change control
- Work only inside the selected project folder on a dedicated branch/worktree. First inspect git status, branch and existing local changes. Never overwrite another contributor's work, reset a dirty tree, delete files broadly, force-push, merge main, or make external deployments.
- State the smallest proposed changes and the acceptance tests before edits. Prefer minimal reversible changes, no unnecessary framework or dependency, and no unexplained formatting churn.
- Do not weaken assertions, change fixtures to manufacture a pass, conceal failures, swallow errors or claim a feature works based on generated code alone.
- Do not read or copy private tickets, NDA documents, credentials, environment secrets or personal files into the agent prompt, test fixtures or public repo. Do not enable arbitrary network egress. Use approved public fixtures and mock providers for tests.

## Verification and evidence
- Before and after editing run relevant existing tests and record exact commands, exit status and failures. Run npm test when feasible. For UI changes use an actual Chromium or local browser walkthrough and capture interaction results, not just a screenshot. For video changes decode the resulting audio and video, inspect captions and verify every scene against its source.
- Source/version mismatch, missing provenance, unsupported visual content, model failure and missing prerequisites must have explicit abstention/error states. Exact quotation checks do not prove semantic correctness.
- Test at least one genuinely different question/doc scope and one unsupported or missing-version case; never label a development fixture as held-out. Do not count mocked calls as live model runs or media encoding as learning improvement.
- Present the actual diff, changed behavior, reproducer, remaining unknowns and test results. No automatic merge or publication. If blocked, report what is missing.
