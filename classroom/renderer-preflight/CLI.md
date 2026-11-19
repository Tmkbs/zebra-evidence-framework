# Local renderer preflight CLI

Use a trusted offline environment and a dedicated, canonical input directory holding three already-reviewed local files: `baseline.json`, `handoff.json`, and `original.html`. Point `ZEBRA_LOCAL_RENDERER_ADAPTER` only at a separately trusted, canonical absolute path to the pure application adapter's CommonJS module. Loading a module executes its code; never use an unknown module or the app's write/apply CLI.

`node renderer-preflight-cli.cjs --reviewed-local /absolute/reviewed-directory`

The CLI checks only the pinned local inputs; it does not authenticate the reviewer, and the trusted baseline must be independently verified. It rejects symlinks, oversized/non-regular files and unsupported filesystem protections. Run in a directory you control and do not change it while validating. Exit 0 means the pure local renderer accepted the bindings and computed a copy in memory, not that anyone applied it. Exit 1 emits a bounded rejection; malformed inputs never print paths or content. No output file is written, no network service is contacted by the CLI, no source/proposal body or receipt is emitted. Only synthetic test fixtures are supplied in the repository.
