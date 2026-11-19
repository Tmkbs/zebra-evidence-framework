# Zebra TechDocs Evidence Capture — local MV3 candidate

1. Load this directory as an unpacked extension in Chrome's developer controls. This is not a Chrome Web Store release.
2. Open a supported, authorized public Zebra TechDocs article or public Zebra Developer forum topic. The popup reports the exact destination before collection. Check the public-content box and click **Capture this page**.
3. Inspect the text, then click **Save JSON locally**. The extension does not retain a capture after the popup closes. Chrome downloads, not the popup status, confirm that a file was written.
4. Import the downloaded JSON through the separately reviewed local framework intake. The extension itself never calls a model, changes the source, publishes, or connects to the framework.

## Scope, provenance and failure behavior

- Only activeTab and scripting permissions; no background worker, host permission, tabs permission, account mechanism, clipboard, browser history, provider credentials or network permissions. A URL is used for local scope validation only.
- Top frame only, isolated execution, same tab and document path verified before collection. Exact Zebra HTTPS hosts, strict public article-style paths, no queries, credentials or alternate authorities; hashes are not retained. Generic pages may contain account-dependent text despite a public-looking URL. Do not use this extension on private pages.
- TechDocs captures bounded, visible article text; forum capture requires a uniquely identifiable original post body and excludes replies and attachments. Visible restricted pages, password fields and obvious secret-like or opaque forum values fail closed. Heuristics are not exhaustive. Inspect text before exporting or using it. Do not distribute credentials, device/user identifiers or private material.
- Emits zebra-doc-capture/v1 with source_url, captured_at (UTC), title, source_kind, blocks and truncated. Blocks carry plain text, optional safe section anchor, and heading level where applicable. No page HTML, scripts, images, credential or navigable site mirror are saved. Limits: 120 blocks, 3,500 UTF-8 bytes per block, 49,152 UTF-8 bytes aggregate block text, 512 UTF-8 bytes title. The truncation flag describes known capture limits, not guaranteed site completeness.
- The existing November 12 extension spike was selection-based and used persistent storage. This separate candidate keeps structured document capture and local handoff while reducing permissions. It draws the exact-target and explicit user-action principles from the pinned read-only AgentContinue integration notes, without reusing native, administrative, remote or account operations.

## Verification

Run npm test for Node regression coverage of scope, permissions, isolated top-frame injection, same-target binding, text/size handling and denial paths. Selectors were checked against saved OEMinfo and public TC20 topic page layouts; no original forum content is copied into tests. Chrome installation, live capture/download, full framework integration and publication require separate evidence. This is not an autonomous maintenance agent.
