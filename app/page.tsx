import App from "./finn-app";
import snapshot from "@/data/market-cache.json";
import nse from "@/data/nse-cache.json";
import bse from "@/data/bse-cache.json";
import { parseChart } from "@/lib/market";
import { parseFeed } from "@/lib/announcements";
import { defaultPortfolio, deduplicate } from "@/lib/domain";
import { cachedResearch } from "@/lib/research";
export default function Page() {
  const quotes = defaultPortfolio.flatMap((t) => {
    try {
      const s = snapshot[t as keyof typeof snapshot];
      return [parseChart(t, s.result, s.fetchedAt, "cached")];
    } catch {
      return [];
    }
  });
  return (
    <App
      initialQuotes={quotes}
      initialFilings={deduplicate([
        ...parseFeed(nse.xml, "NSE", nse.fetchedAt, "cached"),
        ...parseFeed(bse.xml, "BSE", bse.fetchedAt, "cached"),
      ])}
      initialResearch={cachedResearch("INFY")!}
    />
  );
}
