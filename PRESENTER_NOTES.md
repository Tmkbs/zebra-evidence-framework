# Zebra Evidence Framework — live classroom narration

**Primary website:** https://tmkbs.github.io/zebra-evidence-framework/classroom/  
**In-app controls:** click **Presenter mode · 5 min** at the top right; the English cue cards can navigate the nine real workflow screens without faking user actions. No PowerPoint is needed.

**Positioning:** An independent, reusable evidence-review framework built alongside the team's public technical documentation research. The framework has a working offline draft-to-copy revision flow and JSON handoff contract. It does **not** contain the teammate's private editing program, live model inference, measured optimization gains, verified device fixes or generated video.

## Five-minute walkthrough (English) — updated November 16

This walkthrough keeps **nine steps** while replacing the old speculative developer-preview step with a direct, distinct contribution to the team's seven-case release. The strongest default presentation needs **no CSV import**: use one of two publicly linked proposal examples. For a complete seven-case review, download and locally import the team's CSV beforehand.

**00:00–00:20 | Architecture**  
*Say:* “The team now has concrete documentation revision proposals. My independent contribution is an evaluation layer that tracks what can actually be supported before the revision moves forward.”  
*Show:* The visual case → evidence → review → bounded revision → local retest pipeline.

**00:20–01:05 | Team review intake**  
*Click:* **Team review intake**. Select the EHS 2.8 or SET_CONFIG 13.0 public proposal.  
*Say:* “Rather than duplicating their editor, I take an existing proposal and check whether its source, device version and editing scope have been verified.”  
*Show:* All reviewer gates initially unknown. Do **not** mark them as checked without evidence. Click **Continue in our Framework**.

**01:05–01:25 | Question**  
*Say:* “The imported record is a research-review question, not a verified original forum transcript or confirmed solution.”  
*Show:* Title, issue summary and open context questions.

**01:25–02:00 | Evidence**  
*Say:* “A source link isn't proof by itself. Every record has explicit limits, so we can see what still needs verification.”  
*Show:* The team's proposal link and the general public release note (which is not case-specific proof).

**02:00–02:35 | Human review**  
*Click:* **Documentation-only review · no model run**.  
*Say:* “We can review the proposed wording without pretending a model or device has been tested.”  
*Show:* Empty model-output fields.

**02:35–03:00 | Failure diagnosis**  
*Click:* **Possible documentation clarity gap**.  
*Say:* “This labels a possible documentation issue, not a confirmed scanner root cause.”

**03:00–03:55 | Document revision**  
*Click:* Review the research-note before/after. Acknowledge local-only testing, then approve for local retest.  
*Say:* “This is a bounded clarification to our review note, not a change to Zebra's published manual.”

**03:55–04:35 | Retest**  
*Click:* **Apply to temporary copy**.  
*Say:* “The original remains untouched. The copy workflow works, but device validation remains NOT RUN.”

**04:35–04:55 | Delivery packet**  
*Click:* **Download complete JSON** or **Download case report**.  
*Say:* “We can hand off a traceable decision record without claiming the edit is approved for publication.”

## Optional: demonstrate the actual Agent Continue handoff (30 seconds)

For the three preloaded public research fixtures only, open **Review** and point to the **Agent Continue · real extension bridge** panel. This path is intentionally disabled for arbitrary CSV-imported team cases until their public data scope is independently cleared. Click **Export plugin task (.json)**, showing how the selected real public case and its evidence can become a **one-send queue task** in 叶真同's Chrome extension. The extension's Settings import can load this real file; it requires a separate, explicit user Start in an existing ChatGPT conversation. The webpage can then accept a case-matching JSON response as **MANUAL_ENTRY_NOT_VERIFIED**.

*Say:* “This is the plugin handoff from our research case into Zhentong's actual Agent Continue scheduler. It uses the extension's JSON import contract, so we're not pretending that a Chrome extension can run inside our website. We still review the answer here.”

Do not claim a live run occurred unless you actually perform one on a permitted public case. [Exact bridge instructions](classroom/AGENT_CONTINUE_BRIDGE.md). This is optional to the five-minute walkthrough.

## How it connects to Evolutionary Computation

If Sam asks about optimization, **do not automatically open Search Lab on a real case**; it rightly says **NOT MEASURED**.

> “The course made me think about a natural decision problem: when review time is limited, which missing details should we verify first? I have a small toy search sandbox to check the algorithm mechanics, but I haven't measured real verification costs or compared evolutionary approaches yet. I'd only add an evolutionary method if the measured problem calls for it.”

This makes the research connection without claiming evolutionary neural networks or benchmark gains.

## Emergency 90-second version

1. **Team review intake (30 s):** “The team has seven selected public cases. I use its published proposals as input, not as a duplicate editor.” Open one of the two verified proposal links.
2. **Evidence and gates (25 s):** “Source, device/version and scope have to be checked. Unknown means unknown.”
3. **Revision and retest (20 s):** “Our framework proposes a bounded research-note change and applies it only to a disposable copy.”
4. **Delivery (15 s):** “The exported JSON records decisions and missing tests without claiming an approved product fix.”

## Before class

- Open the [hosted demo](https://tmkbs.github.io/zebra-evidence-framework/classroom/) in Chrome/Edge. Use **Presenter mode** for practice; hide it for a clean audience view if needed.
- For the current demonstration, open **Team review intake** and use the EHS 2.8 or SET_CONFIG 13.0 public example. If demonstrating the full seven cases, download the CSV earlier, then verify its column mappings. Do not assume the CSV file is automatically synced or bundled.
- Test **Team intake → Continue in Framework → Documentation-only review → Diagnosis → Clarity → Revision → Ack → Approve → Retest → Apply** once; reload the page before class to start clean.
- Do **not** show passwords, campus model endpoints, private internal reports, NDA attachments or restricted screenshots.
- Backup: download [standalone HTML](classroom/evidence-framework-sandbox.html) from GitHub Raw and open it offline; copy the short script above into your own notes.

## Likely questions, concise answers

**Is this real project work or fabricated sample data?** “The developer questions and linked research sources are real and public. The two synthetic options are separated for QA. The review interface and copy-only patching are working prototypes.”

**Are the AI comparisons complete?** “No. We don't have a controlled real model run for these particular public cases in this build, so those fields are explicitly NOT RUN.”

**Did you modify Zebra's documentation?** “No. We can edit an authorized local document copy; the built-in case text is our editorial research note. Publication would need the documentation owner's approval.”

**How does this relate to the other teammate?** “The framework defines evidence, review state and a revision interchange contract. The separate private document-editing implementation can connect at that boundary once access is authorized.”

**Why is it in an evolutionary computation class?** “I'm exploring the validation strategy and search problem that appears naturally in the workflow, but I'm not claiming a completed evolutionary experiment.”

**Where are sources and code?** “The public-source manifest and the complete classroom demo live in the same [GitHub repository](https://github.com/Tmkbs/zebra-evidence-framework). Source references are linked from the case itself.”

## Course-only evolutionary extension (two presentation versions)

- **Zebra client (default):** https://tmkbs.github.io/zebra-evidence-framework/classroom/ — the existing evidence intake, review, bounded revision and retest. The evolutionary experiment is hidden from the client-facing navigation.
- **Evolutionary Computation edition:** https://tmkbs.github.io/zebra-evidence-framework/classroom/course.html — the *same Framework* plus a visible **Evolution lab** entry and an optional final presenter step.

**45–60 second optional demonstration:** Click **Evolution lab**, leave the illustrative budget at 20 toy minutes, press **Next generation** once, then **Run 25 generations**. The chart displays best-so-far fitness for a genuine seeded binary genetic algorithm. Compare it with the greedy baseline and an exact optimum from all 4,096 combinations. Change the time budget or seed to demonstrate that the heuristic is not guaranteed to be optimal.

**One-sentence bridge to class:** “Our evidence framework tells us what is uncertain. Evolutionary search is one possible way to prioritize what to verify first under a limited review budget.”

**Scope:** 12 fictitious actions, arbitrary minutes and points, a feasible 12-bit chromosome, tournament selection, one-point crossover, 6% per-bit mutation, and elitism. No real case costs, verification benefits, device results, benchmark superiority or confirmed evolutionary gain for Zebra are claimed. The exact optimum is toy-only, not production acceptance.
