# Client-aligned visual scope — Interactive Tech Docs with Conversation and Video

## Product intent

The target is a conversational technical guide enhanced with contextual diagrams and short videos that help a developer understand and apply the documentation. Visual guidance is **not** computer vision, a device emulator, another support-case dashboard, or an avatar reading a manual. The original project title is preserved. Evidence-based evaluation of answerability and documentation gaps remains the primary course/client deliverable; a complete deployed agent or an autonomous video generator is not claimed.

## Implementation direction

- Preserve the team's case reader and document findings as the evidence-producing workstream.
- Use the answer-side framework to select an appropriate explanation form (concept/data path, diagnostic sequence, comparison, containment, or scope clarification).
- Prefer useful official media where the source actually lists it; use a source-linked authored visual walkthrough when it clarifies a specific concept. Do not automatically load remote video/images.
- No official clip is represented as newly generated. No clip segment, duration, transcript, or playback result is asserted without verification. No cross-edition media substitution.
- User interaction may collect explicitly confirmed context for the next answer. A self-check is only optional feedback, not a validated learning outcome.

## First concept-learning pilot

The [DataWedge 15.0 Profiles article](https://techdocs.zebra.com/datawedge/15-0/guide/profiles/) describes Input, optional Process, and Output, contains a [profile diagram](https://techdocs.zebra.com/datawedge/15-0/guide/profiles/dw_profile.png), and lists an [introduction video](https://www.youtube.com/watch?v=LCaPhWxk4y0). The diagram and article were inspected November 24, 2026. The video was identified from its official embedded link; playback and individual segments were not verified. A version-matched concept question triggers the interactive data-path story, these optional links, and one self-check. Specific commands, failure questions, incompatible versions, and incomplete retrieved source passages do not trigger this media bundle.

## Remaining questions for client confirmation

Does the client prefer relevant original media plus an interactive concept explanation, newly generated short explainers, or both? Which recurring misunderstanding of product capability is the best initial test? What public media may be reused in the course prototype? Treat this as a proposed interpretation pending client confirmation, not as approval.

A useful follow-up evaluation would compare a source-grounded text answer with the same answer plus contextual visual guidance on a held-out task, using expert-checked comprehension questions and useful next actions. Record actual participant outcomes, time and unresolved misunderstandings; do not invent improvement scores or convert browser tests into learning effectiveness. Keep raw client SPR records internal, and use campus models only if authorized.
