# Draft poster — COMP_SCI_338 / Zebra Forge practicum

Due: **27 November 2026, 23:59 America/Chicago** (draft poster). Final poster: **2 December 2026**.
Confirmed physical spec from the course announcement: **24 × 36 in, portrait**.

> This file is the **content and layout contract**. Every number below is traceable to a committed
> artefact in this repository or the published public case export. Anything we cannot trace is marked
> `TBD`. Do not replace a `TBD` with an invented number — leave the slot empty or delete the block.

## Canvas settings

| Setting | Value |
|---|---|
| Size | 24 in × 36 in portrait (3600 × 5400 px at 150 dpi; 7200 × 10800 px at 300 dpi) |
| Grid | 3 columns, 0.5 in gutter, 0.75 in safe margin |
| Type floor | body ≥ 28 pt, section headers ≥ 48 pt, title 180–220 pt (readable at ~2 m) |
| Export | PDF (vector text) + PNG for the video |
| Colour | colour-blind safe; never encode a status in colour alone — always pair with a word |

## Header band

- **Title:** `Evidence-Gated Answers for Zebra Developer Documentation`
- **Subtitle:** `A student prototype that answers a public developer question from version-pinned official documentation — and refuses to answer when it cannot`
- Team: `叶真同 (confirm latinised name as registered)`, `Minyang Zhang`, `TBD (third member name as registered)`
- Course line: `COMP_SCI_338 · Winter 2026 · Northwestern University · Client: Zebra Technologies documentation team — TBD confirm exact credit line`

## Column 1 — Problem and approach

**Problem (keep to 5 lines)**

Zebra developers post troubleshooting questions on public forums. A useful answer depends on which
product **and which documentation edition** applies, and on whether a report describes a documentation
gap, a configuration gap, or real device behaviour. Support effort is spent re-deriving that evidence.

**Pipeline diagram (the poster's central figure — see figure list)**

1. Public question intake — public forum text only; a question never inherits a root-cause label.
2. **Edition gate** — if the installed version is not supplied, the run stops and emits a clarification question. No model is called.
3. Official source retrieval — HTTPS allowlist to `techdocs.zebra.com`, exact product + edition path match, redirects revalidated against the same rule.
4. Excerpt freeze — bounded excerpt with SHA-256 fingerprints of the page and of the excerpt.
5. Paired campus inference — baseline vs guided, same source bytes, `temperature 0`, same output budget, campus endpoint only.
6. Mechanical check — each claim must be an exact substring of the cited excerpt; failures are kept, not deleted.
7. Human review — a quote match is a mechanical check, not accuracy, entailment, or device validation.

## Column 2 — Guardrails (this is the part faculty will ask about)

State these as design properties, each traceable to code in this repository:

- **Abstention before inference.** A version-sensitive question with no installed version produces `ask_for_version` and zero model attempts.
- **No source-specific claim without a matched source.** A prose/example discrepancy requires both identifiers inside the **same** product- and edition-matched official article. A user merely naming both in their question is not evidence of a documentation defect.
- **Campus-only inference.** The inference route accepts one Northwestern host and one API path; an off-host or credentialed URL is rejected before any request.
- **Quarantined failures.** Claims that fail the exact-quote check are retained as `rejected_claims` rather than removed.
- **No silent normalisation.** Exact API spellings are preserved; two similarly spelled identifiers are not merged.
- **Nothing published.** `device_tested: false`, `publication_approved: false`, `quality_improvement_measured: false` are emitted by the tool itself.

## Column 3 — Evidence base and results

**Evidence base (all traceable)**

| Item | Value |
|---|---|
| Reviewed research cases | **3** (`DW68-RESULT-CONSISTENCY`, `DW66-VERSION-BOUNDARY`, `DW-FORUM-00476`) |
| Evidence items | **7** — 6 official + 1 public forum report |
| Verbatim-quoted evidence | **2** of 7 (5 are paraphrases) |
| Version not established | **1** (the forum report's installed version) |
| Public case rows available | **57** |
| Rows exercised end to end | **2** |

**Results we can defend**

- **6 candidate answer strategies**, each carrying trigger, required context, evidence gate, safe next
  action, abstention boundary and case provenance. **None is marked validated.**
- **1 recurring candidate pattern** (confirm the applicable version): 2 nominal case mentions collapse to
  **1 independent supporting case** after discounting reused evidence and the version-unestablished forum
  report, against a **threshold of 2** → **0 defensible global patterns** in the reviewed set.
- **Cross-product reuse demonstrated, not validated:** the same version-boundary strategy is selected for a
  DataWedge update failure and an Enterprise Browser upgrade failure. The rule transfers; that is not
  evidence of a global pattern.
- **One documentation-consistency candidate for the client:** in the software scan trigger article the
  descriptive text and the code example use different result identifiers — reported as a discrepancy
  **pending author review**, with both passages shown and neither silently chosen.
- **One case where the correct output was a question, not a fix:** a forum failure report whose information
  gap is not a documentation defect.

**Pilot observation — label it exactly this way**

> Paired campus run on 2 cases / 4 claims: exact-quote agreement 1/4 baseline vs 4/4 guided.
> This is a **pilot observation under a confounded configuration change, not a measured quality
> improvement.** n is too small and the run configuration changed mid-experiment.

If space is short, cut this block before you cut anything in "Results we can defend".

## Limitations (mandatory — do not compress away)

No device validation. No held-out evaluation set. Single reviewer, no inter-rater agreement.
No measured reduction in support effort or review time. Nothing published to Zebra documentation.
The reviewed research set is 3 cases; the 57-row public export is not yet evaluated.

## Next steps

Held-out evaluation on the remaining public rows; author review of the consistency candidate;
device verification with an authorised build; integration with the client-hosted document reader.

## Figures to produce

| # | Figure | Status |
|---|---|---|
| F1 | Pipeline diagram, 7 stages, with the abstention branch drawn explicitly | TBD — needs design |
| F2 | Screenshot: version-gated run showing `model_attempts: 0` + clarification question | TBD — needs a live run |
| F3 | Screenshot: two reader views of the consistency candidate (prose vs example), both quoted | TBD — needs client repo |
| F4 | Evidence provenance table: official vs forum, verbatim vs paraphrase, reused | TBD |
| F5 | Strategy registry card layout, showing the `not validated` status | TBD |
| F6 | QR to the published analysis page | ready — `https://tmkbs.github.io/zebra-evidence-framework/analysis/zebra-pattern-analysis.html` |

## 中文待办（需要人确认，不要由我一个人填）

1. **第三位成员署名**与课程/导师/客户鸣谢行的准确写法 —— 我没有可靠来源，先留 `TBD`，不要让我编。
2. **F2 需要一次真机运行截图**：本机执行层目前起不来（进程创建失败），跑不了。要么在能跑 shell 的机器上跑一遍出图，要么这张先撤掉 —— 海报不要放假截图。
3. **F3 涉及叶真同那侧的 document reader**，他的 Vercel 项目源码仓库我们仍然没有，需要向他索要；否则只能用我们自己的页面出图。
4. **1/4 vs 4/4 是否上墙**：我的建议是**不进主视觉**，只在角落以小字作为 pilot observation。样本量 4 条引文、2 个案例，且中途改过运行配置，放主视觉会被当场问穿。
5. 执笔分工建议：叶真同出文档侧截图与来源，另一人出数据块，你出文字与整体版式。
