# Zebra Evidence Framework — live classroom narration

**Primary website:** https://tmkbs.github.io/zebra-evidence-framework/classroom/  
**In-app controls:** click **Presenter mode · 5 min** at the top right; the English cue cards can navigate the nine real workflow screens without faking user actions. No PowerPoint is needed.

**Positioning:** An independent, reusable evidence-review framework built alongside the team's public technical documentation research. The framework has a working offline draft-to-copy revision flow and JSON handoff contract. It does **not** contain the teammate's private editing program, live model inference, measured optimization gains, verified device fixes or generated video.

## Five-minute walkthrough (English)

**00:00–00:25 | Architecture — Why build this?**  
*Click:* Architecture (the opening view).  
*Say:* “We have been working with real developer questions, and one thing became clear: a plausible technical answer is not always a supported answer. I wanted a way to track what the documentation actually says, where the uncertainty is, and what should happen next.”

**00:25–00:55 | Question — A real case**  
*Click:* Question. Keep **Real public report · Android web integration** selected.  
*Say:* “This is a real public question about controlling scanning from an Android web application. Instead of guessing a solution, the framework separates the reported need from what we can actually establish.”  
*Show:* Original public question and the published team report. The case is grounded in public materials, not a private customer ticket.

**00:55–01:30 | Evidence — What does the source support?**  
*Click:* Evidence. Point to the official DataWedge 15.0 guide and the scope limit beneath it.  
*Say:* “The official guide documents native software scan controls. But that does not prove that Chrome can invoke them, or that the device has that particular version. A useful answer needs to preserve those conditions.”

**01:30–02:00 | Review — Do not invent model results**  
*Click:* Review. Under Human review, choose **Documentation-only review · no model run**.  
*Say:* “The forum question and document evidence are real, but we haven't run a controlled model comparison on this case. I can still review the documentation without pretending two AI outputs have been tested.”  
*Show:* A/B fields remain empty. Scores are human-entered, not automatic benchmarks.

**02:00–02:30 | Diagnosis — A hypothesis, not a diagnosis of the device**  
*Click:* Failure diagnosis. Select **Possible documentation clarity gap**.  
*Say:* “A poor answer may come from missing context, retrieval, a version mismatch, or unclear documentation. We should first decide which kind of problem we are investigating rather than rewriting a manual automatically.”

**02:30–03:25 | Document revision — The meaningful action**  
*Click:* Document revision. Examine the original and proposed note, check the local-test acknowledgment, and click **Approve for local retest**.  
*Say:* “Here is a minimal clarification to our research note. The source is preserved, and the change needs an explicit review before we apply it. This is not an edit to Zebra's official documentation.”  
*Show:* Original versus proposed paragraph. If you want a second example, use a permitted TXT/Markdown file, but **do not open NDA-restricted files while screen sharing**.

**03:25–04:00 | Retest — A real local document operation**  
*Click:* Retest → **Apply to temporary copy**.  
*Say:* “We can apply the proposed wording to a disposable document copy and export it without touching the original. That's a working documentation handoff. It is not a model-performance result or a verified scanner fix.”  
*Show:* Revised paragraph and held-out checks marked **NOT RUN**.

**04:00–04:35 | Developer preview — Where this could lead**  
*Click:* Developer preview.  
*Say:* “This is the developer-facing view: a question, its evidence, missing-context prompts, and a possible visual explanation. The model answer isn't generated here, and the video is only a storyboard.”  
*Show:* Evidence and the three storyboard frames, not an imaginary generated video.

**04:35–05:00 | Delivery — What is reusable?**  
*Click:* Delivery packet → **Download complete JSON** or **Download case report**.  
*Say:* “The case, source limitations, review decision, proposed document change and outstanding checks all travel in one structured record. This is the boundary where my framework can connect to a separate documentation implementation.”

## Optional: demonstrate the actual Agent Continue handoff (30 seconds)

In **Review**, point to the **Agent Continue · real extension bridge** panel. Click **Export plugin task (.json)**, showing how the selected real public case and its evidence can become a **one-send queue task** in 叶真同's Chrome extension. The extension's Settings import can load this real file; it requires a separate, explicit user Start in an existing ChatGPT conversation. The webpage can then accept a case-matching JSON response as **MANUAL_ENTRY_NOT_VERIFIED**.

*Say:* “This is the plugin handoff from our research case into Zhentong's actual Agent Continue scheduler. It uses the extension's JSON import contract, so we're not pretending that a Chrome extension can run inside our website. We still review the answer here.”

Do not claim a live run occurred unless you actually perform one on a permitted public case. [Exact bridge instructions](classroom/AGENT_CONTINUE_BRIDGE.md). This is optional to the five-minute walkthrough.

## How it connects to Evolutionary Computation

If Sam asks about optimization, **do not automatically open Search Lab on a real case**; it rightly says **NOT MEASURED**.

> “The course made me think about a natural decision problem: when review time is limited, which missing details should we verify first? I have a small toy search sandbox to check the algorithm mechanics, but I haven't measured real verification costs or compared evolutionary approaches yet. I'd only add an evolutionary method if the measured problem calls for it.”

This makes the research connection without claiming evolutionary neural networks or benchmark gains.

## Emergency 90-second version

1. **Question (15 s):** “Here is a real public developer issue, with a link to the original report.”
2. **Evidence (20 s):** “The versioned official source supports one part of the problem but leaves the browser integration unresolved.”
3. **Diagnosis (15 s):** “We distinguish incomplete evidence from a possible documentation clarity issue.”
4. **Revision + Retest (25 s):** “We propose an edit to a research-note copy, require review, and apply it without changing the original.”
5. **Delivery (15 s):** “We export what was checked, what was changed, and what remains unverified. The framework is reusable; production integration comes later.”

## Before class

- Open the [hosted demo](https://tmkbs.github.io/zebra-evidence-framework/classroom/) in Chrome/Edge. Use **Presenter mode** for practice; hide it for a clean audience view if needed.
- Keep the default Android web integration case. It is the strongest preloaded connection to a **published team case report** and a specific official guide.
- Test the sequence **Review → Documentation-only → Diagnosis → Clarity → Revision → Ack → Approve → Retest → Apply** once; reload the page before class so that the review starts clean.
- Do **not** show passwords, campus model endpoints, private internal reports, NDA attachments or restricted screenshots.
- Backup: download [standalone HTML](classroom/evidence-framework-sandbox.html) from GitHub Raw and open it offline; copy the short script above into your own notes.

## Likely questions, concise answers

**Is this real project work or fabricated sample data?** “The developer questions and linked research sources are real and public. The two synthetic options are separated for QA. The review interface and copy-only patching are working prototypes.”

**Are the AI comparisons complete?** “No. We don't have a controlled real model run for these particular public cases in this build, so those fields are explicitly NOT RUN.”

**Did you modify Zebra's documentation?** “No. We can edit an authorized local document copy; the built-in case text is our editorial research note. Publication would need the documentation owner's approval.”

**How does this relate to the other teammate?** “The framework defines evidence, review state and a revision interchange contract. The separate private document-editing implementation can connect at that boundary once access is authorized.”

**Why is it in an evolutionary computation class?** “I'm exploring the validation strategy and search problem that appears naturally in the workflow, but I'm not claiming a completed evolutionary experiment.”

**Where are sources and code?** “The public-source manifest and the complete classroom demo live in the same [GitHub repository](https://github.com/Tmkbs/zebra-evidence-framework). Source references are linked from the case itself.”
