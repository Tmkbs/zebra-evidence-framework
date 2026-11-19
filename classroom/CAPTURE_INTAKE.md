# Local browser capture → evidence-framework intake

Framework baseline: Tmkbs/zebra-evidence-framework main at
`db29d41418ae877f8ce9ab44cc0347350bc7e676` (read-back via GitHub API).
At that commit, the classroom application exports a
`research-documentation-handoff/v0.4` case record and accepts TXT/Markdown and
`documentation-revision/v1` drafts separately. This bridge emits a **capture-stage
v0.4-shaped record** with a new `capture_binding` envelope. It intentionally does
not fulfill the existing completed-review/approved-revision receiver contract:
`case.question`, exact paragraph, and proposal are not filled in. It must not be
sent to an apply adapter until a distinct review flow has created a valid proposal.

## Use

Capture the two visible public pages separately with the extension (Zebra forum and
Zebra TechDocs), review the contents for unintended data, then feed their local
JSON snapshots into the dependency-free CLI:

```sh
node classroom/capture-intake.cjs forum.json techdocs.json [project-case-id] > intake.json
node --test classroom/capture-intake.test.cjs
```

A source URL is an allowlist check, not proof that the page was captured faithfully
or that its content is safe to redistribute. Pair selection is manual and not proof
the documentation applies. Store output locally and handle it as unreviewed text;
never execute source snippets, render source text as HTML, upload it by default,
or treat a forum reply as author input. Top-frame interaction is carried out only
by the extension. The CLI does not invoke Chrome, connect to a model, fetch a URL,
change documentation, or publish. No credentials are processed. In generated
records, model, hardware, and acceptance are all `NOT_RUN` and release is
`NOT_AUTHORIZED`.

Input accepts two exact-schema records capped at 120 sections, 3,500 UTF-8 bytes
per block, 48 KiB in total per source, and 512 UTF-8 bytes for the title. The CLI
rejects unexpected fields, disallowed hosts or paths, query strings, invalid UTC
timestamps, and invalid input encoding. The output carries canonical-record
SHA-256s, run and case identifiers, ordered source blocks, truncation flags, and
whether a doc-version path was identified; date is capture time, not publication.
Capture hashes bind the validated representation, not the raw file bytes.

Progress: automated tests use synthetic structured snapshots. They exercise
actual local CLI execution and error behavior. Browser capture, automatic
classroom import, verified public redistribution, real model execution, and
publication have not been tested or performed by this bridge.
