# Zebra: Qwen / OpenAI relay

This is an **opt-in proposal handoff**, not an autonomous agent that writes and merges code. It is designed to leave a reviewable trail and to avoid using customer SPR data in a public GitHub repository.

## What exists

- `relay/public_task.json`: scope and acceptance checks using *public* project references only.
- `relay/agent_relay.py`: invokes a campus Qwen-compatible endpoint for a proposal, then invokes an OpenAI **API model** for a critical review, and saves both results to an auditable JSON handoff.
- `.github/workflows/qwen-openai-relay.yml`: scheduled at 17 and 47 minutes after each hour. GitHub Actions schedule timing is **best effort**, not exact. Also supports manual dispatch.
- `relay/tests/`: offline validation tests requiring no API credentials.

**ChatGPT conversations are not invoked by this workflow.** The reviewer is an OpenAI API model selected in `RELAY_OPENAI_MODEL`; ChatGPT does not silently continue coding in the background.

## Status and prerequisites (not yet operational)

The workflow is intentionally disabled until the following have been provisioned:

1. A **trusted, dedicated self-hosted GitHub Actions runner** with both labels `self-hosted` and `zebra-campus`, running on a machine that can reach Northwestern's approved campus Qwen endpoint via eduroam or VPN. A GitHub-hosted runner cannot assume access to that private network.
2. GitHub repository Actions variable `ZEBRA_RELAY_ENABLED=true`; variable `RELAY_OPENAI_MODEL` set to a real, authorized OpenAI model API identifier; optionally `RELAY_QWEN_BASE` (default `http://c3dgx0.cs.northwestern.edu:8080/v1`) and `RELAY_QWEN_MODEL`.
3. Repository Actions secret `OPENAI_API_KEY` with appropriate use/budget limits, and optional `RELAY_QWEN_KEY` if required by the campus deployment. Never place credentials in commits.
4. Merge this PR into the default branch **after review**. Scheduled workflows only run from the default branch.
5. Allow GitHub Actions to write repository contents *only as needed*, then restrict and review permissions. Relay results are stored on a separate `agent-relay-state` branch, not `main`.

## Safety

- No customer spreadsheet, root-cause records, transcripts, private names, or sensitive attachments are committed.
- A proposal or review is **not code**, a passed test, a model benchmark, or client approval. No code-writing automation is included.
- The single public task is user-maintained and bounded; incoming model messages are labeled untrusted.
- Output is truncated and limited to public/research descriptions. Do not feed private client material into the task field.
- The OpenAI API is a **different service and billing surface** from ChatGPT. Verify data handling and institutional approvals before enabling.
- Run unit tests locally: `python3 -m unittest discover -s relay/tests -v`, then `python3 relay/agent_relay.py --validate-only`.
- Before any unattended deployment, have a maintainer review permissions, runner security, billing safeguards, GitHub Actions budget, and institutional data-sharing requirements.

## Why this is a useful start

A reviewer can examine the Qwen proposal and independent OpenAI critique across rounds before deciding what patch should be made. Actual engineering edits still require a separate PR with tests and maintainers' approval. This avoids two models reinforcing each other's guesses in an uncontrolled loop.
