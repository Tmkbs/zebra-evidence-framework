# Zebra Evidence Framework — research workbench and classroom demo

## Team reader integration — first real public case

[Team visual companion](classroom/visual-companion.html?reader=dw62-intent-receiver) reuses the existing storyboard engine to explain the r61 DataWedge Intent Output report. It links back to the team document reader and forwards the historical question context into Ask & Guide without assuming an applicable version or official evidence. See [integration instructions](analysis/TEAM_VISUAL_INTEGRATION.md). The live private reader has not been modified.

## Contextual learning media — aligned with the original project

See [Client-aligned visual scope](analysis/CLIENT_VISUAL_SCOPE.md). The same Ask & Guide now supports a DataWedge 15.0 Profiles concept lesson with an interactive data-path story, optional official diagram and officially listed introduction video, and an optional self-check. The selection is question/edition/evidence gated; remote media is never loaded automatically. This is a first implementation, not a confirmed customer approval, a new generated video, or measured learning improvement.

## Interactive Vision — evidence into action

**Visual walkthroughs:** the same Ask & Guide page now offers three source-linked SVG illustration forms: a scan-trigger diagnostic scene, a side-by-side result-code comparison, and a DataWedge 15.0 nested configuration scene. Select illustrated components, advance or seek through steps, or play the short timed walkthrough with captions. Playback and the illustrations are deterministic and work without Qwen. This is not a captured device video or a live hardware simulation. Each scene is derived from the validated visual map, and the JSON handoff includes a portable `zebra-visual-storyboard/v1` contract. No new model API or separate case database is required.

The existing [Ask & Guide](classroom/answer-guidance.html) now leads with an interactive, source-linked decision map. Explore the DataWedge 6.8 scan-trigger conditions, inspect the actual supporting passages, or compare the two result-code spellings in the prose and prototype. Scenario choices change the next diagnostic check; they are never treated as observed hardware state. Only explicit user confirmation transfers them into the next answer's reported context. The visual guide is independent of the model connection and does not replace the team's case/document reader. Unsupported topics and versions receive a generic evidence route, not an invented device visualization.

## New-question answer guidance (campus-only)

[Integration and evaluation handoff](analysis/ANSWER_GUIDANCE_HANDOFF.md). The [Ask & Guide page](classroom/answer-guidance.html) adds a new-question workflow rather than a second documentation editor: clarification, version-pinned public evidence, candidate safeguards, and optional same-evidence baseline/guided comparison. The public page now runs the shared offline planner and checked source cards without a model. For live official-source retrieval or campus inference, open `http://127.0.0.1:3000/answer-guidance.html` from the existing authorized campus runner. Use **Fetch official excerpts only** when the campus model is unavailable; import public team CSV questions without copying diagnoses or recommended edits. No external paid-model API calls or automatic publication. This does not change the historical [pattern snapshot](analysis/zebra-pattern-analysis.html).

## Run the real Northwestern model (local/VPN, no API key needed)

The working UI and AI review server now run together using the campus Qwen Chat Completions API. **This is a real inference path, not a simulated model response.** It must be started on a computer with Northwestern VPN or eduroam; the public GitHub Pages deployment cannot reach the campus-only HTTP service.

```bash
git clone https://github.com/Tmkbs/zebra-evidence-framework.git
cd zebra-evidence-framework
npm run campus:check
npm run campus
```

Requires Node 20+ and no external npm dependencies. The source is the current `main` branch.

- `npm run campus:check` sends **one harmless synthetic prompt** to the lab model and prints the actual response and token count (if supplied); failures are explicit.
- `npm run campus` starts the local site at **http://127.0.0.1:3000/**. For the new client handoff, open **http://127.0.0.1:3000/final-delivery.html**. It auto-loads the team's **public** published case CSV through the local server, with manual CSV import as a fallback. Select a case, verify the official TechDocs URL and the team's published revision URL (paste missing public links only when the CSV lacks them), then click **Run real AI review**. The local page obtains a same-origin session automatically; no API key or manual passcode is needed in this handoff page. The Qwen backend retrieves the paired public pages, compares evidence-supported sections and returns model results with source receipts. You can export both the actual AI review and the separate reviewer/client handoff JSON. Device testing and publication remain outside scope.
- For the original five-case classroom UI, the optional passcode flow still works. Its offline evidence check continues to operate without any model connection.
- If Harper changed the port from the November 10 example, use `AI_BASE_URL=http://c3dgx0.cs.northwestern.edu:8080/v1` (or the currently confirmed port) in your environment. The default is **8000**, matching Harper's latest Python example.
- `http://127.0.0.1:3000/api/campus-status` verifies the model-list route separately; a successful status request does not claim a completed inference. `npm test` runs only offline/mocked checks; `npm run campus:check` is the explicit real inference check.

**Safety:** The local listener binds only to `127.0.0.1`; no campus or provider credential is embedded in the public UI. Automatically loaded case data comes only from the published public project CSV; it does not retrieve the confidential five-year customer SPR workbook. Do not submit private tickets, customer notes, or confidential Zebra material to any model without approval. AI suggestions never count as device testing or customer acceptance, and the backend does not publish edits.


## Real AI comparison added (November 16)

The default [Zebra Evidence Review](https://tmkbs.github.io/zebra-evidence-framework/classroom/) now offers **Run AI document review** alongside the always-working offline evidence rules. The AI feature has a **real Vercel serverless backend** (`api/review.js`), which retrieves the pinned official DataWedge 13.0 or EHS 2.8 source page plus the teammate's revised article, sends relevant extracted sections to an approved OpenAI-compatible Chat Completions model, checks quoted snippets against the actual model input, and returns structured findings and an exportable report. Original/revised local text files are supported as a fallback for authorized use.

**Deployment status:** the code has been committed but no Vercel deployment or server secrets have been connected in this repository session. The GitHub Pages frontend **cannot invoke live AI by itself**. To activate the AI button, deploy the repo on Vercel, set `AI_API_KEY` and `AI_REVIEW_ACCESS_TOKEN` **server-side**, and open that Vercel URL or enter its HTTPS `/api/review` URL on GitHub Pages. **[Exact setup and safeguards](AI_REVIEW_SETUP.md)**. No model answer or device fix is claimed without an actual call.

---


## Quick Review: simplified default (November 16)

Open **[Zebra Evidence Review](https://tmkbs.github.io/zebra-evidence-framework/classroom/)**. The default site is now a one-page **Select case → Run evidence check → View results** workflow. Five grounded public cases are preloaded (two team proposals and three public research cases); no setup, manual reviewer gate, CSV import, or model key is required to run the default demonstration. A user can optionally import a local public CSV or edit a test claim under a collapsed section. The engine generates a source-linked review, flags missing versions, unverified technical assumptions and unsupported absolute language, and exports a Markdown research report.

**Method boundary:** this is *deterministic local rule-based review of publicly summarized source metadata*, not a live LLM inference, document crawl, complete source comparison, verified scanner fix, or customer acceptance. The source documents were not downloaded or independently checked during the automatic run. The legacy [advanced research demo](classroom/evidence-framework-sandbox.html) and the [course-only evolution lab](classroom/course.html) remain available separately; they are no longer the default client UI.

---


## Nov 16: review the team's latest work without duplicating its editor

The team's [public November 13 overview](https://github.com/1235357/zebra-public-site-archive/blob/main/README.md) reports **7 selected public cases**, **7 complete linked documentation articles**, and a **7-row / 19-column CSV/XLSX export**. These are *research and documentation proposals*, not independent device fixes or approvals. The separate application repository is not connected to this workbench.

The [classroom demo](https://tmkbs.github.io/zebra-evidence-framework/classroom/) now includes **Team review intake**, a focused evidence-gate board:

1. Open the team's own [public case CSV export](https://zebra-techdocs-practicum.vercel.app/document-reader/zebra-cases.csv), download it manually, and import it through the browser's local file input. The board **does not request, fetch, upload, or sync the CSV**. Two publicly linked proposal examples (EHS 2.8 and SET_CONFIG 13.0) are offered when no file is available; they are **not** a replica of the seven-row source.
2. Confirm column mapping, select the case and record whether its source, version applicability, and edit scope were actually reviewed. The readiness indicator never authorizes publication or claims a device fix, even if the reviewer self-records a pass.
3. Export a portable zebra-team-case-review/v1 JSON packet, or click **Continue in our Framework**. This creates a clearly identified *unverified research question* in the existing Question → Evidence → Review → Revision → Retest flow (without editing the teammate's production content).
4. Agent Continue task export is intentionally **disabled for arbitrary imported CSV cases**, because locally supplied materials are not automatically cleared for submission to an external chat.

The original three public-case fixtures remain available and unchanged. This addition is a local, manual integration point—not a direct connection to the private editor, production website, extension runtime, lab API, or an approved Zebra review.

---



## Two demo versions (November 16)

**Client version:** [Zebra evidence demo](https://tmkbs.github.io/zebra-evidence-framework/classroom/), with the optional academic search lab hidden.

**Course version:** [Same framework + Genetic Algorithm lab](https://tmkbs.github.io/zebra-evidence-framework/classroom/course.html). The additional view runs a real deterministic toy genetic search over twelve hypothetical verification actions, compares greedy selection and exhaustive optimum, and visualizes best-so-far fitness across generations. Its input costs and benefits are invented, not measured; the real case-review workflow remains the same.

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
