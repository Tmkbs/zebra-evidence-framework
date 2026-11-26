# Enterprise-portable TechDocs assistant prototype

Zebra is the first domain integration, not a requirement that the customer run a university model. The product separates the web integration, answer/evidence workflow, and model provider.

## Try the embedding

```sh
npm run enterprise
```

Open http://127.0.0.1:3000/embedded-assistant.html. This is a reference document page with an embedded, scoped assistant. Try a substantive scan-trigger question using the offline source check; the existing visual/storyboard engine is reused. For the full research/inspection workflow use /answer-guidance.html. No model is needed for checked offline cards. The enterprise entry point defaults to inference off.

## Model deployment

An administrator can configure a supported, approved HTTPS Chat Completions gateway. Example configuration (illustrative values, not a running gateway):

```text
ZEBRA_MODEL_MODE=enterprise
ZEBRA_MODEL_APPROVED_ORIGIN=https://your-approved-gateway.example
ZEBRA_MODEL_BASE_URL=https://your-approved-gateway.example/v1
ZEBRA_MODEL_NAME=your-approved-model
ZEBRA_MODEL_API_KEY=<server-side secret if required>
```

The gateway must provide the Chat Completions response format expected by the current engine. Set the variables in the local process environment or deployment secret manager, never commit them. The endpoint origin must match exactly, the transport is HTTPS, and redirects are disabled. Requests cannot choose an endpoint, model or credentials. The campus mode remains for the approved development host. Use `ZEBRA_MODEL_MODE=off` for a non-inference environment. Check /api/model-status on the local prototype. A status response is not proof of a successful answer. No commercial provider or Zebra network has been configured or contacted for this branch.

The prototype continues to accept public-only input for remote inference and does not yet accept restricted company documents. In portable mode the older document-review model proxy is disabled rather than silently sending material to a campus service. Existing documentation evidence review remains a separate workstream.

## Embed in a host page

Load `classroom/techdocs-widget.js` as a browser script and mount into a host element:

```js
TechDocsWidget.mount(document.getElementById("assistant"), {
  scope: {product: "datawedge", version: "6.8", source_urls: [officialPage]},
  ask: hostAnswerAdapter,  // host-owned callback: input -> Promise<answer receipt>
  live: true,              // enable only when approved backend exists
  renderExtras: hostVisualRenderer // optional; return a cleanup callback
});
```

The generic widget contains no model endpoint, secret or company-specific URL. It provides the question/context form, explicit inference consent, source cards, exact-quote-filtered candidate claims and suggested follow-up checks. The embedding example supplies the existing Zebra planner, local endpoint and visual renderer; a different host can supply its own answer adapter and renderer implementing the same receipt contract. Incomplete or unsupported questions must be allowed to abstain. No network occurs until the visitor explicitly requests an action. Do not treat the displayed claim check as semantic verification.

The actual Zebra knowledge pipeline still has a limited edition-aware source router and curated visual forms. Reusing the widget and model adapter does NOT make the evidence engine universally compatible with arbitrary private sources. To deliver a production integration, add customer-approved versioned retrieval/indexing, document ACLs, authentication/authorization, retention and redaction policy, audit and observability, escalation and user feedback, browser/CSP compatibility and end-to-end customer acceptance. Maintain traceable source/edition boundaries and independent answer scoring. Keep the customer-specific evidence and strategy registry separate from the portable widget. The current local server binds only to loopback and its session mechanism is not enterprise multi-user authentication.

## Validation

```sh
node --test analysis/test_model_provider.cjs analysis/test_techdocs_widget.cjs
npm test
```

These tests use mock providers or offline fixtures. Actual approved enterprise endpoint integration, deployed embedding in the team's private reader, production auth, knowledge-base ingest, device validation and effectiveness remain NOT ESTABLISHED. Existing university-run evidence can remain part of the development evaluation without becoming a customer deployment dependency.
