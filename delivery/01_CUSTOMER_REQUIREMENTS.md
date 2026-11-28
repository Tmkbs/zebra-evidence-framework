# 01 — Customer requirements and delivery scope

## 1. Two intake channels

### A. Telephone-originated support tickets

The 14 October client transcript describes the service-desk path: a customer calls the global service desk; unresolved questions move to a technical support desk; cases that remain unresolved may reach engineering. Some are eventually classified as out-of-scope because the requested feature is unsupported or the product is working as designed.

**Required system behaviour:** accept an authorized, sanitized ticket question; check whether approved documentation and automation can answer it; answer immediately when evidence is sufficient; ask for the minimum missing context when appropriate; otherwise preserve the documented limitation and escalate.

No live phone-system integration or ticket closure is part of this student prototype. The current intake schema can accept a permitted support sample later. The support track remains inactive until the customer authorizes the data and fields.

### B. Developer-forum cases

The same client transcript describes developers posting technical questions, sometimes waiting months for an answer. Zebra wanted to know whether an AI assistant could answer from publicly available TechDocs, developer.zebra.com material and Zebra sample repositories, and whether a forum agent could eventually answer suitable questions.

**Required system behaviour:** preserve the original first post as the question; keep expert replies out of the generation input; retain expert replies separately for independent review; use only permitted official evidence; record whether the answer is supported, incomplete, unsafe or requires clarification.

Forum auto-posting is not enabled. The prototype produces answer candidates and review records, not public posts.

## 2. Two complementary business outcomes

1. **Immediate automated resolution:** questions that can already be answered from approved documentation and automation tools should receive a useful answer without waiting for an engineer. A candidate answer is not a confirmed resolution; semantic review and, where relevant, user confirmation remain separate.
2. **Proactive case prevention:** recurring confusion should be addressed at its source through targeted documentation clarification, answer strategies and, in the second phase, source-grounded visual explanations.

A correct explanation that a feature is unsupported can resolve an out-of-scope question without proposing a code or documentation change. Missing evidence must not be mislabelled as a documentation defect.

## 3. Phase 1 — documentation processing and answerability

For each admitted case, determine:
- What the developer actually asked and what facts were supplied.
- Which product, installed version/build and documentation edition apply.
- What the official source and sample code actually say.
- Whether existing AI can answer without using the target forum's expert reply.
- Whether failure comes from missing user context, source access/extraction, retrieval, reasoning, version mismatch, a documented limitation, a possible documentation gap or a need for device/expert verification.
- Whether an answer can be automated now, should ask a focused clarification, or must be escalated.

A documentation proposal must identify the exact page and passage, evidence, expected clarification, uncertainty and retest plan. A failed AI response alone does not prove that documentation is defective.

## 4. Phase 2 — understandability

Choose a concept only after a recurring difficulty is supported by case evidence. Build a concise diagram or video from version-matched official content. Do not create a talking head that merely reads the page. Test understanding on a different example; otherwise describe the video as an explanatory prototype, not a measured learning intervention.

## 5. Product boundary

The immediate customer deliverable is an evidence-based evaluation, case findings and recommendations. A new custom AI agent is not a prerequisite: the client explicitly suggested that existing agents should be able to work if the documentation and evidence are adequate. The embedded widget is an optional prototype integration, not a requirement to deploy a new production service.

## 6. Acceptance language

Use these labels consistently:
- **Implemented:** code exists.
- **Software-tested:** automated test passed.
- **Observed:** actual run/output exists.
- **Independently reviewed:** a human reviewer assessed the actual output.
- **Customer accepted:** customer explicitly accepted the deliverable.
- **Not run / not measured:** no evidence yet.

Never use "resolved", "prevented", "accurate", "improved comprehension" or "reduced support" based only on a successful API call, synthetic fixture, video render or offline software test.