import snapshot from "../data/market-cache.json";
import { company } from "./companies";
import { cached, textFetch } from "./http";
import { marketMetrics, percentChange, ratio } from "./domain";
import type { Bar, Quote } from "./types";
type Chart = {
  meta: { symbol: string; longName?: string; currency?: string };
  timestamp: number[];
  indicators: {
    quote: { close: (number | null)[]; volume: (number | null)[] }[];
  };
};
type Saved = { fetchedAt: string; sourceUrl: string; result: Chart };
export function parseChart(
  ticker: string,
  result: Chart,
  fetchedAt: string,
  status: Quote["status"],
  now = Date.now(),
): Quote {
  if (result.meta.symbol !== `${ticker}.NS` || result.meta.currency !== "INR")
    throw new Error("Provider identity or currency mismatch");
  const quote = result.indicators.quote[0];
  const bars: Bar[] = [];
  let latestIndex = -1;
  for (let i = 0; i < result.timestamp.length; i++) {
    const time = result.timestamp[i] * 1000;
    const date = new Date(time + 19800000).toISOString().slice(0, 10);
    const sessionEnd = Date.parse(`${date}T16:00:00+05:30`);
    const close = quote.close[i];
    if (
      sessionEnd > now ||
      close === null ||
      !Number.isFinite(close) ||
      close <= 0
    )
      continue;
    latestIndex = i;
    const v = quote.volume[i];
    bars.push({
      date,
      close,
      volume: v !== null && Number.isFinite(v) && v >= 0 ? v : null,
    });
  }
  if (!bars.length) throw new Error("No completed trading sessions");
  const prior = quote.volume.slice(Math.max(0, latestIndex - 20), latestIndex);
  const averageVolume =
    prior.length === 20 &&
    prior.every((v) => v !== null && Number.isFinite(v) && v >= 0)
      ? (prior as number[]).reduce((a, b) => a + b, 0) / 20
      : null;
  return {
    ticker,
    name: result.meta.longName || company(ticker).name,
    ...marketMetrics(bars),
    change: percentChange(
      quote.close[latestIndex],
      quote.close[latestIndex - 1] ?? null,
    ),
    averageVolume,
    relativeVolume: ratio(quote.volume[latestIndex], averageVolume),
    fetchedAt,
    status,
    sourceUrl: `https://finance.yahoo.com/quote/${encodeURIComponent(ticker)}.NS/history/`,
    bars,
  };
}
export async function getQuote(ticker: string): Promise<Quote> {
  const c = company(ticker);
  return cached(`quote:${ticker}`, 15 * 60e3, async () => {
    try {
      const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}.NS?range=3mo&interval=1d`;
      const json = JSON.parse(
        await textFetch(url, ["query2.finance.yahoo.com"]),
      );
      const result = json.chart?.result?.[0];
      if (!result) throw new Error("No market data from provider");
      return parseChart(ticker, result, new Date().toISOString(), "fetched");
    } catch (error) {
      const old = (snapshot as unknown as Record<string, Saved>)[ticker];
      if (old)
        return {
          ...parseChart(ticker, old.result, old.fetchedAt, "cached"),
          error:
            error instanceof Error ? error.message : "Provider unavailable",
        };
      return {
        ticker,
        name: c.name,
        close: null,
        change: null,
        volume: null,
        averageVolume: null,
        relativeVolume: null,
        asOf: null,
        fetchedAt: new Date().toISOString(),
        status: "unavailable",
        sourceUrl: "https://finance.yahoo.com/",
        bars: [],
        error: "Market provider unavailable; no cached observations",
      };
    }
  });
}
export async function getQuotes(tickers: string[]) {
  const result: Quote[] = [];
  for (let i = 0; i < tickers.length; i += 4)
    result.push(...(await Promise.all(tickers.slice(i, i + 4).map(getQuote))));
  return result;
}
