# Release verification — 11 November 2026

- Python bridge syntax checked with `py_compile`: PASS.
- 8 `unittest` tests: PASS. Covers `/api/status`, `/api/models`, same-origin POST restriction, JSON validation, fixed prompting, mocked live response, HTML serving and offline state.
- Front-end inline JavaScript syntax checked with `node --check`: PASS.
- Chromium Playwright Lab API UI smoke test: PASS (mocked `/api`), including consent gate, connection checks, model discovery, a single mock run, copying to human review A, JSON export with prompt/settings/response and CSV run export.
- Lab UI desktop screenshot visually inspected (1366px viewport): PASS. Responsive view inherited from previous portable build; this release's new Lab tab is not independently verified on physical mobile devices.
- Editable five-slide presentation and PDF are inherited from the previous portable release; **they have not been updated to describe the optional adapter**. Use PRESENTER_NOTES.md for the latest lab-adapter explanation.

## Not claimed

- No real Northwestern lab API call; the machine here is not on campus/VPN.
- No model-accuracy comparison or independent reviewer assessment.
- No hardware, Android, Chrome-to-native, Xamarin, or customer acceptance tests.
- No fix to the private `zebra-techdocs-practicum` repository, Vercel deployment or external hosting.
- No entire-document retrieval, knowledge index, automated source verification or production security audit.

The bridge performs real HTTP requests **only on an authorized user's computer** when it is started with environment configuration and the explicit Run button is pressed. The mock tests verify code paths without implying deployed availability.

## 2026-11-12 guided website introduction

- Replaced the old slide-style “Present” screen with a six-step **Guided demo** screen that links to real application features.
- Added a persistent live tour bar, English **Say** and **On screen** prompts, navigation buttons, and inline explanations on each working view.
- JavaScript parsed successfully from the committed `index.html`. All `$('id')` references matched existing DOM IDs, with no duplicate IDs or invalid view references in a static cross-check.
- Extended `tests/test_lab_ui.py` with Playwright checks for start, next, exit, direct jump, and finish behavior; **this updated browser test has not yet been executed in this environment**.
- GitHub Pages publication and a live Northwestern lab inference run are **not yet verified**. No actual device-tested fixes or automatic model rankings are claimed.

