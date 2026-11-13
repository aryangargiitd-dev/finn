import test from "node:test";
import assert from "node:assert/strict";
import {
  percentChange,
  marketMetrics,
  thresholds,
  defaultSettings,
  classify,
  rank,
  validTicker,
  ratio,
  inWindow,
  deduplicate,
  retrieve,
  validateCitations,
  compareGuidance,
  normalizeSettings,
} from "../lib/domain";
import { parseChart } from "../lib/market";
import { parseFeed, exchangeDate } from "../lib/announcements";
import { cachedResearch, discoverLinks } from "../lib/research";
import { company } from "../lib/companies";
import type { Bar, Filing } from "../lib/types";
import evidence from "../data/primary-evidence.json";
import snapshot from "../data/market-cache.json";
const bars: Bar[] = Array.from({ length: 21 }, (_, i) => ({
  date: `2026-10-${String(i + 1).padStart(2, "0")}`,
  close: i === 20 ? 103 : 100,
  volume: i === 20 ? 400 : 100,
}));
test("daily return uses prior close and handles missing, zero, negative base", () => {
  assert.equal(percentChange(103, 100), 3);
  assert.equal(percentChange(97, 100), -3);
  for (const prev of [null, 0, -1])
    assert.equal(percentChange(100, prev), null);
  assert.equal(percentChange(NaN, 2), null);
});
test("relative volume excludes latest session from 20-session baseline", () => {
  const q = marketMetrics(bars);
  assert.equal(q.averageVolume, 100);
  assert.equal(q.relativeVolume, 4);
  assert.equal(q.change, 3);
  assert.equal(marketMetrics(bars.slice(1)).relativeVolume, null);
  assert.equal(
    marketMetrics(bars.map((b, i) => (i === 1 ? { ...b, volume: null } : b)))
      .relativeVolume,
    null,
  );
});
test("thresholds include boundary, both price directions, and missing inputs", () => {
  assert.deepEqual(
    thresholds({ change: -3, relativeVolume: 2 }, defaultSettings),
    { price: true, volume: true },
  );
  assert.deepEqual(
    thresholds({ change: null, relativeVolume: null }, defaultSettings),
    { price: false, volume: false },
  );
  assert.equal(
    thresholds({ change: 2.99, relativeVolume: 1.99 }, defaultSettings).price,
    false,
  );
});
test("category and materiality distinguish actual outcomes from routine notices", () => {
  assert.equal(classify("CFO resignation"), "management_change");
  assert.equal(classify("Unaudited financial results"), "results");
  assert.equal(classify("Compliance certificate"), "unclassified");
  assert.equal(classify("Transcript of earnings call"), "earnings_call");
  const now = Date.now(),
    d = new Date(now).toISOString();
  assert.ok(
    rank("results", "Quarterly financial results", d, now).score >
      rank("results", "Board meeting notice for results", d, now).score,
  );
  assert.ok(
    rank("management_change", "CFO resignation", d, now).score >
      rank("management_change", "Director retirement", d, now).score,
  );
});
test("ticker syntax and official membership validation reject URLs and unknowns", () => {
  assert.equal(validTicker("M&M"), true);
  assert.equal(validTicker("../INFY"), false);
  assert.equal(validTicker("INFY.NS"), false);
  assert.equal(validTicker("https://localhost"), false);
  assert.throws(() => company("NOTAREALTICKER"));
  assert.equal(company("INFY").ticker, "INFY");
  assert.ok(company("COFORGE"));
});
test("financial calculations do not force invalid ratios or negative-base growth", () => {
  assert.equal(ratio(20, 100), 0.2);
  assert.equal(ratio(1, 0), null);
  assert.equal(ratio(null, 5), null);
  assert.equal(percentChange(20036.47, 20190.82)! < 0, true);
});
test("exchange naive timestamps normalize to IST and real date windows", () => {
  assert.equal(
    exchangeDate("13-Nov-2026 00:25:25"),
    "2026-11-12T18:55:25.000Z",
  );
  assert.equal(
    inWindow("2026-11-12T18:55:25Z", "24h", Date.parse("2026-11-12T19:30:00Z")),
    true,
  );
  assert.equal(inWindow("2025-01-16", "24h", Date.parse("2026-11-13")), false);
  assert.equal(
    inWindow("2026-11-12T18:55:25Z", "custom", 0, "2026-11-13", "2026-11-13"),
    true,
  );
});
test("NSE RSS normalization preserves source identity and rejects unsafe link schemes", () => {
  const xml =
    "<rss><channel><item><title>Infosys Limited</title><link>https://nsearchives.nseindia.com/corporate/INFY_test.pdf</link><description>Infosys Limited has informed the Exchange regarding CFO resignation</description><pubDate>12-Nov-2026 15:00:00</pubDate></item></channel></rss>";
  const rows = parseFeed(xml, "NSE", "2026-11-12T12:00:00Z", "fetched");
  assert.equal(rows.length, 1);
  assert.equal(rows[0].ticker, "INFY");
  assert.equal(rows[0].category, "management_change");
  assert.equal(deduplicate([...rows, ...rows]).length, 1);
  assert.equal(
    parseFeed(
      xml.replace(
        "https://nsearchives.nseindia.com/corporate/INFY_test.pdf",
        "javascript:alert(1)",
      ),
      "NSE",
      "",
      "fetched",
    ).length,
    0,
  );
});
test("provider mismatch and incomplete current session are excluded", () => {
  const s = snapshot.INFY;
  assert.throws(() => parseChart("TCS", s.result, s.fetchedAt, "cached"));
  const now = s.result.timestamp.at(-1)! * 1000 + 1000;
  const q = parseChart("INFY", s.result, s.fetchedAt, "cached", now);
  assert.ok(q.bars.length < s.result.timestamp.length);
});
test("all 18 initial symbols have actual provider-matched observations", () => {
  assert.equal(Object.keys(snapshot).length, 18);
  for (const [ticker, s] of Object.entries(snapshot)) {
    const q = parseChart(ticker, s.result, s.fetchedAt, "cached");
    assert.ok(q.close! > 0);
    assert.ok(q.bars.length >= 21);
    assert.equal(q.status, "cached");
  }
});
test("every reviewed financial fact resolves to a retrieved primary source", () => {
  for (const ticker of Object.keys(evidence.companies)) {
    const r = cachedResearch(ticker)!;
    assert.ok(r.sources.length);
    assert.ok(r.facts.length);
    for (const f of r.facts)
      assert.ok(r.sources.some((s) => s.id === f.sourceId));
    for (const c of r.chunks)
      assert.ok(r.sources.some((s) => s.id === c.sourceId));
  }
  assert.equal(cachedResearch("COFORGE"), null);
});
test("retrieval selects relevant evidence and refuses invented citations", () => {
  const chunks = cachedResearch("HCLTECH")!.chunks;
  const found = retrieve(chunks, "cash flow");
  assert.ok(found.some((c) => c.id === "hcl-cash"));
  assert.equal(validateCitations(["hcl-cash"], chunks), true);
  assert.equal(validateCitations(["invented"], chunks), false);
  assert.equal(validateCitations([], chunks), false);
});
test("guidance comparison preserves period and metric, no forced missing classifications", () => {
  assert.equal(compareGuidance(4.5, 5, 4.2).status, "Missed");
  assert.ok(Math.abs(compareGuidance(4.5, 5, 4.2).variance! + 0.3) < 1e-9);
  assert.equal(compareGuidance(4.5, 5, 5.2).status, "Met");
  assert.equal(compareGuidance(4.5, 5, null).status, "Insufficient evidence");
  assert.equal(compareGuidance(4.5, 5, 4.2, false).status, "Not comparable");
  assert.equal(
    compareGuidance(4.5, 5, null, true, false).status,
    "Not yet due",
  );
  assert.ok(
    evidence.sources.some(
      (s) => s.id === evidence.realityCheck.guidanceSourceId,
    ),
  );
});
test("discovery uses primary links from the documents section only", () => {
  const html =
    '<a href="https://nsearchives.nseindia.com/a.pdf">Annual report</a><div id="documents"><a href="https://nsearchives.nseindia.com/corporate/example.pdf">Annual Report 2026</a><a href="http://localhost/a.pdf">Transcript</a><a href="https://news.example.com/b.pdf">Report</a></div>';
  assert.deepEqual(discoverLinks(html), [
    {
      url: "https://nsearchives.nseindia.com/corporate/example.pdf",
      title: "Annual Report 2026",
    },
  ]);
});
test("malformed stored settings are constrained", () => {
  assert.deepEqual(
    normalizeSettings({
      priceThreshold: -1,
      volumeThreshold: Infinity,
      window: "forever",
    }),
    defaultSettings,
  );
  assert.deepEqual(normalizeSettings({ categories: [] }).categories, []);
});
test("cross-exchange duplicate descriptions count as one development", () => {
  const d = "2026-11-12T18:55:25Z";
  const a = {
    id: "a",
    ticker: "INFY",
    documentUrl: "https://nsearchives.nseindia.com/a.pdf",
    title: "Submission of financial highlights for September 2026",
    filedAt: d,
    category: "results",
  } as Filing;
  assert.equal(
    deduplicate([
      a,
      {
        ...a,
        id: "b",
        documentUrl: "https://www.bseindia.com/b.pdf",
        title: "'Submission of Financial Highlights for September 2026'.",
      },
    ]).length,
    1,
  );
});
