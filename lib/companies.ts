import directory from "../data/symbols.json";
import { validTicker, sectors } from "./domain";
import type { Company } from "./types";
export const companies: Company[] = directory.companies.map((c) => ({
  ...c,
  sector: sectors[c.ticker] || "NSE listed equity",
}));
export function company(ticker: string) {
  if (!validTicker(ticker)) throw new Error("Enter a valid NSE equity ticker");
  const c = companies.find((c) => c.ticker === ticker);
  if (!c)
    throw new Error("Ticker is not in the supported NSE equity directory");
  return c;
}
export function searchCompanies(q: string) {
  const s = q.trim().toUpperCase().slice(0, 60);
  return companies
    .filter((c) => c.ticker.includes(s) || c.name.toUpperCase().includes(s))
    .sort(
      (a, b) =>
        Number(b.ticker === s) - Number(a.ticker === s) ||
        Number(b.ticker.startsWith(s)) - Number(a.ticker.startsWith(s)),
    )
    .slice(0, 12);
}
