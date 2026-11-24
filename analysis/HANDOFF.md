# 给叶真同：整合版接入需求（明天演示前）

整合版页面（零依赖、单文件、无脚本、无外链）：
`https://tmkbs.github.io/zebra-evidence-framework/analysis/zebra-pattern-analysis.html`
本页源文件在本仓库 `analysis/zebra-pattern-analysis.html`，可直接拷进你的站点目录。

---

## 0. 硬时间线

- **明天 11/24（周二）COMP_SCI_338 practicum 现场演示**，我们队第 3 个，题目 *Interactive Tech docs with conversation and Video*。
- 教授 Canvas 原话要求：**不要求端到端**，有 UI / 无 UI / 终端都行，但**必须完整走一遍流程并说明结果**；讲 **problem → approach → what the solution looks like → Q&A**；**7 分钟 + Q&A**。
- 11/30 还有一场，但明天这场更硬，优先级最高。

---

## 1. 我们这边已经实跑验证的东西（数字都是实测，不是估的）

| 项 | 状态 |
|---|---|
| `zebra-evidence-framework` 测试 | `node --test tests/` **34/34 pass** |
| `doc-gap-demo` 测试 | **71/71 pass**，`node --check` 全通过 |
| 发布前检查 `tools/preflight.mjs` | exit 0；WARN 从 12 条降到 4 条（剩 4 条消不掉，只能口头说明） |
| 语料快照 | `2026-11-24T02:33:45Z`，schema `zebra-corpus/v1`，3 案例 / 6 模式 / 7 证据 |
| 评测快照 | `2026-11-23T22:32:30Z`，计分模型运行 1 次，规则运行排除 0 次 |

**关键修复（overclaim 反洗白）**：以前只要词面上「多个案例提到」就算复现，会把**同一条证据被两个案例引用**也算成两次。现在拆成两轴：

- `recurring` = 词法事实（名义复现，不做折减）
- `defensible` = 去掉共用证据、剔除「自报安装版本未建立」的引用之后，**独立支撑仍达门槛**才算
- 标题和任何「方向」结论**只允许走 `defensible`**；`recurring` 只能待在明细列

当前结果：`recurring: 1 / defensible: 0 / collapsed: 1`，即**当前语料没有可辩护的全局方向**。这是结论，不是 bug，演示时要照这么讲。

---

## 2. 请你做的三件事（都标 P0）

### P0-1 把站点那 57 条公开论坛案例喂进 Track A（价值最高）

我们的 Track A 现在测不出东西：只有 3 条团队自编案例，**出题的人就是被测的人**。你站点上那 57 条来自开发者论坛的公开案例（`ZF-<16hex>`）是 Track A 唯一可行素材。

**定性必须准**：它们是**真实第三方上报**，**不是 SPR**（SPR = 涉及产品行为的客户支持工单）。可以支撑「人能否独立找到答案」，**不得称 SPR**。

数据契约（字段名别改）：

```json
{
  "id": "ZF-...",
  "title": "...",
  "question": "...",
  "inputOrigin": "public-developer-forum",
  "documentText": "官方原文整段",
  "evidence": [
    { "id": "...", "url": "https://techdocs.zebra.com/...", "version": "...",
      "section": "...", "text": "...", "kind": "official",
      "verifiedAt": "YYYY-MM-DD", "quote": "逐字原文（逐字时必填）",
      "verifiedVia": "...", "editorialNote": "转述说明（转述时必填）" }
  ]
}
```

硬规则：逐字必须带 `quote`，转述必须带 `editorialNote`，否则判「未声明转述」；`url` 必须是 **https** 才算官方来源。

### P0-2 挂上整合分析页

两种接法任选：

```html
<iframe src="/analysis/zebra-pattern-analysis.html"
        title="Zebra 文档模式整合分析"
        style="width:100%;height:1400px;border:0"
        loading="lazy"></iframe>
```

或者抽数据自己渲染，字段契约见上面 JSON。注意我们的整合页是**纯静态单文件**（无 `/api/*`、无本地 server 依赖）；我们仓库里 `doc-gap-demo/public/` 那版要跑本地服务，**不能直接给你用**，所以才做了这份。

### P0-3 给我 Vercel 项目的源码（**这条卡住所有后续改动**）

`https://zebra-techdocs-practicum.vercel.app/` 用的 `/document-reader/*`、`fixture.js`、`page.js`、`methods.html`、`project-shift.html`、`provenance.html` 这些文件，在我能拿到的所有地方**都不存在**：

- 本地全工作区（含隐藏文件）——没有
- `1235357/zebra-public-site-archive` ——没有
- `Tmkbs/zebra-evidence-framework` ——没有（那边只有 `index.html` 72,988B + `vercel.json`）
- 代码搜索 `reader-workspace oem-view-controls` ——0 结果

**没有 repo 我就没法提 PR，只能靠你手动贴。** 给我 repo 地址或 Vercel 项目连的 Git 源即可。

---

## 3. 网站改动要求（按优先级）

| 优先级 | 位置 | 问题 | 要求 |
|---|---|---|---|
| P1 | 案例表（移动端） | 六列表格，站内文案自己写着 “Case table; scroll horizontally if needed” | 窄屏按案例**卡片化**：标题 / 问题 / 证据 / 版本状态 / 两个视图入口；表头和横向滚动条不进首屏 |
| P1 | 每条 Evidence 文案 | 大量 “…remains unverified”“Installed versions remain unverified”，但没有折减规则 | 走我们的 `defensible` 口径：共用证据只算一次支撑，自报版本未建立要显式扣分，**不许把名义复现写成结论** |
| P1 | 顶部工具条（现在 4 个链接：CSV / XLSX / Methods / What changed Nov 20） | 没有整体方向视图的入口 | 加第 5 个链接 → 整合分析页 |
| P2 | `DW-SO-*` 三条（76280041 / 62862519 / 76959165） | 行内标 “Historical external reference (not in formal evaluation)” | **保留**，这个诚实标注是对的，别删 |
| P2 | 全站 | 57 条论坛案例容易被听成 SPR | 加一句澄清：真实第三方论坛上报，**非 SPR**；SPR 指涉及产品行为的客户支持工单 |

阅读器（`/document-reader/<slug>/`）的三视图 Revision marks / Clean proposal / Original article 是亮点，明天主讲就用它。

---

## 4. 明天 7 分钟脚本（建议分工）

| 时间 | 讲什么 | 用哪个页面 |
|---|---|---|
| 0:00–1:00 | **Problem**：文档缺口的上报里，「文档有没有写」和「设备上对不对」被混在一起谈，所以争论无法收敛 | 站点首页 57 条 |
| 1:00–2:30 | **Approach**：把判断拆成两轴 —— `recurring`（词法复现）vs `defensible`（去重后还能不能站住），共用证据折减 | 整合分析页 第 1 节 |
| 2:30–4:30 | **走一遍流程**：挑 `DW68-RESULT-CONSISTENCY`（正文要 `RECEIVE_RESULT`、示例用 `SEND_RESULT`），阅读器三视图来回切 | 阅读器 |
| 4:30–6:00 | **结果**：Track A 得分 1、覆盖 1、必经段落 2/2，但 `provisional`，阻塞项 `device_behaviour_untested`；Track B `review_ready`，2 条候选、0 编造、0 过度断言、**2 条待人工审核** | 整合分析页 第 4 节 |
| 6:00–7:00 | **诚实边界**：当前语料**没有可辩护的全局方向**（recurring 1 / defensible 0）；下一步是把 57 条论坛案例接进 Track A | 整合分析页 第 5、6 节 |

**千万别讲成「我们发现了 N 个共性文档问题」**——`defensible` 是 0，讲这句会被当场驳回。主动讲「我们试过把它升成方向，被自己的规则拦下了」反而是这场最硬的加分点。

---

## 5. 需要你补的三项

1. **今天下午 17:00 CST 那场 Faculty Touch Base 的要点**（*Interactive Tech docs with conversation and Video*，Fireflies recap，28:25）。Fireflies 公开页写着 “Meeting does not have the transcript to generate a summary”，邮件正文只有 recap 链接、没有纪要文本，我拿不到内容。**给我 3–5 条要点**，我按它调脚本和页面。我不会替你编。
2. **P0-3 的 repo 地址**。
3. 明天现场谁讲哪一段（我可以把我那两段的口播词写出来）。

---

## 6. 我不会做的事

- 不 push 你的站点仓库，不改 Zebra 公开代码（等你给 repo 后我先开分支再提 PR）
- 不编会议内容、不编证据、不把 `recurring` 当 `defensible` 讲
- 不为了让数字好看而造案例
