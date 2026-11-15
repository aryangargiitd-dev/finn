# FINN product plan

## Authority and scope

User request: the pasted build specification supplied in this chat. Challenge requirements: ENAM_AI_Engineer_Build_Challenge_Main.pdf (3 pages), read fully. Reference glossary (3 pages) is guidance, not a mandatory taxonomy. Job description was found in Downloads and visually reviewed: practical AI engineering, Python, cloud and builder judgment; it adds no submission requirements.

The challenge mandates a mobile-first working prototype; 15–20 mock holdings; EOD prices/volume, corporate filings and fundamentals; generalisable NSE-ticker research grounded exclusively in primary documents; repository, genuine AI conversations, and covering email. Deadline 15 November 2026. Submission email is assessment@enam.com, subject IIT Delhi – AI Engineer - 2027. Sending that email is not part of this build.

Digest/alerts and eight research sections are examples in the challenge, not its checklist. Our user explicitly requests these core workflows plus Reality Check, persistent settings and practical tests. No brokerage recommendations, invented prices, or invented citations.

## Investor workflow

Open Pulse → see ranked material changes and explicit freshness → inspect filing or company → research evidence → compare guidance with realised performance. Manage watchlist and thresholds without leaving the product. Default digest is actual trailing 24 hours. Historical evidence remains explicitly separate and is never redated to populate an empty feed.

## Chosen scope and acceptance

1. Pulse: 18 provider-validated companies across sectors, editable watchlist, actual EOD closes, change and prior-20-session relative volume; missing values stay missing. At least one live public filing path (NSE RSS), stable source IDs, category/materiality ranking, dates and genuine links. Time/category filters change records; routine filings expandable.
2. Research: ticker resolution beyond the initial watchlist, primary-document discovery, bounded retrieval/parsing, evidence chunks, extractive research without a key, optional grounded LLM with validated citation IDs. Cached verified evidence supports a useful demo under upstream failure. Unknown/unavailable companies return a clear evidence gap, not invented research.
3. Reality Check: one carefully checked Infosys FY25 case, latest January 2025 guidance versus April 2025 outcome, same metric/period/basis; both sources and comparison method visible.
4. Alerts/settings: deterministic threshold evaluation, category selection, digest preference, browser-local persistence; in-app monitoring on load/refresh, never described as live push.
5. Quality: unit tests for calculations/ranking/validation/citations; integration checks of API routes and actual primary retrieval; browser smoke at 375px and desktop. Production build, public reviewer deployment and public GitHub repository, with their actual verification reported in the deployment and test documents.

## Implementation order

Plan and architecture → Next-compatible shell → market and filings vertical slice → primary evidence and research → comparison → preferences/alerts → tests/mobile QA → deployment/submission materials.

## Boundaries

No paid services, intraday stream, trading, portfolio returns without positions, background delivery, inferred financial values or exhaustive autonomous accounting parser. Primary-source discovery can be incomplete. Rate limits and access denial are respected. Sources carry retrieval time independently of publication time.
