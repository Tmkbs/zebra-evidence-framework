# Structured offline mirror

Run:

    node mirror.mjs input.json new-output-directory

Open the resulting index.html. The importer never performs a network request and refuses to overwrite an existing directory.

## Local contract

Pass a JSON object with schema_version "zebra-mirror-input/v1", allowed_origins as exact HTTPS origins, roots as canonical HTTPS page URLs, and pages as a list. Each pages entry has capture (the extension's unmodified zebra-doc-capture/v1 JSON) and optional discovered_links, an array of { target_url, label }. target_url must be absolute and may include a section anchor. The extension capture currently produces article blocks only; links can be supplied by a separately authorized adapter or explicit human review. The engine also exports createMirrorCache(config), which buffers staged input in memory, builds the file mapping, and clears it; no implicit browser storage, host allowances or background work.

Default budgets: 20 staged pages, 2 link hops, 900,000 bytes of normalized records, and 20 outgoing links per page. Overrides cannot exceed 75 pages, 4 hops, 4,000,000 normalized bytes, and 60 links per page. Duplicate page records or cache overflow fail explicitly. Every page belongs to an explicit origin; edges stay on that page's own origin even when other origins are approved as separate roots. Reject credential-bearing, query-bearing, private-looking, IP/loopback and invalid paths rather than silently repairing them. The engine never follows a redirect or resolves DNS.

Output includes static index.html, site.css, an exact coverage manifest, and one inert HTML article per available reachable capture. Text and table cells are escaped. Linked anchors resolve only if the destination is included and the target anchor exists. The manifest records missing pages, omitted/foreign/invalid links, truncation and unreachable staged pages. It is a text mirror, not a complete original-site clone: no active elements, original styling, images/attachments, scripts, forms, remote requests or private data. Any imported content still needs an authorized public-data review before distribution. This does not install a browser extension, call the model, apply a revision or publish a PR.

Use npm test to replay graph/security/size fixtures and CLI write/readback.

### Rendering-specific validation

The local intake can retain a heading without a level and can retain repeated valid anchor strings as evidence. This renderer is stricter: headings must carry integer levels 1 through 6; nonheadings cannot carry level. Anchors are optional, but present anchors must be unique per capture and have 1–120 ASCII letters/digits/punctuation (dot, underscore, colon or hyphen), beginning with a letter or digit. Otherwise no output is generated; ambiguous links are not silently remapped. Text validation rejects lone UTF-16 surrogates, obvious credential markers, and opaque tokens in forum titles, blocks and link labels. A valid surrogate pair (for example an emoji) remains intact. These heuristics still do not replace authorized content review.
