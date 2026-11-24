# Trusted local typed-operation gate

`authorize_local_operation` accepts untrusted operation bytes, a separate operator-maintained trust record, that record's SHA-256 obtained independently of the operation, and the original baseline bytes. Do not learn the expected trust hash from capture data, downloads, sibling files from the same producer, or a computed hash of an unreviewed trust file. Verification requires an already trusted caller. The SHA-256 is an integrity check, not a signature or an authenticated reviewer.

The trust record binds case, capture run, edition, baseline bytes, selected paragraph digest, the canonical typed operation, the exact permitted same-edition TechDocs link (if any), and the local-copy-only scope. The gate has no file, network, rendering or publishing capability. Pass its returned arguments only to a locally trusted renderer that separately checks unique paragraph placement against the exact baseline. This does not modify v0.4, create approvals, authorize application to the source, authenticate a browser capture, or prove a model run. The accompanying tests use synthetic content only.

Run `python -m unittest -v` from this directory.
