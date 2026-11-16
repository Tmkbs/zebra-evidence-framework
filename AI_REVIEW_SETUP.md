# Real AI document review — deployment and safeguards

The simplified public website is at https://tmkbs.github.io/zebra-evidence-framework/classroom/. It now includes **Run AI document review** in addition to **Offline checks**. The GitHub Pages URL is **static** and cannot run the model backend. The AI button performs real inference only after connecting the server-side route at `api/review.js`.

## Deploy the same GitHub repository to Vercel

1. Connect `Tmkbs/zebra-evidence-framework` to a **new Vercel project**, choose the repository root and use the *Other* framework preset. `vercel.json` maps the homepage to `/classroom/index.html` and leaves the serverless function at `/api/review`. No external JS packages are required.
2. In Vercel **Project Settings → Environment Variables**, set the following privately. These values must never appear in Git commits, source files, browser JavaScript, client-visible URLs, or screenshots:

   | Name | Meaning |
   | --- | --- |
   | `AI_API_KEY` | Credential for the approved model endpoint |
   | `AI_REVIEW_ACCESS_TOKEN` | A separate long, random review passcode, **not** your model API key |
   | `AI_MODEL` | Optional, defaults to `gpt-4.1-mini`; configure an approved model/checkpoint |
   | `AI_BASE_URL` | Optional, defaults to `https://api.openai.com/v1`; supports OpenAI-compatible Chat Completions |
   | `AI_ALLOWED_ORIGINS` | Optional comma-separated additional HTTPS origins if hosted on your own domain |
   | `AI_ALLOW_HTTP` | Optional, `true` only for a **trusted private lab backend**; avoid public HTTP |

3. Redeploy and open the newly deployed Vercel URL (the homepage). Choose **DataWedge 13.0 SET_CONFIG** or **EHS 2.8 Link Removal**, enter the review passcode under **AI connection** once in that browser tab, and click **Run AI document review**. The app calls the same-origin `/api/review` route. The function fetches the two pinned public URLs, extracts the relevant section, calls the model, and returns structured findings, limited verbatim quotes, suggested wording, next checks, and source hashes.
4. Alternatively keep using GitHub Pages: open **AI connection**, enter your deployed `https://<your-vercel-project>/api/review` URL and the review passcode. GitHub Pages still hosts the client but makes an explicit, authenticated cross-origin request to the Vercel function when you click Run AI.
5. For cases without both recognized public URLs, optionally upload **two** authorized `.txt`, `.md` or `.html` files from the collapsed AI connection panel. The browser extracts text and sends it only after the explicit Run AI action. Each document's extracted text must be between 120 and 26,000 characters. PDFs and arbitrary external URL fetching are intentionally not supported.

## Model inputs and the actual scope

- **EHS28:** original `https://techdocs.zebra.com/ehs/2-8/guide/settings/`, proposed `https://zebra-techdocs-practicum.vercel.app/document-reader/ehs28-revised.html`; compare around the `linkremoval` section.
- **SC13:** original `https://techdocs.zebra.com/datawedge/13-0/guide/api/setconfig/`, proposed `https://zebra-techdocs-practicum.vercel.app/document-reader/sc13-revised.html`; compare near `plugin_configbundle`.
- The server retrieves the HTML and extracts up to 26,000 characters **around the relevant anchor** from each document, not necessarily the complete article. The response identifies retrieval time, source URL, content hash, extraction method and truncation. Fetch/permission failures are reported, never fabricated.
- The generated JSON is an **AI analysis of source excerpts**, not a verified source-of-truth or device fix. Where the model cites quotations, the server checks that the exact quoted string appears in the input excerpt, and removes unsupported quotes. It does not prove that a quoted technical claim is correct.
- The backend must be explicitly deployed with approved credentials and access restrictions. Neither the GitHub Pages site nor this repository has a private API key or token by default. The website has not been verified against live private model credentials in this repository.
- The server does not persist documents and sets `Cache-Control: no-store`, but your chosen model provider's data-handling rules still apply. **Only send approved public/non-sensitive material**. The access passcode mitigates casual misuse but is not a production identity provider or a complete rate limit; configure provider quotas, access restrictions and Vercel firewall for wider use.

## Validation

Run `npm test` or execute the zero-dependency Node tests individually:
- `node classroom/test_one_click.cjs`
- `node classroom/test_ai_review.cjs` (mocks public source fetch and model response; no model charges)
- `node classroom/test_end_to_end.cjs`

All model and document calls in the AI backend test are mocked. A successful test proves contract and controls, **not** that a Vercel deployment or live model is configured.

## Troubleshooting

- **AI backend is not connected:** deploy to Vercel or supply the deployed endpoint on GitHub Pages.
- **401 Unauthorized:** use the review access passcode (`AI_REVIEW_ACCESS_TOKEN`), not `AI_API_KEY`.
- **503 Unconfigured:** set server-side `AI_API_KEY` and `AI_REVIEW_ACCESS_TOKEN`, then redeploy.
- **422 Document unavailable:** source webpage may be inaccessible or extraction incomplete; provide the two source files manually.
- **502 Model error:** check the approved model ID, upstream URL, network path, serving runtime, latency and logs. No success output will be invented.
