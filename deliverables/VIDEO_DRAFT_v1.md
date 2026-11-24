# Draft video — COMP_SCI_338 / Zebra Forge

Due: **27 November 2026, 23:59 America/Chicago** (draft video). Final video: **4 December 2026**.
Target runtime for the draft: **3:00–3:45**. Screen recording + voice-over, no live audience.

> Every on-screen control named below exists in `classroom/answer-guidance.html` as committed.
> Do not record a segment that depends on a known-unfixed defect — see the blocker at the bottom.

## Before you press record

| Check | Why |
|---|---|
| Recorder at ≥ 1920×1080, browser zoom 100 %, no extensions | small type is unreadable at 100 % otherwise |
| Terminal cleared, no other tabs, no personal data in bookmarks bar | a poster frame becomes the thumbnail |
| Consent checkbox is visibly ticked before any network action | the flow is consent-gated; skipping it looks like we bypass our own gate |
| The two demo questions are pre-typed in a scratch pad | avoids typing typos and long pauses |
| Record the version-gated (no model) run **first** | it works with no network and no campus token |

## Storyboard

| # | Time | On screen | Voice-over (read roughly as written) |
|---|---|---|---|
| 1 | 0:00–0:18 | Title card: project title, team, course, client | "Zebra developers post troubleshooting questions in public forums. The hard part of answering one is not generating text — it's knowing which documentation edition applies, and whether you should be answering at all." |
| 2 | 0:18–0:40 | Pipeline diagram (F1), cursor traces the 7 stages | "Our prototype takes a public question, gates on the installed version, retrieves only version-pinned official documentation, freezes the excerpts, and only then asks a campus-hosted model. Every answer is a candidate for human review." |
| 3 | 0:40–1:05 | Type the **Enterprise Browser** upgrade question, leave version empty, click **Offline guidance · no model** | "Here is an Enterprise Browser upgrade failure with no installed version supplied. Note what it does *not* do: no model call. It asks for the one fact that decides the answer — the exact installed build." |
| 4 | 1:05–1:35 | Switch to the **DataWedge software scan trigger** question with a version and an official source URL, click **Fetch official excerpts only** | "Now a version-pinned DataWedge question. This step retrieves the official article and freezes the excerpt — the page and the excerpt are fingerprinted, so the evidence behind the answer cannot drift afterwards." |
| 5 | 1:35–2:15 | Expand **Read the frozen excerpt**; scroll **Source vocabulary check** | "The two result identifiers appear in this article. We surface both passages with their locations and explicitly decline to choose between them: whether they genuinely conflict is a judgement for the documentation author." |
| 6 | 2:15–2:55 | Click **Compare baseline / guided** | "Both arms get identical source bytes, temperature zero, the same output budget. The guided arm additionally receives only the strategies whose triggers actually matched, each labelled as a provisional candidate rather than a validated pattern." |
| 7 | 2:55–3:15 | Show **Model answer review**: `x/y claims have an exact excerpt match (not accuracy)`, expand rejected claims | "Every claim must quote the excerpt exactly. Claims that fail stay visible as rejected rather than being deleted. And this counter measures a mechanical quote match — not correctness, and definitely not device behaviour." |
| 8 | 3:15–3:35 | Open **Download result / handoff (JSON)**; end on the page footer disclaimer | "The whole run exports as a handoff record, so a reviewer can re-check our work. What we are *not* claiming: device validation, published documentation changes, or a measured reduction in support effort." |

## Do not say, and what to say instead

| Never say | Say instead |
|---|---|
| "we found N recurring documentation problems" | "one candidate pattern recurred; after discounting reused evidence it has one independent case against a threshold of two" |
| "the guided answers are better / 4× better" | "on four claims in two cases, exact-quote agreement was higher in the pilot run; the configuration changed mid-run, so we treat it as a pilot observation" |
| "the model answered correctly" | "the claim quotes the excerpt exactly; semantic accuracy still needs reviewer sign-off" |
| "the scan trigger documentation is wrong" | "the article's description and its example use different identifiers; we report both for author review" |
| "this works on devices" | "no device validation was performed" |

## Recording blockers

1. **Blocking:** the offline *Response safeguards* panel currently renders no strategy cards (see
   `analysis/DEFECT_offline_strategy_panel.md`). Segments 3 and 6 depend on that panel. Either land the
   patch and re-verify, or record segments 3/6 from the hosted/live path and say "offline guidance" only
   for the parts that actually work.
2. The `Compare baseline / guided` segment needs the campus endpoint reachable and a working local server.
   If it is not reachable at recording time, **cut segment 6–7** and show the exported JSON receipt from an
   earlier successful run instead — labelled with its date. Never re-enact a model answer in a text editor.
3. Keep the exported JSON for every recorded run in `deliverables/video-evidence/` so the video and the
   poster cite the same run.

## 中文待办

1. 录之前必须先确认第 1 条 blocker 有没有修；不修的话 3/6 两段拍出来是空的，等于把 bug 录进交作业的视频里。
2. 6–7 段依赖校园端点 + 本地服务；现场录不出来就**直接砍**，用之前成功那次的导出 JSON 顶上，并在画面上标日期。禁止手打一段"模型回答"补拍。
3. 谁出镜配音、字幕谁做（建议英文旁白 + 英文字幕，语速 140 wpm 左右，3:30 ≈ 500 词）。
4. 最终版 12/4 截止，草稿 11/27 先交能看住的版本即可，不必一次到位。
