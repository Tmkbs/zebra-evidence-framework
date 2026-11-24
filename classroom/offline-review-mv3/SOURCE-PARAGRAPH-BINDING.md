# Bind a source-only paragraph locator to a reviewed retained capture

This optional local read-only helper accepts a plain v1 capture, the exact source-only locator proof, and independently retained artifact digests plus the expected TechDocs URL. It uses native capture validation and normalizes ASCII whitespace to compare paragraph text. Within the uniquely anchored heading, the exact intended paragraph must be unique and at the stated zero-based section block position; the next heading at the same or higher level ends that section.

The proof and locator use exact allowlists. Unknown fields, including any claim of approval, are rejected even if a supplied digest matches. The caller must retain the expected proof, source and capture digests separately from the inputs; a digest check is not a signature. The result does not authenticate browser provenance, recover omitted text, authorize rendering, create a grant, or publish. Capture truncation and lack of a native paragraph anchor remain explicit.

Portable tests use synthetic fixtures: `node --test bind-source-paragraph.test.cjs`.
