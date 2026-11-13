# Architecture

React + TypeScript using Next.js App Router conventions, compiled by Vinext/Vite to a single Cloudflare Worker through Sites. This retains familiar server route handlers while avoiding a separate Python web service. Plain CSS design tokens and Lucide icons keep the UI compact. Server and pure calculation modules are separate. Python/Poppler is used only for reproducible offline evidence ingestion where useful.

## Data path

Browser → same-origin API routes → bounded source adapters → normalized models → deterministic calculations/ranking → UI with sources. Server never trusts client URLs. Inputs are ticker/period/known source IDs, with length and syntax limits. Allowed primary hosts and redirect validation defend document fetches. Fetches have time/size limits and bounded retries; failures return cached historical records with original timestamps or explicit unavailable status.

Market adapter: Yahoo EOD chart source, symbol validation on returned identity, only completed sessions, prior 20 sessions excluding current volume. Yahoo is an unofficial free integration with availability/licensing limitations, not an SLA. NSE public RSS is the exchange filing path; company primary documents supplement historical evidence, visibly separate.

Research: ticker directory → discovery of primary links (Screener only as link directory) → bounded documents → text chunks with source/page → lexical retrieval → extractive passages or optional model output. Financial values require structured verified evidence; unstructured documents are not forced into accounting numbers. An environment-configured provider keeps credentials server-side. Retrieved content is untrusted evidence and cannot issue tool instructions. Citation IDs must belong to retrieved evidence.

## Persistence

Browser-local watchlist, preferences and read alerts (single-user prototype). Immutable, genuine historical evidence is versioned in data; request-level and bounded in-isolate TTL caches reduce calls. This is intentionally simpler than SQLite, which is not durable on edge/serverless instances. No claimed cross-device sync or durable ingestion database. For multi-user production, replace repository interfaces with D1/Postgres and add authentication/scheduled ingestion.

## Deployment

Sites single Worker default private deployment; no paid database or second service. Standard Next.js compatibility is retained where possible; README documents the actual runtime instead of claiming an untested Vercel build. Automated tests run on pure modules and HTTP routes. Bundled evidence is auditable and timestamps are preserved.
