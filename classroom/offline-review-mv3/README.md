# Local MV3 evidence snapshot, 0.3.0
Unpack the extension ZIP and load its root as an unpacked Chrome extension in an authorized browser. On an eligible public Zebra page, open the popup, approve capture, inspect the exact title, text and discovered labels/URLs, and approve export. Save JSON (the same `zebra-doc-capture/v1` schema) or build and save the static offline ZIP. Extract the snapshot ZIP and open its `index.html`; `manifest.json` lists coverage.

The popup reads only the active tab on explicit request and uses volatile memory. It archives one selected page, including bounded same-origin link references without following them. It does not preserve original styles, images/files, interactive site code, or linked page bodies. No model, patches, publishing, persistent storage or new permissions. Browser installation and actual UI download are not verified.

Dependency-free checks from this directory: `node --test extension/tests/capture.test.js`, `node popup-smoke.mjs`, and `node smoke.mjs /tmp/zebra-fixture.zip && unzip -t /tmp/zebra-fixture.zip`. Tests use synthetic content and fake browser APIs.

## Separate local validation adapters

`reviewed-pair.cjs` forwards two independently reviewed local popup JSON captures to the existing classroom intake. It binds each canonical source URL to the inspected capture digest and preserves the upstream NOT_RUN/non-applicable status. Explicit approval is a local caller assertion; it does not authenticate the origin or grant redistribution. This adapter is not called by the popup.

`extension/collect.js` validates multiple explicitly supplied same-origin capture envelopes against an exact root; requires pre-export review and reports omitted links. It does not navigate or fetch anything. The popup exports reviewed envelopes and a separate collector imports and reviews them. These adapters are fixtures-verified building blocks, not the plugin-to-framework workflow.

Check: `node --test reviewed-pair.test.cjs collect.test.mjs`.

The local collector interface opens from the toolbar popup. First save each manually selected public page as a reviewed collection envelope, then select up to twelve envelopes, choose the exact root, review the complete material and coverage, and explicitly approve the offline ZIP. The collector neither fetches linked pages nor writes persistent extension storage. It is not an automatic crawl.

The bounded local Node intake is a separate process. Run `node intake-cli.cjs inspect <capture.json> <exact-public-url>` for each capture and review its displayed blocks and digest; then use `node intake-cli.cjs intake --approve-local <forum.json> <forum-url> <forum-sha256> <techdocs.json> <techdocs-url> <techdocs-sha256> [case-id]`. The result keeps approvals, inference and publication separate: local source review is not proof of authenticity and model status remains NOT_RUN. The extension has no automatic CLI connection or model result.

Run `node collector-smoke.mjs` and `node --test intake-cli.test.cjs` for fixture-only validation. No real Chrome installation or end-to-end analysis was run.
