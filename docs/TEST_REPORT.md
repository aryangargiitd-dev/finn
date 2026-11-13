# Verification report

Executed during the build on 13 November 2026 (IST). Tests below describe actual observations, not intended coverage.

## Automated checks

- `npm run typecheck`: passed after correcting JSON result types, an optional chart value and PDF-library lifecycle API usage.
- `npm test`: 16 tests passed, zero failures. Coverage: daily price changes; missing/zero/negative values; prior-20-session volume excluding the current session; threshold boundaries; categorization; materiality penalties; supported ticker validation; ratios; IST date normalization; real time windows; RSS normalization; safe source links; URL/cross-exchange duplicate detection; provider identity; incomplete sessions; all 18 retrieved quote snapshots; fact-to-source association; lexical retrieval; citation rejection; guidance comparisons; primary-document discovery; settings bounds.
- `node tests/http-smoke.mjs` with `FINN_TEST_LIVE=1`: passed. Homepage SSR, non-portfolio search, real EOD price observations, filings with source/ranking, custom historical filter returning no records, historical evidence provenance, follow-up retrieval, invalid ticker rejection, and an unfamiliar-ticker COFORGE primary-PDF workflow.
- `npm run build` via the Sites build helper: passed. Routes: `/`, `/api/market`, `/api/announcements`, `/api/research`, `/api/search`. Vinext emitted a nonfatal static route-classification notice and Lucide barrel optimization notice; build completed.

## Browser checks (in-app browser / Playwright-backed controls)

- Home and watchlist rendered, with genuine prices and explicit cache/session dates.
- Pulse and Reality Check measured at 375px: document scrollWidth 375, clientWidth 375; no horizontal overflow.
- Mobile navigation opened Research and Settings.
- Reality Check rendered both verified primary-document URLs and page anchors.
- Changed price threshold from 3% to 3.5%, changed digest window to seven days, saved, reloaded and verified both values persisted.
- Company filter INFY produced the appropriate empty state; resetting the filter restored genuine filings. Routine disclosure control revealed lower-priority records.
- Searched COFORGE; provider-validated addition succeeded; company drawer showed fetched EOD price/volume, relative volume and a genuine price-history chart.
- “Research this company” completed with actual retrieved transcript passages and page links.
- Browser screenshots were visually inspected at mobile and desktop/tablet sizes; evidence metadata was enlarged and darkened following inspection.

## Source observations and honest limits

- All 18 default symbols returned matching `.NS` identities and INR currency.
- The latest provider timestamp could have a null close. FINN displayed the latest valid completed session, 11 November 2026 in the tested data, rather than inventing a 12 November close.
- Both official NSE and BSE public RSS endpoints returned XML successfully. Cross-exchange duplicate financial-highlights descriptions collapse into one development. Differently worded documents may still remain separate.
- The initial COFORGE run retrieved an older BSE transcript; this revealed that newer documents used an unlisted official IR host. That company IR host was verified, added to the explicit allowlist, and the discovery control now says “Discover primary documents” rather than promising latest coverage. Directory dates are carried in transcript labels. This does not create a hardcoded research response.
- Model-provider integration is implemented but was not executed with an API key. No test of live paid-model quality is claimed.
- No exhaustive accessibility audit, load test, OCR validation, all-ticker coverage test or unattended notification test was performed.
- Browser source links were inspected for their actual URLs/page anchors; availability of every external link is not guaranteed.
- Deployment outcome and any deployment-specific verification are recorded in `DEPLOYMENT.md`.

## Public production verification

On 13 November 2026, the full HTTP smoke suite passed against the public deployed URL with `FINN_TEST_LIVE=1`. COFORGE returned 93 parsed chunks after the official IR-host update. Production quotes included a fetched INFY observation dated 12 November and a TARSONS observation dated 11 November; differing latest valid dates remain explicit. The unsigned-in browser rendered Pulse and the cited Reality Check. This verifies the deployed Worker independently of the local Wrangler preview, which did not become ready.
