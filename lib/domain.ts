import {
  categories,
  type Bar,
  type Category,
  type Filing,
  type Settings,
  type Chunk,
} from "./types";
export const defaultSettings: Settings = {
  priceThreshold: 3,
  volumeThreshold: 2,
  window: "24h",
  categories: [...categories],
};
export const defaultPortfolio = [
  "RELIANCE",
  "TCS",
  "INFY",
  "HDFCBANK",
  "ICICIBANK",
  "SBIN",
  "BHARTIARTL",
  "ITC",
  "LT",
  "MARUTI",
  "SUNPHARMA",
  "TITAN",
  "ASIANPAINT",
  "HCLTECH",
  "PERSISTENT",
  "KPITTECH",
  "TARSONS",
  "GICHSGFIN",
];
export const sectors: Record<string, string> = {
  RELIANCE: "Energy & retail",
  TCS: "IT services",
  INFY: "IT services",
  HDFCBANK: "Banking",
  ICICIBANK: "Banking",
  SBIN: "Banking",
  BHARTIARTL: "Telecom",
  ITC: "Consumer",
  LT: "Industrials",
  MARUTI: "Automotive",
  SUNPHARMA: "Healthcare",
  TITAN: "Consumer",
  ASIANPAINT: "Materials",
  HCLTECH: "IT services",
  PERSISTENT: "Technology",
  KPITTECH: "Automotive tech",
  TARSONS: "Life sciences",
  GICHSGFIN: "Housing finance",
};
export function validTicker(s: unknown): s is string {
  return typeof s === "string" && /^[A-Z0-9][A-Z0-9&-]{0,24}$/.test(s);
}
export function percentChange(current: number | null, previous: number | null) {
  return current === null ||
    previous === null ||
    !Number.isFinite(current) ||
    !Number.isFinite(previous) ||
    previous <= 0
    ? null
    : ((current - previous) / previous) * 100;
}
export function ratio(n: number | null, d: number | null) {
  return n === null ||
    d === null ||
    !Number.isFinite(n) ||
    !Number.isFinite(d) ||
    d <= 0
    ? null
    : n / d;
}
export function marketMetrics(bars: Bar[]) {
  const latest = bars.at(-1);
  const prior = bars.slice(-21, -1);
  const volumes = prior.map((b) => b.volume);
  const averageVolume =
    prior.length === 20 && volumes.every((v) => v !== null && v >= 0)
      ? (volumes as number[]).reduce((a, b) => a + b, 0) / 20
      : null;
  return {
    close: latest?.close ?? null,
    change: percentChange(latest?.close ?? null, bars.at(-2)?.close ?? null),
    volume: latest?.volume ?? null,
    averageVolume,
    relativeVolume: ratio(latest?.volume ?? null, averageVolume),
    asOf: latest?.date ?? null,
  };
}
export function thresholds(
  q: { change: number | null; relativeVolume: number | null },
  s: Settings,
) {
  return {
    price: q.change !== null && Math.abs(q.change) >= s.priceThreshold,
    volume: q.relativeVolume !== null && q.relativeVolume >= s.volumeThreshold,
  };
}
export function normalizeSettings(v: Partial<Settings>): Settings {
  return {
    priceThreshold:
      Number.isFinite(v.priceThreshold) &&
      v.priceThreshold! >= 0.1 &&
      v.priceThreshold! <= 50
        ? v.priceThreshold!
        : 3,
    volumeThreshold:
      Number.isFinite(v.volumeThreshold) &&
      v.volumeThreshold! >= 0.1 &&
      v.volumeThreshold! <= 50
        ? v.volumeThreshold!
        : 2,
    window: ["24h", "7d", "30d"].includes(v.window || "") ? v.window! : "24h",
    categories: Array.isArray(v.categories)
      ? v.categories.filter((c) => categories.includes(c))
      : [...categories],
  };
}
export function classify(text: string): Category {
  const rules: [Category, RegExp][] = [
    [
      "unclassified",
      /compliance certificate|trading window|loss of share|duplicate share|esop allotment/i,
    ],
    [
      "management_change",
      /resign|chief financial|chief executive|\bCFO\b|\bCEO\b|change in management|change in director|appointment.*director/i,
    ],
    [
      "litigation",
      /litigation|penalt|lawsuit|regulatory order|insolvency|fine imposed/i,
    ],
    ["M&A", /acquisition|acquire|merger|demerger|joint venture/i],
    [
      "results",
      /financial result|financial highlight|quarterly result|audited result|unaudited|revenue|profit after tax/i,
    ],
    ["credit_rating", /credit rating|rating.*reaffirm|rating.*downgrade/i],
    [
      "fund_raise",
      /fund rais|qip|rights issue|buyback|commercial paper|preferential allotment/i,
    ],
    ["earnings_call", /transcript|earnings call|concall|conference call/i],
    [
      "investor_meetings",
      /investor meet|analyst|presentation|investor conference/i,
    ],
    ["dividend", /dividend/i],
    ["bonus_split", /bonus issue|stock split|sub.division/i],
    ["capex", /capacity expansion|new plant|capital expenditure|capex/i],
    ["pledging", /pledge|pledging/i],
    ["insider_trading", /insider|promoter.*(buy|sell|disposal)/i],
    ["postal_ballot", /postal ballot/i],
    [
      "agm_egm",
      /annual general meeting|extraordinary general|\bAGM\b|\bEGM\b/i,
    ],
    ["press_release", /press release|order win|partnership|new product/i],
  ];
  return rules.find(([, re]) => re.test(text))?.[0] ?? "unclassified";
}
export function rank(
  category: Category,
  text: string,
  filedAt: string,
  now = Date.now(),
) {
  const base: Record<Category, number> = {
    results: 68,
    "M&A": 72,
    fund_raise: 60,
    management_change: 62,
    litigation: 68,
    insider_trading: 42,
    earnings_call: 45,
    investor_meetings: 20,
    credit_rating: 46,
    dividend: 40,
    bonus_split: 48,
    capex: 58,
    press_release: 32,
    postal_ballot: 15,
    agm_egm: 12,
    pledging: 55,
    unclassified: 8,
  };
  let score = base[category];
  const why: string[] = [
    `${category.replaceAll("_", " ")} filing in your watchlist`,
  ];
  if (
    /\bCFO\b|\bCEO\b|chief financial|chief executive|default|downgrad|insolvency|fraud/i.test(
      text,
    )
  ) {
    score += 20;
    why.push("leadership or financial-risk indicator");
  }
  if (
    /notice|intimation|schedule|board meeting|newspaper|reaffirm|record date|certificate/i.test(
      text,
    )
  ) {
    score -= 28;
    why.push("notice or routine update, not a reported outcome");
  }
  const hours = (now - Date.parse(filedAt)) / 36e5;
  if (hours >= 0 && hours <= 24) score += 8;
  else if (hours > 168) score -= 10;
  score = Math.max(0, Math.min(100, score));
  return {
    score,
    priority: (score >= 65
      ? "High"
      : score >= 35
        ? "Medium"
        : "Routine") as Filing["priority"],
    explanation: `${why.join("; ")}. Rule-based attention score, not a prediction of price impact.`,
  };
}
export function inWindow(
  date: string,
  window: string,
  now = Date.now(),
  start?: string,
  end?: string,
) {
  const t = Date.parse(date);
  const from =
    window === "custom"
      ? Date.parse(`${start}T00:00:00+05:30`)
      : now - ({ "24h": 1, "7d": 7, "30d": 30 }[window] ?? 1) * 864e5;
  const to = window === "custom" ? Date.parse(`${end}T23:59:59+05:30`) : now;
  return Number.isFinite(t) && t >= from && t <= to;
}
export function deduplicate(items: Filing[]) {
  const seen = new Set<string>();
  return items.filter((i) => {
    const urlKey = `${i.ticker}|${i.documentUrl.split("?")[0]}`;
    const normalized = i.title.toLowerCase().replace(/[^a-z0-9]/g, "");
    const textKey = `${i.ticker}|${i.category}|${i.filedAt.slice(0, 10)}|${normalized}`;
    if (seen.has(urlKey) || (normalized.length > 30 && seen.has(textKey)))
      return false;
    seen.add(urlKey);
    seen.add(textKey);
    return true;
  });
}
export function retrieve(chunks: Chunk[], query: string, limit = 4) {
  const words = [
    ...new Set(query.toLowerCase().match(/[a-z]{3,}/g) || []),
  ].filter(
    (w) =>
      ![
        "the",
        "and",
        "what",
        "does",
        "how",
        "for",
        "with",
        "company",
        "about",
      ].includes(w),
  );
  return chunks
    .map((c) => ({
      c,
      score: words.reduce(
        (s, w) => s + (c.text.toLowerCase().includes(w) ? 1 : 0),
        0,
      ),
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.c);
}
export function validateCitations(ids: string[], chunks: Chunk[]) {
  return ids.length > 0 && ids.every((id) => chunks.some((c) => c.id === id));
}
export function compareGuidance(
  low: number,
  high: number,
  actual: number | null,
  comparable = true,
  due = true,
) {
  if (!due) return { status: "Not yet due", variance: null };
  if (!comparable) return { status: "Not comparable", variance: null };
  if (
    actual === null ||
    ![low, high, actual].every(Number.isFinite) ||
    low > high
  )
    return { status: "Insufficient evidence", variance: null };
  return {
    status: actual >= low ? "Met" : "Missed",
    variance: actual < low ? actual - low : actual > high ? actual - high : 0,
  };
}
