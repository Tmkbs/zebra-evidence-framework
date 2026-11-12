# Professor showcase — quick narration (English)

**Opening (15 seconds).** Our prototype turns developer questions into reviewable case packets: a source, its exact applicability limits, gaps and suggested checks. We are not claiming a verified fix.

**Case review (45 seconds).** For the web scanning example, DataWedge 15.0 documents native scan controls, but the Chrome-to-native bridge and installed version are unknown. That is a concrete next question rather than an invented solution.

**Evaluation (30 seconds).** We compare actual captured outputs under fixed case inputs. Five criteria are manually reviewed; the app does not fabricate model scores. Our dataset is still developmental, not a published benchmark.

**Optional Lab API (30 seconds).** The new local-only adapter can submit an approved public case to an OpenAI-compatible model when the Northwestern campus/VPN service is available. It records the exact prompt, output and settings, then leaves human scoring blank. Development tests used a fake upstream; no real Qwen inference has been verified from this environment.

**Wrap-up (15 seconds).** The ZIP and offline HTML work even if our hosted site or lab is unavailable. We would like faculty and Zebra feedback on case selection, missing context and the next review gate.