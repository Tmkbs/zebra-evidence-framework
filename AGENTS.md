# Engineering rules — Zebra Interactive Tech Docs

## Product scope and ordering
- Phase 1: process real technical documentation and identify evidenced misunderstandings, gaps, or version/applicability conflicts. Preserve the team's document-reader ownership and existing case provenance.
- Phase 2: improve understandability using contextual conversation, diagrams and videos derived from verified document content. A generic presentation, narrated summary, or simulated device result is not a verified technical explanation.
- Prefer a reusable, embeddable assistant and provider-neutral interfaces. The Northwestern model is a development adapter, not a customer requirement. No new provider, external API, credential, production deployment or private-data ingest without explicit approval.
- Read existing modules before changing them. Reuse the actual planner, source gates, strategy registry, visual and storyboard renderer, and widget. Do not clone a dashboard or replace the architecture to solve a small task.

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
