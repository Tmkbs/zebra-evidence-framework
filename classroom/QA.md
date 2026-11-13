# Classroom release verification — 13 November 2026

## What was executed

A JavaScript DOM-interaction harness loaded the committed standalone HTML and simulated real user callbacks. **26 checks passed** for the current code version. The same core paths can be rerun through the repository's zero-dependency Node script:

```bash
node classroom/test_end_to_end.cjs
```

The fixture is `classroom/sample_document.md`.

### Verified in the DOM harness

- Ten interface sections initialize and can share state.
- Built-in fictional source starts unapproved and has exactly one matching paragraph.
- A patch cannot be applied before a specific review gate is completed.
- Reviewer choice, clarity-gap hypothesis and explicit acknowledgment permit a **local-only** test.
- The original document snapshot remains unchanged; only the resulting in-memory copy gets the replacement.
- Held-out model and device validations remain **NOT RUN**, even after the copy succeeds.
- Approved local Markdown can be imported without a network call and retains its entire original text.
- Selecting a specific paragraph updates the revision target without modifying other sections.
- Local review gate must be reapproved after changing the proposed paragraph.
- Complete imported Markdown content is preserved apart from the selected replacement, and an appropriately suffixed candidate filename is prepared.
- `documentation-revision/v1` is exported with matching-case and source-count metadata.
- Developer guide preview displays the revision target rather than an entire imported file.
- Changing an already approved proposal invalidates prior approval and the prior patch.
- Importing revision JSON with a mismatched baseline blocks application.
- Unsupported file extensions and oversized files are rejected without replacing the source currently loaded.
- Duplicate matching paragraphs are blocked to prevent ambiguous replacement.
- Optional search experiment still enumerates 32 toy subsets.
- Case report generation and `NOT AUTHORIZED` release semantics remain intact.

## Safety and data handling

Static inspection found no third-party script, browser network call, real API endpoint or proprietary source text in the **classroom HTML**. It processes local TXT/Markdown files in browser memory. Imported documents may be sensitive; an explicit warning is shown. JSON exports may include the full original and modified text.

## Limitations

These are **simulated-DOM integration tests**, not a complete Chromium/Edge or mobile browser acceptance pass. The persisted Node script has not been executed in the user's own environment here. No private teammate editor was accessible, and no actual data from it is represented as executed. No official-source proof, live model benchmark, deployed video, device verification or customer acceptance is established.

The result is a functioning self-contained demo and a defined input/output boundary for later connection to a separately authorized document-editing service—not a claim of a production or client-approved deployment.
