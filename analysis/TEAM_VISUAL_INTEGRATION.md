# Team visual companion — r61 public case pilot

## One entry, complementary roles

The team's r62 public release records 57 English review cases (November 20 UTC). Its public archive explicitly states that application development is in the private zebra-techdocs-practicum repository. This bridge does not claim access to that private source or deployment. It does not duplicate the case table, create a ZF identifier, or count an additional case.

Pilot: [DataWedge 6.2 Intent Output, r61](https://zebra-techdocs-practicum.vercel.app/document-reader/dw62-intent-receiver/index.html#receiving-app-intent-filter).

- Reader: team-owned original article / marked revision / clean proposal.
- Visual companion: source-linked explanation of the difference between a successful ADB test and the reported missing DataWedge scan broadcast.
- Ask & Guide: continue from the historical report, then establish the applicable official evidence before producing an answer.

The [pinned forum archive](https://github.com/1235357/zebra-public-site-archive/blob/922f359fe59e4cce01420af7e234cf016d93171c/Zebra_Forum_Backup_2026-10-26/offline-structured-forum-20261027-v3/pages/89377fa2869e7f7ff472418f.html) preserves the original question as a partial copy. The author reports TC700K, Android 6.0.1, DataWedge 6.2.23 and Xamarin. The team reader's article edition is 6.2. These are different fields. Neither device behavior nor the reported root cause has been independently reproduced. The current environment could not retrieve the live article or the live reader. The component uses the inspected archive and the team's published release summary, not fabricated official excerpts. Replies and proposed edits are not inserted into the answer input.

## Integration

Once this version is deployed, the existing reader can link to:

```html
<a href="https://tmkbs.github.io/zebra-evidence-framework/classroom/visual-companion.html?reader=dw62-intent-receiver"
   target="_blank" rel="noopener noreferrer">
  Explain the reported behavior
</a>
```

For a same-site presentation, copy these three static files into a directory such as /document-reader/visual/:

- classroom/visual-companion.html
- classroom/guidance-team-bridge.js
- classroom/guidance-storyboard.js

Link to the copied companion or embed it if the deployed site permits framing:

```html
<iframe src="/document-reader/visual/visual-companion.html?reader=dw62-intent-receiver"
        title="Visual explanation: test broadcast versus scan delivery"
        loading="lazy" referrerpolicy="no-referrer"
        sandbox="allow-scripts allow-downloads allow-popups allow-popups-to-escape-sandbox"
        style="width:100%;min-height:820px;border:0"></iframe>
```

The iframe is optional and its actual production host policy still needs checking. The static component does not contact the campus API. Do not expose the local inference server, loosen its frame-ancestors restriction, or put arbitrary question text, case documents, or customer data in URLs. Unknown reader keys fail closed. Only add a new reader key after reviewing its original public question and published route.

The handoff uses a reader key, not a ZF case ID. Its receipt distinguishes question paraphrase, original archive, reported installed build, reader document edition, and unestablished answer-run edition. Clicking Continue in Ask & Guide preloads the public paraphrase and historical context; the version and official source fields are deliberately unset. No model is called until the operator supplies applicable evidence and opts in. The self-check is not an evaluation or proof of comprehension improvement.

## Next implementation priorities

1. Obtain the actual team reader export/source through existing authorized collaboration; link each reviewed case from its existing page, keeping case IDs authoritative in the reader.
2. Recover original public questions, preserve question-only input and exact source provenance, and connect selected new cases to suitable visual forms. Do not use the edited article or expected answer in a blind baseline.
3. Evaluate independent human answer-finding separately from AI answer reliability, using the same version-matched evidence and held-out tasks. Only report observed results.
4. Resume authorized campus-only Qwen runs when connectivity allows. No external paid model API; no client email or public forum submission is required for this engineering step.
