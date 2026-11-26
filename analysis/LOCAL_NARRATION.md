# Generate a narrated technical video from a question

The batch pipeline and the existing Ask & Guide interface now share the same source-gated renderer. Four supported question families currently have checked official source cards (Profiles, scan trigger, result-code discrepancy, and SET_CONFIG). The renderer assembles the matching reviewed storyboard, synthesizes English narration locally, encodes H.264/AAC, checks audible audio and decodes the complete file. It rejects unsupported scopes; no invented technical scene or live-model answer is produced.

Install Python 3, Pillow (python -m pip install Pillow), FFmpeg/ffprobe and eSpeak NG (or eSpeak) on PATH. On Windows, the local CLI defaults to python, and the renderer can use Arial if DejaVu Sans is unavailable. PYTHON, ZEBRA_FONT and ZEBRA_FONT_BOLD can override local executable/font paths.

1. Run npm run campus.
2. Open http://127.0.0.1:3000/answer-guidance.html.
3. Prepare a question and applicable edition using Offline guidance. Confirm public/approved material.
4. Click Generate narrated MP4. Play the result, save the MP4 and captions, or download the existing handoff JSON with the video source receipt.

The route accepts same-origin local requests with the existing session access token and permits one rendering job at a time. It does not call a campus model or external video service. The hosted static demo can still play the fixed concept sample or generate browser-only silent animations; on-demand voiced rendering requires the local server.

The actual batch videos can also be generated with npm run batch -- --input analysis/batch-demo-input.json --output new-output --video. These are technical explainers, not a course presentation or a commercial generative-video model. Source and research boundaries remain in the receipts; device behavior and learning effects are not verified.

The browser-video regression separately handles temporary Chromium-profile cleanup races after media assertions have completed. A real assertion, encoding, or decoding failure still fails the test.
