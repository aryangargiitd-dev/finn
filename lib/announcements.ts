import { XMLParser } from "fast-xml-parser";
import nseCache from "../data/nse-cache.json";
import bseCache from "../data/bse-cache.json";
import { companies } from "./companies";
import { classify, deduplicate, rank } from "./domain";
import { cached, textFetch, safeLink } from "./http";
import type { Filing } from "./types";
const endpoints = {
  NSE: "https://nsearchives.nseindia.com/content/RSS/Online_announcements.xml",
  BSE: "https://www.bseindia.com/data/xml/announcements.xml",
};
const normalize = (s: string) =>
  s
    .toLowerCase()
    .replace(/\([^)]*\)/g, "")
    .replace(/limited|\bltd\b|[^a-z0-9]/g, "");
const names = new Map(companies.map((c) => [normalize(c.name), c]));
export function exchangeDate(s: string) {
  const match = s.match(/^(\d{2})-([A-Za-z]{3})-(\d{4}) (\d{2}:\d{2}:\d{2})$/);
  if (match) {
    const month =
      [
        "jan",
        "feb",
        "mar",
        "apr",
        "may",
        "jun",
        "jul",
        "aug",
        "sep",
        "oct",
        "nov",
        "dec",
      ].indexOf(match[2].toLowerCase()) + 1;
    return new Date(
      `${match[3]}-${String(month).padStart(2, "0")}-${match[1]}T${match[4]}+05:30`,
    ).toISOString();
  }
  const d = new Date(s);
  if (!Number.isFinite(d.getTime()))
    throw new Error("Invalid filing timestamp");
  return d.toISOString();
}
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++)
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(16);
}
export function parseFeed(
  xml: string,
  source: "NSE" | "BSE",
  fetchedAt: string,
  status: Filing["status"],
): Filing[] {
  const parsed = new XMLParser({
    ignoreAttributes: true,
    processEntities: true,
  }).parse(xml);
  let items = parsed?.rss?.channel?.item || [];
  if (!Array.isArray(items)) items = [items];
  return items.flatMap((item: Record<string, unknown>) => {
    try {
      const title = String(item.title || "");
      const summary = String(item.description || "")
        .replace(/<[^>]*>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      const link = safeLink(String(item.link || ""));
      if (
        !link ||
        ![
          "nsearchives.nseindia.com",
          "archives.nseindia.com",
          "www.bseindia.com",
        ].includes(new URL(link).hostname)
      )
        return [];
      const c = names.get(normalize(title));
      if (!c) return [];
      const category = classify(summary);
      const filedAt = exchangeDate(String(item.pubDate));
      return [
        {
          id: `${source}-${hash(c.ticker + link)}`,
          ticker: c.ticker,
          companyName: c.name,
          title: summary
            .split("|SUBJECT:")[0]
            .replace(
              new RegExp(
                `^${c.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} has informed the Exchange (regarding|about)\\s*`,
                "i",
              ),
              "",
            )
            .slice(0, 210),
          summary: summary.slice(0, 450),
          category,
          filedAt,
          fetchedAt,
          sourceUrl: link,
          documentUrl: link,
          source,
          status,
          ...rank(category, summary, filedAt),
        },
      ];
    } catch {
      return [];
    }
  });
}
export async function getAnnouncements() {
  return cached("filings", 5 * 60e3, async () => {
    const feeds = await Promise.all(
      (["NSE", "BSE"] as const).map(async (source) => {
        const previous = source === "NSE" ? nseCache : bseCache;
        try {
          const xml = await textFetch(
            endpoints[source],
            [new URL(endpoints[source]).hostname],
            3_000_000,
          );
          return {
            source,
            status: "fetched",
            fetchedAt: new Date().toISOString(),
            items: deduplicate([
              ...parseFeed(xml, source, new Date().toISOString(), "fetched"),
              ...parseFeed(previous.xml, source, previous.fetchedAt, "cached"),
            ]),
            error: null,
          };
        } catch (e) {
          return {
            source,
            status: "cached",
            fetchedAt: previous.fetchedAt,
            items: parseFeed(
              previous.xml,
              source,
              previous.fetchedAt,
              "cached",
            ),
            error: e instanceof Error ? e.message : "Feed unavailable",
          };
        }
      }),
    );
    return {
      items: deduplicate(feeds.flatMap((f) => f.items)).sort(
        (a, b) =>
          b.score - a.score || Date.parse(b.filedAt) - Date.parse(a.filedAt),
      ),
      feeds: feeds.map(({ items, ...rest }) => ({
        ...rest,
        count: items.length,
      })),
      coverage:
        "Public RSS feeds are rolling, incomplete windows. A zero count does not establish absence of filings. Cached records retain their original dates.",
    };
  });
}
