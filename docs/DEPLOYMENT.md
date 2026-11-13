# Deployment

## Runtime

One Cloudflare Worker, produced by the Vinext/Vite build. No paid database, no separate Python process. `.openai/hosting.json` contains the Sites identity and no credentials.

## Reproduce locally

```sh
npm ci
npm run build
npm start
```

`npm start` uses the generated `dist/server/wrangler.json`. The development server normally uses port 5173; production-local Wrangler prints its port. Do not use the runtime's ephemeral filesystem as durable SQLite storage.

## Sites publication

The source helper commits and pushes the selected source to the Site repository and packages the exact build. A native Sites deployment then saves that commit and deploys the archive. Secrets are passed through session memory/stdin or native environment settings, never committed. New Sites are private by default.

## Submission access

Owner-private hosting proves deployment but is not a reviewer-ready public link. Set reviewer access only after the user selects the audience. The GitHub source repository is a separate deliverable. Publication status and URLs are appended after the hosting provider confirms success.

## Optional model settings

Configure `LLM_API_KEY` as a runtime secret and `LLM_BASE_URL` / `LLM_MODEL` as server variables, then redeploy. The extractive mode remains the default if no key is provided. These values must not enter client environment variables.

## Alternative hosting

The source uses Next route conventions but is built/tested with Vinext. A Vercel migration requires validating standard Next runtime compatibility and replacing Worker-specific startup/configuration; it has not been claimed as tested. For independent Cloudflare hosting, use the generated Wrangler configuration with an appropriately provisioned account and bindings. Do not reuse a Sites project identity for a different account.

## Confirmed deployment — 13 November 2026

- Public reviewer URL: https://finn-investment-intelligence-aryan.spectacularlobster1.chatgpt.site
- User explicitly approved public access; Sites confirmed `access_mode: public`. An unsigned-in browser opened the app successfully.
- Deployed application commit: `59baea6170040a90278f2e2d5e8910137513fb62`. Subsequent documentation-only commits record the verified outcome.
- Site: `appgprj_6af60cb4fd7481919065c45706ea3a15`
- Version: `appgprj_6af60cb4fd7481919065c45706ea3a15~appgver_c88ba17dcd7c8191bb1b27afcec51818`
- Deployment: `appgdep_6af675b7abdc8191a911dc50755046ab`, succeeded.
- Full HTTP smoke suite ran against the public production URL with live retrieval enabled: passed, including COFORGE (93 chunks).
- Standalone local Wrangler preview missed initial readiness checks and later logged host file-watcher exhaustion (`EMFILE`). It was stopped without a local production smoke-test pass. Hosted production Worker checks passed independently.
- GitHub plugin installation is confirmed, but its repository actions are not exposed in this chat. GitHub publication is still pending; the Sites source remote is not GitHub.
