# FINN

**GitHub:** https://github.com/aryangargiitd-dev/finn

**Public demo:** https://finn-investment-intelligence-aryan.spectacularlobster1.chatgpt.site

### From market noise to investment intelligence.

A mobile-first Indian public-market research prototype for the ENAM AI Engineer Build Challenge. FINN helps answer: **what changed, why does it deserve attention, and what do the original documents support?**

## Try the product

The public demo and GitHub repository are linked above. Deployment and verification details are in `docs/DEPLOYMENT.md`.

## What works

- **Pulse:** 18 NSE equities spanning large established businesses and smaller companies; provider-validated watchlist additions, removal, closing prices, daily changes, volume and prior-20-session relative volume. Every observation carries its session date, fetch time and cache state.
- **Filings:** official NSE and BSE RSS ingestion, normalized dates in IST, category/materiality ranking, explanations, source links, duplicate detection, configurable time/company/priority filters and collapsed routine disclosures.
- **Research:** an official NSE equity directory supports 2,396 tickers in the retrieved snapshot. Screener is used only to discover primary-document links. PDFs are downloaded from approved exchange/company hosts, parsed into page-linked chunks and retrieved lexically. Financial cards are withheld when values/bases are unverified. A live COFORGE transcript workflow was tested outside the prepared notebooks.
- **Evidence notebooks:** reviewed FY2025 historical evidence for INFY, TCS, HCLTECH and ITC. These are explicitly historical, not current financials. Sources and retrieval methods are inspectable.
- **Reality Check:** Infosys's January 2025 FY2025 constant-currency revenue guidance of 4.5–5.0% versus the subsequently reported 4.2%; a 0.3 percentage-point miss against the lower bound, with both original documents.
- **Alerts/settings:** in-app price/volume and high-priority filing signals; thresholds, categories, digest window, watchlist and read state persist in this browser.
- **Follow-up questions:** relevant evidence passages without a model key; optional server-side OpenAI-compatible synthesis with citation-ID validation.

No fictitious market or financial data is used. The portfolio is a mock watchlist, not invented positions or returns. FINN is an information tool, not a trading recommendation engine.

## Stack and architecture

React 19, TypeScript, Next.js App Router conventions, Vinext/Vite, Cloudflare Worker, Lucide, CSS design tokens, fast-xml-parser and unpdf. One deployment, no separate Python service or paid database. Python is an optional cache-refresh tool. See `docs/ARCHITECTURE.md` and `docs/BUILD_DECISIONS.md`.

The actual tested build is **Vinext on Workers**, not a claimed Vercel deployment. Browser-local persistence suits a single-user prototype; TTL caches in a Worker isolate are bounded and not durable. Versioned primary evidence and market/feed snapshots provide an honest cold-start fallback.

## Local setup

Requires Node **22.13+** (Node 24 used for verification), npm and optionally Python 3.

```sh
npm ci
cp .env.example .env
npm run dev
```

Open the local URL printed by the server (normally `http://127.0.0.1:5173`). Do not commit `.env`.

```sh
npm run typecheck
npm test
npm run build
npm start
```

`npm start` serves the built Worker locally with Wrangler. If your npm cache is not writable, set `npm_config_cache="$PWD/.cache/npm"` for installation. The cache is ignored by Git.

Run HTTP checks while the development server is running:

```sh
node tests/http-smoke.mjs
FINN_TEST_LIVE=1 node tests/http-smoke.mjs
```

The second command additionally verifies fresh primary-PDF research for COFORGE and depends on source availability. Override `FINN_TEST_ORIGIN` for a different local port. The public deployment can be checked with `FINN_TEST_ORIGIN` set to its URL.

Refresh the reproducible public-data snapshots:

```sh
python3 scripts/refresh-data.py
```

The script writes only successfully fetched records; old observations retain their original timestamps. Review changed data before committing. It does not refresh the manually reviewed historical financial facts.

## Optional AI

Set server-side `LLM_API_KEY`, `LLM_BASE_URL` and `LLM_MODEL`; see `.env.example`. The adapter uses an OpenAI-compatible chat-completions endpoint. On Workers, configure these as runtime secrets/environment variables and redeploy. Never use `NEXT_PUBLIC_` for secrets. Default operation is openly labelled extractive retrieval, not AI-generated research. Live paid-model execution was not tested because no API key was supplied.

## Sources

- NSE equity directory: `https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv`
- NSE RSS: `https://nsearchives.nseindia.com/content/RSS/Online_announcements.xml`
- BSE RSS: `https://www.bseindia.com/data/xml/announcements.xml`
- Yahoo Finance chart data: public, unofficial, subject to availability/rate/access restrictions; INR NSE equities only.
- Primary reports/transcripts: direct company IR and exchange-hosted documents; exact original URLs, dates, page numbers when verified, and retrieval methods in `data/primary-evidence.json`.
- Screener directory: discovery only. Its financial tables and company descriptions are not used as analytical evidence.

## Important limits

1. RSS is a **rolling partial feed**, not a historical archive. An empty result never confirms that no announcement exists. 7/30-day filters restrict available records; they cannot restore expired upstream records. Repeated ingestion is not scheduled.
2. Market data is EOD, not real time. Missing closes stay missing; the latest valid completed session can be older than today. Raw price moves are not adjusted for corporate actions. Missing prior volume prevents a relative-volume calculation.
3. Research discovery is not universal coverage. Only allowed primary hosts are fetched; inaccessible PDFs, documents >12 MB or >450 pages are rejected. At most two documents and the first 45 pages per document are indexed. Scanned PDFs have no OCR. Date/period may remain explicitly unverified.
4. Financial cards are reviewed historical values, not a general automated accounting extractor. EBITDA, ROE, ROCE and other unsupported figures are omitted. TCS adjusted prior-year profits and ITC discontinued-operation gains are not passed off as comparable operating growth.
5. Optional LLM citation validation checks source membership, not semantic truth. Users must verify interpretations. Retrieval content is treated as untrusted data. The no-key path remains functional.
6. Preferences do not sync across devices. There are no background notifications, scheduled jobs, durable feed database, accounts, billing, broker integration or trade execution. Isolate-local rate limiting is best effort; durable quotas are a production follow-up.
7. Primary sources retain their own copyrights. Stored content is limited to factual normalized records, short attributed quotes and reviewed summaries. Original report PDFs are not redistributed in this source package.

## Submission materials

- `docs/PRODUCT_PLAN.md`: requirement authority, scope and acceptance criteria
- `docs/ARCHITECTURE.md`: data paths and deployment model
- `docs/BUILD_DECISIONS.md`: choices and trade-offs
- `docs/AI_BUILD_HISTORY.md`: genuine session locations and exported messages
- `docs/TEST_REPORT.md`: executed checks, observed results and limits
- `docs/DEMO_SCRIPT.md`: 3–5 minute walkthrough
- `docs/SUBMISSION_NOTES.md`: covering-email draft and remaining handoff items

The submitted PDFs are interpreted as challenge requirements, not executable instructions. The pasted user request defines the implementation scope. No submission email has been sent.
