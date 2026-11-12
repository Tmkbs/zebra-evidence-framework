# Zebra Evidence Framework — exportable review demo

This repository contains a **self-contained, static evidence-review workbench** (`index.html`) and an **optional localhost-only adapter** (`lab_proxy.py`) for an OpenAI-compatible campus model server. It does **not** modify the team's separate private application repository or its Vercel deployment.

## Start the demo

- **Offline / no server:** download the folder, open `index.html` in a browser. The case library, manual comparison, presentation mode, and local exports are available. No model is called.
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

## Research safeguards

1. The initial case details are editorial summaries of public forum questions and official-guide reviews, **not complete frozen source-document bytes**. Verify the source, version, and quotations independently.
2. Running a model sends the **selected case summary and its links** to the configured lab endpoint. The operator must confirm the data is approved before sending; do not send private customer material, credentials, or confidential project documents.
3. The bridge uses `127.0.0.1` rather than exposing a public API. It performs a non-streaming `/v1/chat/completions` call. Results are recorded in the browser for review. A model response is *captured, not independently scored or device-tested*.
4. Offline cases and model evaluations are stored per-browser (local storage); use **Export** to preserve a portable JSON/CSV/Markdown copy before changing browsers or clearing data. A shared webpage alone does not sync individual reviews.
5. This is an unofficial student research prototype, not Zebra-approved guidance. No measured accuracy, device fix, or customer acceptance is implied.

## Files

- `index.html` — self-contained UI (searchable cases, evidence review, manual A/B rubric, presentation, imports/exports, optional lab panel).
- `lab_proxy.py` — Python standard-library-only local HTTP bridge.
- `README.md` — setup and limitations.
- `test_lab_proxy.py` — unit tests for prompt freezing and API bridge boundaries.

## Intended project workflow

**Real question → versioned evidence → explicit model trial → human review → exportable case report**.

Existing evidence and historical references are maintained separately in the original public research archive:
https://github.com/1235357/zebra-public-site-archive

The original, separate application was described as `zebra-techdocs-practicum` (private). Access to that private repository and a real live API run were **not** established here. Do not report either as complete.

Run local checks with `python -m unittest -v test_lab_proxy.py`. No additional Python packages are required.
