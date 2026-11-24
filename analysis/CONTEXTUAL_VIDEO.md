# Contextual short video — original Zebra scope

The project title remains **Interactive Tech Docs with Conversation and Video**. This feature makes the existing question-specific visual explanation into a short, silent, captioned clip. It is not computer vision, a talking avatar, a device recording, or another support-case dashboard.

## User workflow

1. Open Ask & Guide, select a question with a checked visual explanation, or open the team reader's Visual Companion.
2. Inspect or interact with the current explanation. Choose **Create short video** in that same player.
3. Keep the tab visible while the browser encodes the clip locally. Cancel if needed. Changing the explanation invalidates the old preview.
4. Preview the resulting 1280×720 WebM, then optionally download it and the JSON source receipt.

The shared renderer rasterizes the existing source-linked SVG scenes to a canvas, preserves complete explanatory captions and source-type labels, and records a WebM through MediaRecorder. Duration adapts to the captions; supported stories are under one minute. The actual receipt includes full source URLs, scene captions, provenance, requested frame timings, actual byte count, and encoding status. Only a completed, nonempty recording gets `video_file: true`. The original storyboard remains a separate conceptual artifact. No video is automatically generated, uploaded, narrated, or played. No remote images, audio, models, credentials, paid APIs or hardware permissions are required.

Supported inputs are the checked scan-trigger diagnostic, result-code comparison, SET_CONFIG hierarchy, Profiles concept, and the team r61 reported-path comparison. Unsupported questions or unestablished versions still receive clarification rather than a fabricated technical video. Forum observations and team release summaries stay distinguishable from official source excerpts. Actual device behavior remains unverified. Local WebM encoding requires a compatible browser; the interactive guide remains available otherwise. A host embedding the companion must permit its own local blob image decoding and blob video playback. Do not expose the campus inference service.

## Evaluation

The browser QA actually encodes the r61 contextual clip, loads it into a video element, checks decoded resolution and playback, then retains the WebM plus matching source receipt as a short-lived public-input-only workflow artifact. It also exercises the same encoder on the Profiles concept and the unsupported-question gate. These checks verify media mechanics, not technical correctness on a real device or increased learning effectiveness.

Next, use identical, expert-checked question/evidence tasks to compare a source-grounded text answer against the same answer with a relevant diagram or short clip. Measure whether the user understands the concept and identifies a useful next action. Keep independent user answer-finding separate from AI answer reliability. Do not claim a measured benefit until observations are collected.
