# Local reviewed archive command

Run `node reviewed-archive-cli.mjs --reviewed-local <absolute-input-directory> <independent-grant-sha256> <new-output.zip>`. The directory must be canonical and dedicated; provide local `forum.json`, `techdocs.json`, `grant.json`, `receipt.json`, `baseline.html` and `working-copy.html`. The first two are the browser's reviewed collection envelopes or explicitly staged replay equivalents. The grant hash must be retained independently of the selected inputs, not computed from a file you are trying to validate. Other artifacts are separately reviewed inputs; this command does not create grants or produce a working copy. No new Chrome permission, runtime network access or source writes.

The command uses the existing guarded archive builder for exactly two explicit public roots with a 48 KB capture budget. It does not follow or include discovered links. It creates a new local ZIP without replacing any existing file, and writes a detached hash receipt to stdout. The receipt is not a signature or evidence of actual extension installation. No publish, model, device test or customer acceptance.

`node --test reviewed-archive-cli.test.mjs` runs the synthetic subprocess check.

The external grant binds the TechDocs capture and revision, not the accompanying forum file. The receipt marks the forum file as unverified companion material; this command does not prove it belongs to the case. Do not use this package as an authenticated evidence pairing or as an automated capture-to-framework run. The extension’s separate Verify local ZIP screen checks exact bytes only and requires a separately retained receipt SHA-256.
