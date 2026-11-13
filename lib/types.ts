export type DataStatus = "fetched" | "cached" | "unavailable";
export type Company = {
  ticker: string;
  name: string;
  isin?: string;
  sector?: string;
};
export type Bar = { date: string; close: number; volume: number | null };
export type Quote = {
  ticker: string;
  name: string;
  close: number | null;
  change: number | null;
  volume: number | null;
  averageVolume: number | null;
  relativeVolume: number | null;
  asOf: string | null;
  fetchedAt: string;
  status: DataStatus;
  sourceUrl: string;
  bars: Bar[];
  error?: string;
};
export const categories = [
  "results",
  "M&A",
  "fund_raise",
  "management_change",
  "litigation",
  "insider_trading",
  "earnings_call",
  "investor_meetings",
  "credit_rating",
  "dividend",
  "bonus_split",
  "capex",
  "press_release",
  "postal_ballot",
  "agm_egm",
  "pledging",
  "unclassified",
] as const;
export type Category = (typeof categories)[number];
export type Filing = {
  id: string;
  ticker: string;
  companyName: string;
  title: string;
  summary: string;
  category: Category;
  filedAt: string;
  fetchedAt: string;
  sourceUrl: string;
  documentUrl: string;
  source: "NSE" | "BSE" | "Company IR";
  status: DataStatus;
  score: number;
  priority: "High" | "Medium" | "Routine";
  explanation: string;
};
export type Settings = {
  priceThreshold: number;
  volumeThreshold: number;
  window: string;
  categories: Category[];
};
export type Source = {
  id: string;
  title: string;
  url: string;
  period: string;
  date: string;
  fetchedAt: string;
  method: string;
};
export type Chunk = {
  id: string;
  sourceId: string;
  page: number | null;
  text: string;
  section?: string;
};
export type Fact = {
  label: string;
  value: number;
  unit: string;
  period: string;
  basis: string;
  sourceId: string;
  page: number;
  previous?: number;
  previousPeriod?: string;
};
export type Research = {
  ticker: string;
  name: string;
  status: DataStatus;
  sources: Source[];
  chunks: Chunk[];
  facts: Fact[];
  sections: Record<string, Chunk[]>;
  warnings: string[];
  generatedAt: string;
  mode: "extractive" | "llm";
  answer?: string;
  answerCitations?: string[];
};
