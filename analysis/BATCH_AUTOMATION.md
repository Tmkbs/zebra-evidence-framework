# Automated answer-side batch and narrated video

The user-facing demo remains small; this command is the reproducible engineering entry point. It does not edit the team's document reader or claim a joint deployed service.

## Run (offline by default)
- Node 20+; for narrated video also Python 3, Pillow, FFmpeg, eSpeak-NG and DejaVu Sans fonts.
- `npm run batch -- --input analysis/batch-demo-input.json --output runs/demo`
- `npm run batch -- --input analysis/batch-demo-input.json --output runs/narrated --video`
- `npm run batch -- --manifest classroom/public_case_manifest.json --output runs/public-intake`
- `npm run batch -- --csv /path/to/team-export.csv --output runs/csv-intake`

Output directory must be new. Each run writes batch-report.json; --video creates an MP4, VTT subtitles, the exact narration input, and a receipt with source citations, file digest, decode verification, and audio peak for each matched visual form. The four technical prompts in batch-demo-input.json are illustrative engineering checks, not new real forum cases or a held-out set.

CSV and the existing manifest are intake only. Missing questions remain missing; paraphrases stay paraphrases; product and edition are not inferred. Candidate-match counts deduplicate identical questions and shared forum URLs; they are not independent pattern-support counts and never promote a strategy to validated.

## Public reviewed questions and paired Qwen
Prepare a JSON file with schema "zebra-batch-input/v1" and cases containing id, question, question_origin, product, version, context, source_urls. For network modes, each record must also have question_origin "original_public_question", forum_url on an admitted public forum host, origin_verified true (operator actually inspected the original), and public_only true. Do not use internal SPRs. The explicit `--mode evidence --allow-network` or `--mode compare --allow-network` option enables a network run. Compare uses only the approved campus endpoint, same model/evidence/settings for both arms, and retains raw model responses. Use the campus network/VPN. No network call is made for synthetic prompts or unreviewed CSV rows. A successful pair is not a semantic evaluation; independently review source support, correctness, clarification and applicability. Do not treat the default CI tests as live inference.

## Immediate answer processing — both support and forum channels

Run `npm run batch -- --input reviewed-approved-input.json --output runs/guided --mode guided --allow-network` to request one guided answer rather than a baseline/guided experiment. The provider is administrator-configured; no production posting or ticket closure is performed. See ENTERPRISE_HANDOFF.md for approved provider configuration.

Public forum inputs use the existing original-question provenance gate. A telephone-originated support sample uses channel "support_ticket", question_origin "authorized_support_question", origin_verified true, public_only true, support_sample_approved true, and a non-identifying support_sample_ref such as "SAMPLE-DEMO". This is only for genuinely client-approved, sanitized, non-confidential samples. A flag does not create permission, and raw tickets must never be uploaded. Synthetic tests use mock sources/providers and are not customer evidence.

Each row now includes a resolution disposition: document_guidance (existing source-linked explanation, possibly partial), model_candidate (automatically generated with mechanical quote checks, not semantically verified), clarify, human_review, or excluded. The summary preserves all rows by channel. It does not report a success rate from candidate answers or infer reduced calls/posts. A successful model request is not a confirmed fix. Real support and forum samples still require independent review.

## Narration
Narration is local deterministic speech synthesis of the existing evidence-linked storyboard captions, not a generative video model. The renderer accepts only known source-backed maps; unsupported or unresolved scopes receive no technical video. It uses generic highlighted diagrams, not actual device footage. The browser's existing optional silent WebM export remains available; the CLI generates verified voiced MP4s. CI produces playable artifacts for review. No learning gain, device behavior, or publication approval is claimed.

## Remaining boundaries
- Import the actual team CSV and verify originals/versions; no claim of an all-57-case study.
- Run true paired campus inference and have humans score it.
- Add reviewed visual templates/grounded new forms rather than inventing unsupported instructions.
- Connect the document-side revision runner and shared integration handoff with the team.
