# Local MV3 evidence snapshot, 0.3.0
Unpack the extension ZIP and load its root as an unpacked Chrome extension in an authorized browser. On an eligible public Zebra page, open the popup, approve capture, inspect the exact title, text and discovered labels/URLs, and approve export. Save JSON (the same `zebra-doc-capture/v1` schema) or build and save the static offline ZIP. Extract the snapshot ZIP and open its `index.html`; `manifest.json` lists coverage.

The popup reads only the active tab on explicit request and uses volatile memory. It archives one selected page, including bounded same-origin link references without following them. It does not preserve original styles, images/files, interactive site code, or linked page bodies. No model, patches, publishing, persistent storage or new permissions. Browser installation and actual UI download are not verified.

Dependency-free checks from this directory: `node --test extension/tests/capture.test.js`, `node popup-smoke.mjs`, and `node smoke.mjs /tmp/zebra-fixture.zip && unzip -t /tmp/zebra-fixture.zip`. Tests use synthetic content and fake browser APIs.
