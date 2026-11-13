# Agent Continue × Zebra Evidence Framework

This is a real, import-compatible bridge to [Agent Continue](https://github.com/1235357/agent-continue), developed by **Zhentong Ye (叶真同)**. The extension still runs in ChatGPT, not inside the Zebra website.

## Three steps

1. Open the [Zebra classroom demo](https://tmkbs.github.io/zebra-evidence-framework/classroom/), select a public case and its evidence, go to **03 Review**, and click **Export plugin task (.json)**.
2. In [Agent Continue](https://chromewebstore.google.com/detail/jpioilmpbolfokedaefmbfbjeaahfdkl), go to **Settings → Import JSON**. Pause any running task first. Import the file, choose your own ChatGPT conversation, review the task and **manually press Start**. Importing a settings file does not start the task. This generated task uses queue-once, maxSends: 1, and startImmediately: true: one immediate send *after you press Start*, not before.
3. Copy the structured JSON answer from ChatGPT, expand **Paste ChatGPT result** in Zebra Review, select A or B, paste, and click **Import JSON result**. Evaluate the imported draft with the existing human scoring process.

## Real extension contract

Verified against the released [Agent Continue v2.2.1](https://github.com/1235357/agent-continue/releases/tag/v2.2.1) and the development main branch. Its popup.js implements **Settings → Import JSON** using checkedImport(), with readConfig() validating the loaded draft.

The generated file has the actual supported wrapper and a bounded one-time task:

~~~json
{
  "format": "agent-continue-settings",
  "version": 1,
  "includesPrompt": true,
  "config": {
    "mode": "queue-once",
    "queue": [{"name": "Zebra evidence review", "text": "PUBLIC case prompt"}],
    "prompt": "",
    "intervalMinutes": 20,
    "maxSends": 1,
    "startImmediately": true,
    "waitForIdle": true,
    "preventDiscard": true,
    "keepAwake": false,
    "scheduleMode": "after-reply",
    "sendMethod": "auto",
    "stopMarkers": [],
    "quietHours": {"enabled": false, "start": "23:00", "end": "07:00"}
  }
}
~~~

The prompt requests this return format, preserving original case identity:

~~~json
{
  "schema": "zebra-agent-continue-response/v1",
  "case_id": "ZF-WEB-INTEGRATION",
  "answer": "Concise answer with evidence boundaries",
  "evidence_assessment": [],
  "unknowns": [],
  "next_checks": []
}
~~~

The Zebra app checks schema, case ID, nonempty answer, size limits and optional list types. It rejects wrong-case JSON without changing the review. Accepted text appears in Candidate A or B and is labeled **MANUAL_ENTRY_NOT_VERIFIED**. It never auto-scores or approves a revision; subsequent manual edits clear the import receipt.

## Safety and actual limits

The extension's manifest only matches the ChatGPT site and does not expose externally_connectable. Therefore the Zebra website **cannot run, detect, or control** the plugin. User-initiated settings-file import and manual result transfer are the real interoperability path.

The exported task includes only the selected public case summary and public evidence links. It excludes local imported documents, confidential data, credentials, lab endpoints and private teammate code. Check the prompt before sending it to ChatGPT. Do not add NDA material.

The extension is MIT-licensed; we use its supported JSON contract without copying its implementation. This does **not** connect the separate private Zebra documentation editor. No live model execution, device fix, model performance or publication approval is claimed by the bridge.

See [classroom end-to-end tests](test_end_to_end.cjs), [full handoff](INTEGRATION_HANDOFF.md) and the [public research manifest](public_case_manifest.json).
