# Build decisions

## A complete investor workflow

Pulse answers what changed; a source link establishes the fact; company research supplies context; Reality Check compares a specific management expectation with a later reported outcome. A mock watchlist has no share quantities, so no fabricated portfolio P&L appears. The 18 companies include large businesses, specialist technology names, a life-sciences supplier and a housing lender. Every default symbol was validated against Yahoo's returned symbol and INR currency.

## One server deployment

Next.js App Router conventions through Vinext retain familiar React/server-route structure and compile to one Sites Cloudflare Worker. This is a deployment trade-off, not a claim that a standard Next/Vercel build was tested. SQLite would be ephemeral in this runtime; browser-local preferences plus immutable evidence and bounded TTL caches make the prototype reliable without introducing a paid database or Python service. A future multi-user service needs durable storage and authentication.

## Deterministic where possible

Daily return, 20-session relative volume, threshold evaluation, recency and filing category/materiality ranking are deterministic. Notices of a results meeting get less attention than actual results; CFO/CEO and financial-risk indicators raise attention. Explanations expose those rules. Exchange timestamps lacking offsets are interpreted in IST. URL and normalized cross-exchange-description deduplication reduce repeated developments.

The prior 20 sessions exclude the alert session. Missing volume prevents a ratio. A missing preceding close prevents a claimed daily return even if an earlier price exists. Only completed sessions with valid closes are displayed; a newer provider timestamp with null close is not invented into an observation.

## AI and evidence efficiency

Lexical retrieval works without credentials and is explicitly labelled. Optional OpenAI-compatible synthesis receives only selected source chunks, uses a compact model, caches repeated questions, and rejects unknown citation IDs. No model is asked to calculate routine financial arithmetic. Citation validation is not proof of truth; the evidence ledger is the audit path. No actual LLM invocation was verified without a user-supplied key.

PDF parsing is bounded (12 MB, 450 pages, first 45 pages, two documents). This protects latency and memory but limits coverage. Unknown tickers can still retrieve actual primary documents: COFORGE succeeded with 39 chunks from an 18-page BSE transcript, outside the four notebook examples. Directory pages contribute links only, never analytical conclusions.

## Carefully scoped Reality Check

Infosys's 16 January 2025 call guided FY2025 constant-currency revenue growth to 4.5–5.0%. The 17 April 2025 result reported 4.2%. We compare the same annual period and currency basis and compute 4.2 − 4.5 = −0.3 percentage points. This is a historical guidance vintage, not current advice or an explanation of causality. No status is forced for companies lacking matched evidence.

## Genuine fallback and known compromises

Original fetch dates and session/reporting dates are separate. The immutable evidence notebooks are clearly FY2025 historical data. Runtime failures return cached observations with an error or explicit unavailable state. RSS coverage is partial, so empty results are qualified. No redated events or illustrative price arrays fill the interface.

Direct INFY/TCS downloads returned HTTP 403; prepared evidence uses primary-document passages retrieved through web tools, with method recorded. HCL/ITC original PDFs were retrieved and parsed locally. HCL's transcript contains an apparent EBIT unit typo, which was omitted instead of silently corrected. ITC continuing profit is separated from discontinued-operation income. TCS adjusted comparatives are not used for reported-profit growth.

## Deliberately omitted

Live intraday streaming, push delivery, scheduled ingestion, advanced vector infrastructure, fully automatic financial table normalization, OCR, voice and multiple model tiers. These would add operational complexity without improving the verified core workflow by the deadline. The UI prioritizes source trust, useful density and mobile operation.
