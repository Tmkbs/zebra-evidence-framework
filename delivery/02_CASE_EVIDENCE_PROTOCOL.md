# 02 — Case intake and evidence protocol

## 1. Shared case record

Both channels use the same case schema and answer pipeline. Keep the channel label and source-specific provenance.

Required fields:
- Stable case ID and channel: `forum` or `support_ticket`.
- Question origin: original public forum first post or approved support sample.
- Original question text, with paraphrase status recorded if the exact text is unavailable.
- Product, reported installed version/build, device/model, OS/runtime and configuration when supplied.
- Official documentation edition and exact TechDocs URL(s).
- Sample-code URL(s) where relevant.
- Intake timestamp and source snapshot/hash.
- Consent/approval state and sanitization status for support material.
- Expert/reference answer stored separately from generation input.

Do not infer an installed version from a linked tutorial, API constant, model name or neighbouring forum reply. Distinguish reported installed version from documentation edition.

## 2. Forum isolation

- Inspect the original first post and preserve its exact question separately from replies.
- The baseline generation input must not contain the target thread's accepted answer, expert replies, analyst recommendations or scoring rubric.
- A prompt saying "ignore forum replies" is not proof of isolation. Record actual URLs, retrieval payloads and browser/tool exposure.
- Keep replies in a reviewer-only reference store. Use them to assess the answer only after generation.
- If the source archive does not preserve a first post or its replies distinctly, mark isolation NOT VERIFIED and exclude the case from clean docs-only claims.

## 3. Support-ticket privacy

- The support intake route is for approved, sanitized samples only.
- Do not ingest raw customer tickets, names, serial numbers, contact details, proprietary logs or credentials into a public repository or an unapproved model.
- The current schema requires `channel=support_ticket`, `question_origin=authorized_support_question`, `origin_verified=true`, `public_only=true`, `support_sample_approved=true`, and a non-identifying sample reference.
- A flag in a JSON file does not create permission. The customer must authorize the sample and fields.
- Until approved samples are supplied, report the support-ticket denominator as NOT AVAILABLE; do not substitute forum cases or private SPR summaries.

## 4. Disposition taxonomy

| Disposition | Meaning | Next action |
|---|---|---|
| `document_guidance` | Existing version-matched evidence supports a bounded explanation | Return the cited guidance and explicit limits |
| `model_candidate` | Model produced an answer with mechanical quote checks | Independent semantic review before claiming it is correct |
| `clarify` | A required product/version/context field is missing | Ask the smallest discriminating question |
| `human_review` | Conflict, unsupported claim, uncertain scope or device verification needed | Escalate with evidence and reason |
| `excluded` | Duplicate, unapproved, synthetic or provenance-incomplete input | Preserve exclusion reason and denominator |

A documented limitation is a useful answer when it directly addresses the request. A partial explanation is not a confirmed fix. A human escalation is not a system failure when the evidence genuinely requires expertise or device validation.

## 5. Finding categories

For every unsuccessful or incomplete answer, consider separately:
1. Missing user context.
2. Product/version mismatch.
3. Source inaccessible or extraction incomplete.
4. Retrieval failure.
5. Model interpretation/reasoning error.
6. Conflicting or ambiguous official source content.
7. Documented unsupported capability or product limitation.
8. Suspected documentation gap.
9. Device/runtime behavior requiring reproduction.
10. Contaminated or unverified input.

Only call something a confirmed documentation defect after checking the relevant edition, adjacent sections, related official pages/sample code and domain review.

## 6. Denominators

Report counts separately for forum and support-ticket channels:
- Total submitted rows.
- Eligible original questions.
- Duplicates and excluded cases.
- Actual model attempts and completed runs.
- Document-guidance outputs, model candidates, clarifications and human escalations.
- Independently reviewed correct answers and critical errors.
- Confirmed user resolutions, only if follow-up evidence exists.

Do not calculate an automated-resolution rate from model candidates. Do not claim prevented tickets or posts from offline experiments.