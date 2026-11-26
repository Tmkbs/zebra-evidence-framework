# Supplementary archive audit — version context

This supplement is separate from the existing three-case pattern snapshot. The complete 57-case export remains unavailable in this environment. On November 26, 2026, four archived developer first posts were inspected at a pinned public archive commit. No replies were used to infer original context. No claim of a random or held-out sample, live model run, semantic annotation by an independent human, or device verification is made.

| Report | Observed version context |
|---|---|
| TC26 EMDK/Xamarin | A 7.0 tutorial is linked, but installed SDK version is not stated. |
| TC52 MultiBarcode | The 6.2 API constant appears in code; the installed DataWedge release is not stated. |
| Android web integration | Target configurations are not finalized; this is a design question, not a failed device. |
| DataWedge Intent Output | The author explicitly reports DataWedge 6.2.23. This is a counterexample to asking every user for an installed version. |

The four report groups are distinct in the inspected archive. Three show a version-information gap and one supplies a reported installed release. This is a supplementary **recurring candidate**, not a validated global pattern and not evidence that the documentation has an error. Do not add these counts to the earlier three-case study, because overlap has not been audited. The case records provide short quotes, exact archive file paths and blob digests. Human/team review remains pending.

**Proposed response improvement:** distinguish the reported installed release from the documentation edition. Ask for missing installed or target versions only when needed for a technical answer. If a version is already provided, confirm the documentation edition without repeating the same question. When the product is not supported or target configurations are undecided, explain the scope and ask a relevant follow-up. The existing planner's single edition field does not yet implement this full distinction; this is a candidate for the next registry and context-schema change.

To recompute:
```
node analysis/reviewed-pattern-audit.cjs analysis/archived-version-context.json archived-pattern-report.json
node --test analysis/test_reviewed_pattern_audit.cjs
```
The reusable miner groups explicit source-inspected observations of any pattern ID, merges duplicate/shared forum URLs and archive blobs, separates positive, negative and conflicting groups, retains exclusions, and never marks a pattern validated. It automates counting and provenance, not semantic review or autonomous strategy learning. Future records require explicit original-source inspection and a supporting or counterexample annotation. All records here are based on public sources and should be reviewed before a client presentation.
