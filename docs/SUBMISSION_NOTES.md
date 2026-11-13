# Submission notes

Deadline in the main brief: **15 November 2026**. Required deliverables are the mobile prototype, GitHub repository, actual coding-agent/LLM conversations and short covering note. The email below is a draft only; nothing has been sent.

## Covering email draft

To: assessment@enam.com
Subject: IIT Delhi – AI Engineer - 2027

Dear ENAM team,

I’m submitting FINN, a mobile-first investment intelligence prototype built around a focused workflow: understand portfolio changes, inspect the evidence, and compare management guidance with reported outcomes.

Prototype: [insert reviewer-accessible deployed URL after checking access]
GitHub: [insert repository URL after publishing]
AI build history: [attach/export the genuine conversations linked in docs/AI_BUILD_HISTORY.md]

FINN includes an editable 18-company NSE watchlist, end-of-day price/volume monitoring, configurable in-app alerts, and prioritized NSE/BSE announcements. Its research pipeline discovers primary documents for supported NSE tickers, parses page-linked evidence and supports source-grounded follow-up questions. The engine was also tested on COFORGE outside the prepared research notebooks.

The main differentiator is Reality Check: Infosys’s January 2025 FY2025 revenue-growth guidance versus its subsequent annual outcome, with matched constant-currency basis and links to both disclosures. Reviewed FY2025 notebooks for four companies remain explicitly historical. Unsupported financial metrics stay unavailable.

The application uses React/TypeScript and Next.js App Router conventions compiled through Vinext into one Cloudflare Worker. Deterministic ranking, financial arithmetic and lexical retrieval keep the no-key product functional; optional server-side model synthesis accepts only retrieved evidence and validated citation references. Original timestamps, cache states, source errors and reporting bases remain visible.

I deliberately omitted intraday streaming, background push, voice and a general accounting-table extractor. Public RSS is incomplete, external sources may fail, and preferences are local to the browser. Next I would add durable scheduled ingestion, wider primary-document coverage and reviewed structured financial extraction.

The repository includes setup instructions, tests, build decisions, a demo script and genuine AI build-history exports.

Regards,
Aryan Garg
IIT Delhi

## Final handoff checklist

- Replace both URL placeholders with verified destinations.
- Enable appropriate reviewer access; a private Sites URL may require the owner's account.
- Publish the source to GitHub or grant reviewers access to a private repository.
- Attach/share original conversations. Included message exports intentionally omit hidden reasoning, tool credentials and raw tool payloads; see the provenance note.
- Read `docs/TEST_REPORT.md` and `docs/DEPLOYMENT.md` for the actual executed checks and remaining limits.
- Review this email and send it yourself; no mail integration is invoked by this task.
