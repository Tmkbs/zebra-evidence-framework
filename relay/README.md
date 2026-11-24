# Zebra: campus Qwen and GitHub reviewer handoff

## Model boundary

**Northwestern's campus Qwen endpoint is the only model API called by this relay.** No separately billed model API, external inference credentials, or public-cloud inference fallback is required or permitted. The relay rejects non-campus endpoints and redirects.

The independent reviewer can be ChatGPT using the existing subscription and its GitHub connection, or a teammate. The reviewer reads the public handoff and writes the next round of feedback in `relay/reviewer_feedback.md`. This is not a programmatic invocation of ChatGPT, and a reviewer is not automatically available on a fixed cadence.

## Run one proposal on an authorized campus-connected machine

From a separate checkout of this branch, with Python 3.10+ and campus network access:

    python -m unittest discover -s relay/tests -v
    python relay/agent_relay.py --validate-only
    python relay/agent_relay.py --state relay_state.json --output relay_state.json

The script sends only the bounded public task, prior proposal, and supplied public feedback to Qwen. It saves a JSON proposal locally. It does not fetch the linked URLs, modify project files, push, or merge. Review the contents before committing a public handoff. Keep private SPR records and credentials outside the repository.

Optional environment variables: RELAY_QWEN_BASE (defaults to the campus endpoint on port 8080), RELAY_QWEN_MODEL, RELAY_QWEN_KEY (only if the campus service explicitly requires it; actual credentials require HTTPS). Confirm the current endpoint and institutional permission before use.

## Thirty-minute cadence

For recurring Qwen proposals, an authorized operator may configure Windows Task Scheduler, or cron on a dedicated campus-connected machine, to run the command above every 30 minutes. Use a separate checkout, a single-instance task, and a local output file; stop the task if the machine disconnects or the lab withdraws access. This repository intentionally does not install or enable a background service or expose the campus machine as a self-hosted runner for a public repository.

ChatGPT or a teammate can review approved public outputs in GitHub, update the feedback file, and submit tested code changes as separate pull requests. A local scheduler can run Qwen, but does not wake ChatGPT or ensure it is reviewing at the same cadence. Do not claim this is an autonomous two-model loop until actual scheduling and handoff are independently demonstrated.

## Validation

- CI runs offline tests, never model inference.
- Every model proposal is marked awaiting independent review.
- Preserve the evidence and verification boundaries in the existing project.
- Do not publish or send private customer files through this relay.
- Actual code changes require tests and a separate reviewed PR; no auto-merge.
