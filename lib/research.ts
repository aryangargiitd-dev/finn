import evidence from "../data/primary-evidence.json";
import { company } from "./companies";
import { getAnnouncements } from "./announcements";
import { boundedFetch, cached, textFetch } from "./http";
import { retrieve, validateCitations } from "./domain";
import type { Research, Source, Chunk, Fact } from "./types";
export const primaryHosts = [
  "nsearchives.nseindia.com",
  "archives.nseindia.com",
  "www.bseindia.com",
  "www.infosys.com",
  "investors.coforge.com",
  "www.coforge.com",
  "www.tcs.com",
  "www.hcltech.com",
  "itcportal.com",
  "www.itcportal.com",
];
const sections = {
  Overview: "business segments products services revenue mix",
  Financials: "revenue profit margin consolidated financial",
  Trajectory: "growth previous year decline increase",
  "Cash quality": "cash flow debt working capital",
  Management: "guidance management expect outlook risks",
};
function sectionChunks(chunks: Chunk[]) {
  return Object.fromEntries(
    Object.entries(sections).map(([section, query]) => [
      section,
      retrieve(chunks, query, 3),
    ]),
  );
}
export function cachedResearch(ticker: string): Research | null {
  const c = evidence.companies[ticker as keyof typeof evidence.companies];
  if (!c) return null;
  const sources: Source[] = evidence.sources
    .filter((s) => s.ticker === ticker)
    .map((s) => ({
      id: s.id,
      title: s.title,
      url: s.url,
      period: s.period,
      date: s.publishedAt || "",
      fetchedAt: s.retrievedAt,
      method: s.retrievalMethod,
    }));
  const chunks: Chunk[] = evidence.chunks
    .filter((c) => sources.some((s) => s.id === c.sourceId))
    .map((c) => ({
      id: c.id,
      sourceId: c.sourceId,
      text: c.text,
      page: c.page,
      section: c.section,
    }));
  const trajectory = c.trajectory;
  const previous = trajectory[0];
  const facts: Fact[] = c.metrics.map((m) => ({
    label: m.label,
    value: m.value,
    unit: m.unit,
    period: m.period,
    basis: c.basis,
    sourceId: m.sourceId,
    page: chunks.find((c) => c.id === m.chunkId)?.page ?? 0,
    ...(m.label === "Revenue"
      ? { previous: previous.revenue, previousPeriod: previous.period }
      : {}),
  }));
  return {
    ticker,
    name: c.name,
    status: "cached",
    sources,
    chunks,
    facts,
    sections: sectionChunks(chunks),
    warnings: [
      "Verified historical FY2025 evidence. These are not the latest financial statements.",
      "Financial cards are reviewed source facts; automatic discovery adds passages, not unverified numbers.",
      ...(ticker === "ITC"
        ? [
            "Continuing PAT excludes the demerger-related discontinued-operation gain. No ITC transcript was retrieved.",
          ]
        : []),
      ...(ticker === "TCS"
        ? [
            "Prior-year adjusted profit is excluded from profit-growth calculations.",
          ]
        : []),
    ],
    generatedAt: new Date().toISOString(),
    mode: "extractive",
  };
}
function stripHtml(s: string) {
  return s
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
export function discoverLinks(html: string) {
  const documentSection = html.indexOf('id="documents"');
  if (documentSection < 0) return [];
  const links: { url: string; title: string }[] = [];
  for (const match of html
    .slice(documentSection)
    .matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    try {
      const url = new URL(
        match[1].replace(/&amp;/g, "&"),
        "https://www.screener.in",
      );
      let title = stripHtml(match[2]);
      const preceding = stripHtml(
        html.slice(
          documentSection + Math.max(0, (match.index || 0) - 160),
          documentSection + (match.index || 0),
        ),
      );
      const directoryDate = preceding
        .match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+20\d{2}/g)
        ?.at(-1);
      if (/transcript/i.test(title) && directoryDate)
        title += ` · ${directoryDate} (directory date)`;
      if (
        primaryHosts.includes(url.hostname) &&
        url.protocol === "https:" &&
        /\.pdf(?:\?|$)/i.test(url.href) &&
        /annual|report|transcript|results|presentation/i.test(title)
      )
        links.push({ url: url.href, title });
    } catch {}
  }
  return [...new Map(links.map((l) => [l.url, l])).values()]
    .sort(
      (a, b) =>
        Number(/transcript/i.test(b.title)) -
        Number(/transcript/i.test(a.title)),
    )
    .slice(0, 4);
}
async function parseDocument(url: string) {
  const { bytes, type } = await boundedFetch(
    url,
    primaryHosts,
    12_000_000,
    12000,
  );
  if (
    !type.includes("pdf") &&
    new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-"
  )
    throw new Error("Primary source did not return a PDF");
  const { getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(bytes, {
    maxImageSize: 1_000_000,
    disableFontFace: true,
  });
  try {
    if (pdf.numPages > 450) throw new Error("Report exceeds 450-page limit");
    const pages: { page: number; text: string }[] = [];
    for (let page = 1; page <= Math.min(pdf.numPages, 45); page++) {
      const content = await (await pdf.getPage(page)).getTextContent();
      const text = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (text.length > 80) pages.push({ page, text });
    }
    return { pages, totalPages: pdf.numPages };
  } finally {
    await pdf.loadingTask.destroy();
  }
}
export async function research(
  ticker: string,
  refresh = false,
): Promise<Research> {
  const c = company(ticker);
  const seed = cachedResearch(ticker);
  if (seed && !refresh) return seed;
  return cached(`research:${ticker}`, 3600e3, async () => {
    const sources: Source[] = [];
    const chunks: Chunk[] = [];
    const warnings: string[] = [];
    let links: { url: string; title: string }[] = [];
    try {
      const html = await textFetch(
        `https://www.screener.in/company/${encodeURIComponent(ticker)}/consolidated/`,
        ["www.screener.in"],
        2_000_000,
      );
      links = discoverLinks(html);
    } catch (e) {
      warnings.push(
        `Document directory unavailable: ${e instanceof Error ? e.message : "fetch failed"}.`,
      );
    }
    if (!links.length) {
      try {
        const feed = await getAnnouncements();
        links = feed.items
          .filter((i) => i.ticker === ticker && /\.pdf/i.test(i.documentUrl))
          .slice(0, 2)
          .map((i) => ({ url: i.documentUrl, title: i.title }));
      } catch {
        warnings.push("Exchange discovery unavailable.");
      }
    }
    for (const [index, link] of links.slice(0, 2).entries()) {
      try {
        const { pages, totalPages } = await parseDocument(link.url);
        const firstText = pages
          .slice(0, 4)
          .map((p) => p.text)
          .join(" ")
          .toLowerCase();
        const identity = c.name
          .toLowerCase()
          .replace(/limited|ltd\.?/g, "")
          .trim()
          .split(/\s+/)
          .filter((w) => w.length >= 3);
        if (
          !firstText.includes(ticker.toLowerCase()) &&
          !identity.some((w) => firstText.includes(w))
        )
          throw new Error(
            "Company identity could not be established in the document",
          );
        const id = `${ticker.toLowerCase()}-retrieved-${index}`;
        sources.push({
          id,
          title: link.title,
          url: link.url,
          period: link.title,
          date: "",
          fetchedAt: new Date().toISOString(),
          method: `Downloaded and parsed original PDF; first ${pages.length} text pages of ${totalPages}`,
        });
        for (const p of pages)
          for (
            let start = 0;
            start < p.text.length && start < 12000;
            start += 1600
          ) {
            const text = p.text.slice(start, start + 1800);
            if (text.length < 100) continue;
            chunks.push({
              id: `${id}-p${p.page}-${start}`,
              sourceId: id,
              page: p.page,
              text,
            });
          }
        if (totalPages > 45)
          warnings.push(
            `${link.title}: first 45 pages indexed; deeper statements may not be covered.`,
          );
      } catch (e) {
        warnings.push(
          `${link.title}: ${e instanceof Error ? e.message : "retrieval failed"}`,
        );
      }
    }
    if (!chunks.length) {
      if (seed)
        return {
          ...seed,
          warnings: [
            ...seed.warnings,
            ...warnings,
            "Refresh found no usable new documents; historical evidence remains visible.",
          ],
        };
      return {
        ticker,
        name: c.name,
        status: "unavailable",
        sources: [],
        chunks: [],
        facts: [],
        sections: {},
        warnings: [
          ...warnings,
          "Insufficient primary-source evidence. Try again later; no company claims were generated.",
        ],
        generatedAt: new Date().toISOString(),
        mode: "extractive",
      };
    }
    return {
      ticker,
      name: c.name,
      status: "fetched",
      sources,
      chunks,
      facts: [],
      sections: sectionChunks(chunks),
      warnings: [
        ...warnings,
        "Extractive passages from newly retrieved primary documents. Financial cards are withheld until figures and reporting bases can be verified.",
      ],
      generatedAt: new Date().toISOString(),
      mode: "extractive",
    };
  });
}
export async function answerQuestion(
  r: Research,
  question: string,
): Promise<Research> {
  const chunks = retrieve(r.chunks, question, 5);
  if (!chunks.length)
    return {
      ...r,
      answer: "Insufficient primary-source evidence.",
      answerCitations: [],
    };
  const fallback = {
    ...r,
    answer:
      "Relevant primary-source evidence is shown below. Extractive retrieval; no model interpretation.",
    answerCitations: chunks.map((c) => c.id),
  };
  if (!process.env.LLM_API_KEY) return fallback;
  try {
    const { generateGrounded } = await import("./llm");
    const answer = await generateGrounded(question, chunks);
    if (!validateCitations(answer.citations, chunks))
      throw new Error("Invalid evidence references");
    return {
      ...r,
      answer: answer.text,
      answerCitations: answer.citations,
      mode: "llm",
    };
  } catch {
    return {
      ...fallback,
      warnings: [
        ...r.warnings,
        "Model unavailable or response failed citation validation; showing retrieved evidence.",
      ],
    };
  }
}
