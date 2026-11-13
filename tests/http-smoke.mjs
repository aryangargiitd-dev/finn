import assert from "node:assert/strict";
const origin = process.env.FINN_TEST_ORIGIN || "http://127.0.0.1:5173";
async function get(path) {
  const r = await fetch(origin + path, { signal: AbortSignal.timeout(80000) });
  assert.equal(r.status, 200, path);
  return r.json();
}
const home = await fetch(origin);
assert.equal(home.status, 200);
assert.ok((await home.text()).includes("Your portfolio, in focus."));
console.log("PASS homepage SSR");
const search = await get("/api/search?q=COFORGE");
assert.ok(search.companies.some((c) => c.ticker === "COFORGE"));
console.log("PASS non-portfolio ticker search");
const market = await get("/api/market?tickers=INFY,TARSONS");
assert.equal(market.quotes.length, 2);
assert.ok(market.quotes.every((q) => q.close > 0 && q.asOf && q.fetchedAt));
console.log(
  "PASS real market observations",
  market.quotes.map((q) => [q.ticker, q.status, q.asOf]),
);
const filings = await get(
  "/api/announcements?tickers=GICHSGFIN,TARSONS&window=7d",
);
assert.ok(Array.isArray(filings.items));
assert.ok(
  filings.items.every(
    (f) => f.sourceUrl.startsWith("https://") && f.filedAt && f.explanation,
  ),
);
console.log("PASS filings with source/ranking", filings.items.length);
const old = await get(
  "/api/announcements?tickers=GICHSGFIN&window=custom&start=2020-01-01&end=2020-01-02",
);
assert.equal(old.items.length, 0);
console.log("PASS actual time filtering");
const research = await get("/api/research?ticker=INFY");
assert.equal(research.status, "cached");
assert.ok(research.sources.length >= 2 && research.facts.length);
console.log("PASS historical evidence provenance");
const ask = await fetch(origin + "/api/research", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    ticker: "INFY",
    question: "What was revenue growth guidance?",
  }),
});
assert.equal(ask.status, 200);
const answer = await ask.json();
assert.ok(answer.answerCitations.includes("infy-guidance"));
console.log("PASS grounded question retrieval");
const invalid = await fetch(origin + "/api/research?ticker=NOTAREALCO");
assert.equal(invalid.status, 400);
console.log("PASS invalid ticker rejected");
if (process.env.FINN_TEST_LIVE === "1") {
  const unfamiliar = await get("/api/research?ticker=COFORGE");
  assert.equal(
    unfamiliar.status,
    "fetched",
    JSON.stringify(unfamiliar.warnings),
  );
  assert.ok(
    unfamiliar.sources.some(
      (s) => s.url.includes("bseindia.com") || s.url.includes("coforge.com"),
    ),
  );
  assert.ok(unfamiliar.chunks.length > 0);
  console.log(
    "PASS unfamiliar-ticker primary PDF retrieval",
    unfamiliar.chunks.length,
    "chunks",
  );
}
