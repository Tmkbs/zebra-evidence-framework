# Zebra Evidence Framework — research workbench and classroom demo

## Start here: the integrated presentation

**[Open the live, source-grounded classroom demo](https://tmkbs.github.io/zebra-evidence-framework/classroom/)**

This is the main **no-PowerPoint** presentation. It starts with public developer questions and the team's published research references, then demonstrates case normalization, evidence scope, manual review, failure diagnosis, a proposed **research-note** revision, copy-only retest, developer preview, and exportable handoff.

Click **Presenter mode · 5 min** (top-right) to open nine concise English cue cards. The cue-card buttons navigate the real app; they do not invent model results or approve edits. Read [PRESENTER_NOTES.md](PRESENTER_NOTES.md) for the 5-minute script, 90-second backup, and instructor Q&A.

**Agent Continue is now connected via its actual JSON import format:** in **03 Review**, export a one-time public-case task for [叶真同's Chrome extension](https://github.com/1235357/agent-continue); after running it in ChatGPT, manually import the JSON result into Candidate A/B. This is a **file-based workflow, not a direct extension connection**. [Exact setup and limits](classroom/AGENT_CONTINUE_BRIDGE.md).

Useful files: [classroom guide](classroom/START_HERE.md) · [public case manifest](classroom/public_case_manifest.json) · [revision interchange contract](classroom/INTEGRATION_HANDOFF.md) · [regression tests](classroom/test_end_to_end.cjs).

**What this does not claim:** access to the separate private editing program, production document updates, real model comparison results for these public cases, measured search/optimization performance, verified scanner fixes, or generated video. The original `index.html` and optional local model adapter remain available as a **separate technical workbench**.

---


This repository contains a **self-contained, static evidence-review workbench** (`index.html`) and an **optional localhost-only adapter** (`lab_proxy.py`) for an OpenAI-compatible campus model server. It does **not** modify the team's separate private application repository or its Vercel deployment.

## Guided live demo (no PowerPoint)

Open `index.html`, then click **Start live tour** in the top right or **Guided demo** in the sidebar. The tour opens **six real interactive screens**, rather than presenting a slide deck:

1. **Overview:** why evidence needs to be separated from guesses.
2. **Case review:** inspect the DataWedge web-scanning case, source links, unknowns, and next check.
3. **Lab API:** explain that an approved live model trial is optional and requires a local proxy and campus VPN.
4. **Model comparison:** paste real A/B answers; compare with manual reviewer scores.
5. **Evaluation rubric:** explain the five 0–2 criteria and why a score is not a benchmark.
6. **Export & share:** export a portable JSON workspace or case CSV/Markdown.

The bottom guidance bar shows a short **Say** and **On screen** prompt; click **Next feature** while demonstrating the real interface. You can also jump straight to any feature from the Guided demo page. The site's review data stays in the current browser until exported.

**Opening line for a faculty demo:** “This is an evidence-first workflow. We take a real Zebra developer question, check what the official docs support, record what is still unknown, and evaluate any model answer before sharing it.”

## Start the demo

- **Offline / no server:** download the folder, open `index.html` in a browser. The case library, guided live feature tour, manual comparison, and local exports are available. No model is called.
- **Live adapter / Northwestern eduroam or VPN required:** set `ZEBRA_LAB_API_BASE` to your approved lab endpoint and optionally `ZEBRA_LAB_MODEL` to the model ID. Run `python lab_proxy.py` with Python 3. Open **http://127.0.0.1:8765** and select **Lab API**. Use **Check connection**, **Discover models**, then explicitly **Run selected case**. A captured answer is a **model output, not validated documentation**.

Example on macOS/Linux, from this folder:

```sh
export ZEBRA_LAB_API_BASE="http://LAB_HOST:PORT/v1"
export ZEBRA_LAB_MODEL="nvidia/Qwen3.8-Flash-Next-FP4-Local"
python3 lab_proxy.py
```

On Windows PowerShell:

```powershell
$env:ZEBRA_LAB_API_BASE = "http://LAB_HOST:PORT/v1"
$env:ZEBRA_LAB_MODEL = "nvidia/Qwen3.8-Flash-Next-FP4-Local"
py lab_proxy.py
```

Replace `LAB_HOST:PORT` with the currently authorized, working address. Harper's November 2026 examples referenced **both 8000 and 8080**, so do not assume the port. The server can be stopped with Ctrl+C. If a credential is later required, set `ZEBRA_LAB_API_KEY` in the local process environment; **never commit credentials**.

## Root workbench site (separate from the classroom presentation)

GitHub Pages is already enabled for this repository. The root workbench is at `https://tmkbs.github.io/zebra-evidence-framework/`, while the recommended, integrated classroom presentation is at `https://tmkbs.github.io/zebra-evidence-framework/classroom/`.

GitHub Pages hosts only the **offline/static features and guided tour**. Live lab requests still require the separately configured local bridge on an authorized Northwestern connection. No API secrets belong in the webpage or repository.

## Research safeguards

1. The initial case details are editorial summaries of public forum questions and official-guide reviews, **not complete frozen source-document bytes**. Verify the source, version, and quotations independently.
2. Running a model sends the **selected case summary and its links** to the configured lab endpoint. The operator must confirm the data is approved before sending; do not send private customer material, credentials, or confidential project documents.
3. The bridge uses `127.0.0.1` rather than exposing a public API. It performs a non-streaming `/v1/chat/completions` call. Results are recorded in the browser for review. A model response is *captured, not independently scored or device-tested*.
4. Offline cases and model evaluations are stored per-browser (local storage); use **Export** to preserve a portable JSON/CSV/Markdown copy before changing browsers or clearing data. A shared webpage alone does not sync individual reviews.
5. This is an unofficial student research prototype, not Zebra-approved guidance. No measured accuracy, device fix, or customer acceptance is implied.

## Files

- `index.html` — self-contained UI (searchable cases, evidence review, manual A/B rubric, six-step live tour, imports/exports, optional lab panel).
- `lab_proxy.py` — Python standard-library-only local HTTP bridge.
- `README.md` — setup and limitations.
- `test_lab_proxy.py` — unit tests for prompt freezing and API bridge boundaries.

## Intended project workflow

**Real question → versioned evidence → explicit model trial → human review → exportable case report**.

Existing evidence and historical references are maintained separately in the original public research archive:
https://github.com/1235357/zebra-public-site-archive

The original, separate application was described as `zebra-techdocs-practicum` (private). Access to that private repository and a real live API run were **not** established here. Do not report either as complete.

Run local checks with `python -m unittest -v test_lab_proxy.py`. No additional Python packages are required.
