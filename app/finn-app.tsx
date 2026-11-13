"use client";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowDown,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bell,
  BookOpen,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Clock,
  ExternalLink,
  FileText,
  Filter,
  Info,
  LayoutGrid,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  Trash2,
  X,
} from "lucide-react";
import {
  categories,
  type Company,
  type Filing,
  type Quote,
  type Research,
  type Settings,
  type Source,
  type Chunk,
} from "@/lib/types";
import {
  defaultPortfolio,
  defaultSettings,
  normalizeSettings,
  sectors,
  thresholds,
  inWindow,
  percentChange,
  compareGuidance,
} from "@/lib/domain";
import evidence from "@/data/primary-evidence.json";
type Tab = "Pulse" | "Research" | "Alerts" | "Settings";
const nav = [
  { name: "Pulse" as Tab, icon: Activity },
  { name: "Research" as Tab, icon: BookOpen },
  { name: "Alerts" as Tab, icon: Bell },
  { name: "Settings" as Tab, icon: Settings2 },
];
const number = (n: number | null, d = 2) =>
  n === null
    ? "—"
    : new Intl.NumberFormat("en-IN", {
        maximumFractionDigits: d,
        minimumFractionDigits: d,
      }).format(n);
const compact = (n: number | null) =>
  n === null
    ? "—"
    : new Intl.NumberFormat("en-IN", {
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(n);
const date = (s: string, withTime = false) =>
  s
    ? new Date(s).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        timeZone: "Asia/Kolkata",
        ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
      })
    : "Not disclosed";
const label = (s: string) =>
  s.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
async function api<T>(url: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 75000);
  try {
    const r = await fetch(url, { ...options, signal: controller.signal });
    const j = (await r.json()) as T & { error?: string };
    if (!r.ok) throw new Error(j.error || "Request failed");
    return j;
  } finally {
    clearTimeout(timer);
  }
}
function SourceLink({
  source,
  page,
  text,
}: {
  source?: Source;
  page?: number | null;
  text?: string;
}) {
  if (!source) return null;
  return (
    <a
      className="source-link"
      href={`${source.url}${page ? `#page=${page}` : ""}`}
      target="_blank"
      rel="noreferrer"
    >
      <FileText size={12} />
      {text || source.title}
      {page ? ` · p. ${page}` : ""}
      <ArrowUpRight size={12} />
    </a>
  );
}
function Sparkline({
  bars,
  large = false,
}: {
  bars: Quote["bars"];
  large?: boolean;
}) {
  if (bars.length < 2) return <span className="muted">No history</span>;
  const values = bars.map((b) => b.close);
  const min = Math.min(...values),
    max = Math.max(...values);
  const points = values
    .map(
      (v, i) =>
        `${(i / (values.length - 1)) * 300},${85 - ((v - min) / (max - min || 1)) * 70}`,
    )
    .join(" ");
  return (
    <svg
      className={large ? "price-chart" : "sparkline"}
      viewBox="0 0 300 100"
      role="img"
      aria-label={`Closing prices from ${bars[0].date} to ${bars.at(-1)?.date}`}
    >
      <polyline
        points={points}
        fill="none"
        stroke={values.at(-1)! >= values[0] ? "#30715a" : "#ad665b"}
        strokeWidth={large ? 2 : 4}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
function Empty({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty-icon">
        <FileText size={24} />
      </div>
      <h3>{title}</h3>
      <p>{children}</p>
    </div>
  );
}
export default function App({
  initialQuotes,
  initialFilings,
  initialResearch,
}: {
  initialQuotes: Quote[];
  initialFilings: Filing[];
  initialResearch: Research;
}) {
  const [tab, setTab] = useState<Tab>("Pulse");
  const [portfolio, setPortfolio] = useState(defaultPortfolio);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [ready, setReady] = useState(false);
  const [quotes, setQuotes] = useState(initialQuotes);
  const [filings, setFilings] = useState(initialFilings);
  const [window, setWindow] = useState("24h");
  const [custom, setCustom] = useState({ start: "", end: "" });
  const [priority, setPriority] = useState("All priorities");
  const [companyFilter, setCompanyFilter] = useState("All companies");
  const [routine, setRoutine] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [feedStatus, setFeedStatus] = useState(
    "Saved public-feed snapshot. Refresh to check availability.",
  );
  const [toast, setToast] = useState("");
  const [drawer, setDrawer] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchMode, setSearchMode] = useState<"add" | "research">("add");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Company[]>([]);
  const [searchBusy, setSearchBusy] = useState(false);
  const [selected, setSelected] = useState("INFY");
  const [research, setResearch] = useState<Research>(initialResearch);
  const [researchBusy, setResearchBusy] = useState(false);
  const [researchSection, setResearchSection] = useState("Overview");
  const [question, setQuestion] = useState("");
  const [answerBusy, setAnswerBusy] = useState(false);
  const [read, setRead] = useState<string[]>([]);
  const [settingsDraft, setSettingsDraft] = useState<Settings>(defaultSettings);
  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem("finn.portfolio") || "null");
      if (
        Array.isArray(p) &&
        p.length &&
        p.length <= 25 &&
        p.every((x) => typeof x === "string" && /^[A-Z0-9&-]+$/.test(x))
      )
        setPortfolio(p);
      const s = normalizeSettings(
        JSON.parse(localStorage.getItem("finn.settings") || "{}"),
      );
      setSettings(s);
      setSettingsDraft(s);
      setWindow(s.window);
      const seen = JSON.parse(localStorage.getItem("finn.read") || "[]");
      if (Array.isArray(seen)) setRead(seen);
    } catch {
      setToast("Saved preferences could not be read. Defaults restored.");
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready)
      try {
        localStorage.setItem("finn.portfolio", JSON.stringify(portfolio));
        localStorage.setItem("finn.settings", JSON.stringify(settings));
        localStorage.setItem("finn.read", JSON.stringify(read));
      } catch {
        setError(
          "Browser storage unavailable; changes last only for this session.",
        );
      }
  }, [portfolio, settings, read, ready]);
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(""), 4500);
      return () => clearTimeout(t);
    }
  }, [toast]);
  useEffect(() => {
    if (!searchOpen) return;
    const timer = setTimeout(async () => {
      setSearchBusy(true);
      try {
        const data = await api<{ companies: Company[] }>(
          `/api/search?q=${encodeURIComponent(query)}`,
        );
        setResults(data.companies);
      } catch {
        setResults([]);
      } finally {
        setSearchBusy(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [query, searchOpen]);
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    setLoading(true);
    Promise.allSettled([
      api<{ quotes: Quote[] }>(`/api/market?tickers=${portfolio.join(",")}`),
      api<{
        items: Filing[];
        feeds: { source: string; status: string; error: string | null }[];
      }>(`/api/announcements?tickers=${portfolio.join(",")}&window=30d`),
    ]).then(([m, f]) => {
      if (cancelled) return;
      if (m.status === "fulfilled") setQuotes(m.value.quotes);
      if (f.status === "fulfilled") {
        setFilings(f.value.items);
        setFeedStatus(
          f.value.feeds
            .map(
              (x) =>
                `${x.source}: ${x.status === "fetched" ? "retrieved" : "cached"}${x.error ? " · source unavailable" : ""}`,
            )
            .join(" / "),
        );
      }
      if (m.status === "rejected" || f.status === "rejected")
        setError(
          "Some sources could not refresh. Saved observations retain their original dates.",
        );
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [ready, portfolio]);
  const ownedQuotes = quotes.filter((q) => portfolio.includes(q.ticker));
  const allRelevant = filings.filter(
    (f) =>
      portfolio.includes(f.ticker) && settings.categories.includes(f.category),
  );
  const filtered = allRelevant
    .filter(
      (f) =>
        inWindow(f.filedAt, window, Date.now(), custom.start, custom.end) &&
        (companyFilter === "All companies" || f.ticker === companyFilter) &&
        (priority === "All priorities" || f.priority === priority),
    )
    .sort(
      (a, b) =>
        b.score - a.score || Date.parse(b.filedAt) - Date.parse(a.filedAt),
    );
  const high = filtered.filter((f) => f.priority === "High");
  const mainFilings = filtered.filter((f) => f.priority !== "Routine");
  const routineFilings = filtered.filter((f) => f.priority === "Routine");
  const anomalies = ownedQuotes.filter((q) => {
    const t = thresholds(q, settings);
    return t.price || t.volume;
  });
  const alerts = useMemo(
    () => [
      ...allRelevant
        .filter(
          (f) => f.priority === "High" && inWindow(f.filedAt, settings.window),
        )
        .map((f) => ({
          id: f.id,
          ticker: f.ticker,
          title: f.title,
          detail: f.explanation,
          date: f.filedAt,
          type: "Filing",
          url: f.sourceUrl,
        })),
      ...anomalies.map((q) => ({
        id: `${q.ticker}:${q.asOf}:${settings.priceThreshold}:${settings.volumeThreshold}`,
        ticker: q.ticker,
        title: `${thresholds(q, settings).price ? "Price threshold crossed" : "Unusual trading volume"}`,
        detail: `EOD change ${number(q.change)}% · relative volume ${number(q.relativeVolume)}×. Session ${q.asOf}. ${q.status === "cached" ? "Cached observation." : ""}`,
        date: q.asOf || "",
        type: "Market",
        url: q.sourceUrl,
      })),
    ],
    [allRelevant, anomalies, settings],
  );
  const unread = alerts.filter((a) => !read.includes(a.id)).length;
  const selectedQuote = quotes.find((q) => q.ticker === drawer);
  const nowLabel = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  });
  function openSearch(mode: "add" | "research") {
    setSearchMode(mode);
    setQuery("");
    setResults([]);
    setSearchOpen(true);
  }
  async function choose(c: Company) {
    if (searchMode === "add") {
      if (portfolio.includes(c.ticker)) {
        setToast("Already in your watchlist");
        return;
      }
      if (portfolio.length >= 25) {
        setToast("This prototype supports up to 25 holdings.");
        return;
      }
      setSearchBusy(true);
      try {
        const data = await api<{ quotes: Quote[] }>(
          `/api/market?tickers=${c.ticker}`,
        );
        if (data.quotes[0]?.status === "unavailable")
          throw new Error(
            "No provider-validated price history. Ticker was not added.",
          );
        setQuotes((q) => [...q, ...data.quotes]);
        setPortfolio((p) => [...p, c.ticker]);
        setSearchOpen(false);
        setToast(`${c.ticker} added to your watchlist`);
      } catch (e) {
        setToast(e instanceof Error ? e.message : "Could not validate ticker");
      } finally {
        setSearchBusy(false);
      }
    } else {
      setSearchOpen(false);
      setTab("Research");
      runResearch(c.ticker);
    }
  }
  async function runResearch(ticker: string, refresh = false) {
    setSelected(ticker);
    setResearchBusy(true);
    setError("");
    setResearchSection("Overview");
    try {
      setResearch(
        await api<Research>(
          `/api/research?ticker=${ticker}${refresh ? "&refresh=1" : ""}`,
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Research unavailable");
    } finally {
      setResearchBusy(false);
    }
  }
  async function refreshAll() {
    setLoading(true);
    setError("");
    try {
      const [m, f] = await Promise.all([
        api<{ quotes: Quote[] }>(`/api/market?tickers=${portfolio.join(",")}`),
        api<{ items: Filing[]; feeds: { source: string; status: string }[] }>(
          `/api/announcements?tickers=${portfolio.join(",")}&window=${window === "custom" ? "custom" : "30d"}&start=${custom.start}&end=${custom.end}`,
        ),
      ]);
      setQuotes(m.quotes);
      setFilings(f.items);
      setFeedStatus(f.feeds.map((x) => `${x.source}: ${x.status}`).join(" / "));
      setToast("Sources checked. Freshness labels reflect each observation.");
    } catch {
      setError("Refresh failed. Previously retrieved data remains visible.");
    } finally {
      setLoading(false);
    }
  }
  async function ask(e: React.FormEvent) {
    e.preventDefault();
    if (question.trim().length < 3) return;
    setAnswerBusy(true);
    try {
      setResearch(
        await api<Research>("/api/research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ticker: research.ticker,
            question,
            useLive: research.status === "fetched",
          }),
        }),
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Question could not be answered",
      );
    } finally {
      setAnswerBusy(false);
    }
  }
  function renderFiling(f: Filing) {
    return (
      <article className="filing" key={f.id}>
        <div className={`filing-icon ${f.priority.toLowerCase()}`}>
          <FileText size={20} />
        </div>
        <div className="filing-body">
          <div className="filing-meta">
            <button className="ticker-link" onClick={() => setDrawer(f.ticker)}>
              {f.ticker}
            </button>
            <span>{label(f.category)}</span>
            <span className="filing-date">{date(f.filedAt, true)} IST</span>
          </div>
          <h3>{f.title}</h3>
          <div className="filing-bottom">
            <span className={`priority ${f.priority.toLowerCase()}`}>
              <i />
              {f.priority === "Routine" ? "Routine" : `${f.priority} priority`}
            </span>
            <a href={f.sourceUrl} target="_blank" rel="noreferrer">
              {f.source} filing <ArrowUpRight size={13} />
            </a>
            <span className="data-state">
              {f.status === "cached" ? "Cached" : "Retrieved"}
            </span>
          </div>
          <details>
            <summary>
              Why it matters <ChevronDown size={13} />
            </summary>
            <p>{f.explanation}</p>
            <p className="muted">Reported filing description: {f.summary}</p>
            <span className="small muted">
              Attention score {f.score}/100 · retrieved{" "}
              {date(f.fetchedAt, true)} IST
            </span>
          </details>
        </div>
      </article>
    );
  }
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            setTab("Pulse");
          }}
        >
          <span className="brand-mark">f</span>finn
          <span className="brand-dot">.</span>
        </a>
        <div className="workspace-label">YOUR INVESTMENT DESK</div>
        <nav aria-label="Primary navigation">
          {nav.map(({ name, icon: Icon }) => (
            <button
              key={name}
              className={tab === name ? "active" : ""}
              onClick={() => {
                setTab(name);
                setError("");
              }}
            >
              <Icon size={19} />
              <span>{name}</span>
              {name === "Alerts" && unread > 0 && <b>{unread}</b>}
              {tab === name && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <span className="eyebrow">LESS NOISE. MORE SIGNAL.</span>
          <p>Investment judgment starts with better evidence.</p>
          <div>
            <ShieldCheck size={16} /> Primary sources. Always.
          </div>
        </div>
        <div className="profile">
          <span>AG</span>
          <div>
            <strong>Personal workspace</strong>
            <small>Research edition</small>
          </div>
          <span className="profile-dot" />
        </div>
      </aside>
      <main>
        <header className="topbar">
          <div>
            <span className="breadcrumb">Workspace</span>
            <ChevronRight size={13} />
            <strong>{tab}</strong>
          </div>
          <div className="top-actions">
            <span className="eod-pill">
              <i /> EOD MONITORING
            </span>
            <button
              className="icon-button"
              aria-label="Search companies"
              onClick={() => openSearch("research")}
            >
              <Search size={19} />
            </button>
            <button
              className="icon-button notification"
              aria-label={`Open alerts, ${unread} unread`}
              onClick={() => setTab("Alerts")}
            >
              <Bell size={19} />
              {unread > 0 && <i />}
            </button>
          </div>
        </header>
        <div className="page-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {tab === "Pulse"
                  ? nowLabel
                  : tab === "Research"
                    ? "THE PRIMARY-SOURCE RESEARCH DESK"
                    : tab === "Alerts"
                      ? "YOUR ATTENTION, WELL ALLOCATED"
                      : "MAKE THE SIGNAL YOURS"}
              </div>
              <h1>
                {tab === "Pulse"
                  ? "Your portfolio, in focus."
                  : tab === "Research"
                    ? "Go beyond the headline."
                    : tab === "Alerts"
                      ? "What needs your attention."
                      : "A quieter kind of intelligence."}
              </h1>
              <p>
                {tab === "Pulse"
                  ? "The changes worth your time. The evidence behind them."
                  : tab === "Research"
                    ? "Follow the evidence from company disclosure to investment insight."
                    : tab === "Alerts"
                      ? "Thresholds you set. Changes you can trace."
                      : "Decide what matters. FINN keeps the rest in the background."}
              </p>
            </div>
            {tab === "Pulse" && (
              <button
                className="button secondary refresh"
                onClick={refreshAll}
                disabled={loading}
              >
                <RefreshCw size={15} className={loading ? "spin" : ""} />
                {loading ? "Checking sources" : "Refresh data"}
              </button>
            )}
          </div>
          {error && (
            <div role="alert" className="notice error">
              <Info size={16} />
              <span>{error}</span>
              <button aria-label="Dismiss error" onClick={() => setError("")}>
                <X size={14} />
              </button>
            </div>
          )}
          {tab === "Pulse" && (
            <>
              <section className="pulse-overview">
                <div className="brief">
                  <div className="eyebrow">
                    <span className="live-dot" /> THE{" "}
                    {window === "24h"
                      ? "24-HOUR"
                      : window === "7d"
                        ? "7-DAY"
                        : window === "30d"
                          ? "30-DAY"
                          : "CUSTOM"}{" "}
                    BRIEF
                  </div>
                  <h2>
                    {high.length
                      ? `${high.length} development${high.length > 1 ? "s" : ""} to look at closely.`
                      : "A clear view of what changed."}
                  </h2>
                  <p>
                    {high.length
                      ? `${filtered.length} retrieved filings in your selected window. Material developments appear first; routine disclosures stay out of the way.`
                      : `${filtered.length} retrieved filings in this window. ${anomalies.length} EOD threshold breach${anomalies.length !== 1 ? "es" : ""} across your watchlist.`}
                  </p>
                  <div className="brief-footer">
                    <ShieldCheck size={15} />
                    <span>Evidence linked. Priority explained.</span>
                    <span className="brief-arrow">
                      <ArrowDownRight size={24} />
                    </span>
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-title">
                    Your watchlist <LayoutGrid size={17} />
                  </div>
                  <strong>
                    {portfolio.length}
                    <span>companies</span>
                  </strong>
                  <div className="stat-foot">
                    {new Set(portfolio.map((t) => sectors[t] || "Other")).size}{" "}
                    sectors · mock portfolio
                  </div>
                </div>
                <div className="stat-card">
                  <div className="stat-title">
                    Market signals <Activity size={17} />
                  </div>
                  <strong>
                    {anomalies.length}
                    <span>EOD anomalies</span>
                  </strong>
                  <button
                    className="text-button"
                    onClick={() => setTab("Alerts")}
                  >
                    Inspect signals <ArrowRight size={14} />
                  </button>
                </div>
              </section>
              <div className="pulse-grid">
                <section className="panel feed-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>
                        Portfolio intelligence{" "}
                        <span className="count">{filtered.length}</span>
                      </h2>
                      <p>Ranked by significance, not just recency.</p>
                    </div>
                    <Filter size={17} />
                  </div>
                  <div className="feed-toolbar">
                    <div className="segmented" aria-label="Time window">
                      {[
                        ["24h", "24 hours"],
                        ["7d", "7 days"],
                        ["30d", "30 days"],
                        ["custom", "Custom"],
                      ].map(([v, t]) => (
                        <button
                          key={v}
                          className={window === v ? "selected" : ""}
                          onClick={() => setWindow(v)}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                    <div className="select-row">
                      <label className="sr-only" htmlFor="priority">
                        Priority
                      </label>
                      <select
                        id="priority"
                        value={priority}
                        onChange={(e) => setPriority(e.target.value)}
                      >
                        {["All priorities", "High", "Medium", "Routine"].map(
                          (p) => (
                            <option key={p}>{p}</option>
                          ),
                        )}
                      </select>
                      <label className="sr-only" htmlFor="company">
                        Company
                      </label>
                      <select
                        id="company"
                        value={companyFilter}
                        onChange={(e) => setCompanyFilter(e.target.value)}
                      >
                        <option>All companies</option>
                        {portfolio.map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    </div>
                    {window === "custom" && (
                      <div className="date-range">
                        <label>
                          From
                          <input
                            type="date"
                            value={custom.start}
                            onChange={(e) =>
                              setCustom({ ...custom, start: e.target.value })
                            }
                          />
                        </label>
                        <label>
                          To
                          <input
                            type="date"
                            value={custom.end}
                            onChange={(e) =>
                              setCustom({ ...custom, end: e.target.value })
                            }
                          />
                        </label>
                        <button
                          className="button secondary"
                          onClick={refreshAll}
                          disabled={
                            !custom.start ||
                            !custom.end ||
                            custom.start > custom.end
                          }
                        >
                          Apply
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="feed-content">
                    {mainFilings.length ? (
                      mainFilings.map(renderFiling)
                    ) : (
                      <Empty
                        title={
                          priority === "Routine"
                            ? "Routine disclosures below"
                            : "No material filings in this window"
                        }
                      >
                        Try a wider time window or another company. Public RSS
                        coverage is partial; this does not confirm that no
                        filings exist.
                      </Empty>
                    )}
                    {routineFilings.length > 0 && (
                      <div className="routine-block">
                        <button
                          onClick={() => setRoutine(!routine)}
                          aria-expanded={routine}
                        >
                          <div>
                            <span className="routine-count">
                              {routineFilings.length}
                            </span>
                            Routine disclosures
                            <span className="muted"> · lower attention</span>
                          </div>
                          <ChevronDown
                            size={16}
                            className={routine ? "rotate" : ""}
                          />
                        </button>
                        {routine && routineFilings.map(renderFiling)}
                      </div>
                    )}
                  </div>
                  <div className="panel-foot">
                    <Clock size={13} />
                    <span>
                      {feedStatus}. Rolling feed; not a complete archive.
                    </span>
                  </div>
                </section>
                <aside className="right-column">
                  <section className="panel watchlist-panel">
                    <div className="panel-heading">
                      <div>
                        <h2>
                          Your watchlist{" "}
                          <span className="count">{portfolio.length}</span>
                        </h2>
                        <p>Latest available closing observations</p>
                      </div>
                      <button
                        className="icon-button framed"
                        aria-label="Add a company"
                        onClick={() => openSearch("add")}
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                    <div className="watchlist-labels">
                      <span>COMPANY</span>
                      <span>CLOSE / CHANGE</span>
                    </div>
                    <div className="watchlist-scroll">
                      {portfolio.map((t) => {
                        const q = ownedQuotes.find((q) => q.ticker === t);
                        return (
                          <button
                            key={t}
                            className="stock-row"
                            onClick={() => setDrawer(t)}
                          >
                            <span className="stock-avatar">
                              {t.slice(0, 2)}
                            </span>
                            <span className="stock-name">
                              <strong>{t}</strong>
                              <small>{sectors[t] || "NSE equity"}</small>
                            </span>
                            <span className="stock-price">
                              <strong>
                                {q?.close != null ? `₹${number(q.close)}` : "—"}
                              </strong>
                              <small
                                className={
                                  (q?.change ?? 0) >= 0
                                    ? "positive"
                                    : "negative"
                                }
                              >
                                {q?.change != null
                                  ? `${q.change >= 0 ? "+" : ""}${number(q.change)}%`
                                  : "Unavailable"}
                              </small>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="watchlist-foot">
                      EOD · INR ·{" "}
                      {ownedQuotes[0]?.asOf
                        ? date(ownedQuotes[0].asOf)
                        : "No completed session"}
                      <br />
                      {
                        ownedQuotes.filter((q) => q.status === "cached").length
                      }{" "}
                      cached /{" "}
                      {ownedQuotes.filter((q) => q.status === "fetched").length}{" "}
                      fetched · no intraday feed
                    </div>
                  </section>
                  <button
                    className="research-promo"
                    onClick={() => {
                      setTab("Research");
                      setResearchSection("Reality Check");
                    }}
                  >
                    <div>
                      <Target size={19} />
                      <span>FINN REALITY CHECK</span>
                      <ArrowUpRight size={17} />
                    </div>
                    <h3>
                      Management said it.
                      <br />
                      Did the numbers follow?
                    </h3>
                    <p>Trace Infosys’s FY25 guidance to the actual result.</p>
                    <span className="promo-link">
                      Explore the evidence <ArrowRight size={14} />
                    </span>
                  </button>
                </aside>
              </div>
            </>
          )}
          {tab === "Research" && (
            <>
              <div className="research-controls">
                <button
                  className="company-search"
                  onClick={() => openSearch("research")}
                >
                  <Search size={18} />
                  <span>Find any supported NSE company</span>
                  <kbd>Search</kbd>
                </button>
                <div className="research-examples">
                  <span>Evidence notebooks</span>
                  {["INFY", "TCS", "HCLTECH", "ITC"].map((t) => (
                    <button
                      key={t}
                      className={selected === t ? "selected" : ""}
                      onClick={() => runResearch(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              {researchBusy ? (
                <div className="research-loading">
                  <RefreshCw className="spin" size={28} />
                  <h3>Following the primary sources</h3>
                  <p>
                    Resolving {selected}, retrieving documents and associating
                    evidence.
                  </p>
                  <p className="muted">
                    Sources may take up to a minute. No figures are generated to
                    fill gaps.
                  </p>
                </div>
              ) : (
                <>
                  <section className="research-banner">
                    <div className="company-monogram">
                      {research.ticker.slice(0, 2)}
                    </div>
                    <div>
                      <div className="eyebrow">
                        NSE: {research.ticker} · SOURCE-GROUNDED RESEARCH
                      </div>
                      <h2>{research.name}</h2>
                      <p>
                        {research.status === "cached"
                          ? "Historical evidence notebook · FY2025"
                          : research.status === "fetched"
                            ? "Newly retrieved primary documents"
                            : "Evidence unavailable"}{" "}
                        <span>· {research.sources.length} sources</span>
                      </p>
                    </div>
                    <button
                      className="button secondary"
                      onClick={() => runResearch(research.ticker, true)}
                    >
                      <RefreshCw size={14} />
                      Discover primary documents
                    </button>
                  </section>
                  <div className="notice">
                    <ShieldCheck size={16} />
                    <span>
                      {research.mode === "llm"
                        ? "AI synthesis with source references. Verify interpretations against the passages."
                        : "Evidence retrieval + deterministic calculations. No LLM key required."}{" "}
                      {research.status === "cached" &&
                        "FY2025 is historical, not current."}
                    </span>
                  </div>
                  <div
                    className="research-tabs"
                    role="tablist"
                    aria-label="Research sections"
                  >
                    {[
                      "Overview",
                      "Financials",
                      "Trajectory",
                      "Cash quality",
                      "Management",
                      "Reality Check",
                      "Sources",
                    ].map((s) => (
                      <button
                        role="tab"
                        aria-selected={researchSection === s}
                        key={s}
                        onClick={() => setResearchSection(s)}
                        className={researchSection === s ? "active" : ""}
                      >
                        {s === "Reality Check" && <Target size={14} />} {s}
                      </button>
                    ))}
                  </div>
                  {researchSection === "Reality Check" ? (
                    <RealityCheck
                      ticker={research.ticker}
                      onChoose={() => {
                        runResearch("INFY").then(() =>
                          setResearchSection("Reality Check"),
                        );
                      }}
                    />
                  ) : researchSection === "Sources" ? (
                    <div className="panel source-panel">
                      <div className="panel-heading">
                        <div>
                          <h2>The evidence ledger</h2>
                          <p>
                            Original documents, retrieval method and provenance.
                          </p>
                        </div>
                        <ShieldCheck size={20} />
                      </div>
                      {research.sources.map((s, i) => (
                        <div className="source-row" key={s.id}>
                          <span className="source-number">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <div>
                            <h3>{s.title}</h3>
                            <p>
                              {s.period} ·{" "}
                              {s.date
                                ? date(s.date)
                                : "Publication date not verified"}
                            </p>
                            <small>
                              {s.method} · retrieved {date(s.fetchedAt)}
                            </small>
                            <SourceLink
                              source={s}
                              text="Open original document"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : researchSection === "Financials" ? (
                    <div className="panel financial-panel">
                      <div className="panel-heading">
                        <div>
                          <h2>Financial snapshot</h2>
                          <p>
                            Reviewed figures with explicit period, unit and
                            reporting basis.
                          </p>
                        </div>
                      </div>
                      {research.facts.length ? (
                        <div className="financial-grid">
                          {research.facts.map((f) => (
                            <div className="financial-card" key={f.label}>
                              <span>{f.label}</span>
                              <strong>
                                {number(f.value, f.value % 1 ? 2 : 0)}
                                {f.unit === "%" ? "%" : ""}
                              </strong>
                              <small>
                                {f.unit} · {f.period}
                              </small>
                              <p>{f.basis}</p>
                              <SourceLink
                                source={research.sources.find(
                                  (s) => s.id === f.sourceId,
                                )}
                                page={f.page}
                                text="Source"
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <Empty title="Financial values not yet verified">
                          Retrieved text is available in the evidence sections.
                          Cards remain empty until periods, units and
                          consolidated basis can be established.
                        </Empty>
                      )}
                      <div className="panel-foot">
                        EBITDA, debt, ROE and ROCE are omitted where the
                        reviewed evidence does not support a reliable value.
                      </div>
                    </div>
                  ) : researchSection === "Trajectory" ? (
                    <Trajectory research={research} />
                  ) : (
                    <section className="panel evidence-panel">
                      <div className="panel-heading">
                        <div>
                          <h2>
                            {researchSection === "Overview"
                              ? "Understand the business"
                              : researchSection === "Cash quality"
                                ? "Do profits turn into cash?"
                                : "Management, on the record"}
                          </h2>
                          <p>
                            {research.status === "cached"
                              ? "Reviewed source facts and attributed commentary."
                              : "Retrieved document passages. Interpret them in their original context."}
                          </p>
                        </div>
                        <BookOpen size={20} />
                      </div>
                      {(research.sections[researchSection] || []).length ? (
                        (research.sections[researchSection] || []).map((c) => (
                          <EvidenceCard
                            key={c.id}
                            chunk={c}
                            sources={research.sources}
                          />
                        ))
                      ) : (
                        <Empty title="Insufficient primary-source evidence">
                          No relevant passages were found for this section. No
                          conclusions have been filled in from outside
                          knowledge.
                        </Empty>
                      )}
                    </section>
                  )}
                  <details className="coverage-notes">
                    <summary>
                      <Info size={14} /> Evidence coverage & limitations{" "}
                      <ChevronDown size={14} />
                    </summary>
                    {research.warnings.map((w, i) => (
                      <p key={i}>{w}</p>
                    ))}
                  </details>
                  <section className="ask-panel">
                    <div>
                      <Sparkles size={18} />
                      <h3>Ask the evidence</h3>
                      <span>
                        {research.mode === "llm"
                          ? "Grounded AI"
                          : "Extractive mode"}
                      </span>
                    </div>
                    <form onSubmit={ask}>
                      <label htmlFor="question" className="sr-only">
                        Question about this company
                      </label>
                      <input
                        id="question"
                        value={question}
                        maxLength={800}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="What does the evidence say about cash generation?"
                      />
                      <button
                        className="button primary"
                        disabled={
                          answerBusy ||
                          question.trim().length < 3 ||
                          !research.chunks.length
                        }
                      >
                        {answerBusy ? (
                          <RefreshCw size={17} className="spin" />
                        ) : (
                          <ArrowRight size={18} />
                        )}
                        <span>{answerBusy ? "Retrieving" : "Ask"}</span>
                      </button>
                    </form>
                    {research.answer && (
                      <div className="answer">
                        <p>{research.answer}</p>
                        {research.answerCitations?.map((id) => {
                          const c = research.chunks.find((c) => c.id === id);
                          return c ? (
                            <EvidenceCard
                              key={id}
                              chunk={c}
                              sources={research.sources}
                            />
                          ) : null;
                        })}
                      </div>
                    )}
                  </section>
                </>
              )}
            </>
          )}
          {tab === "Alerts" && (
            <>
              <section className="alerts-summary">
                <div className="alert-summary-icon">
                  <Bell size={24} />
                </div>
                <div>
                  <h2>
                    {unread} unread signal{unread !== 1 ? "s" : ""}
                  </h2>
                  <p>
                    Price ±{settings.priceThreshold}% · Volume{" "}
                    {settings.volumeThreshold}× · {settings.categories.length}{" "}
                    announcement categories
                  </p>
                </div>
                <button
                  className="button secondary"
                  onClick={() => {
                    setRead(alerts.map((a) => a.id));
                    setToast("All current signals marked as read");
                  }}
                  disabled={!unread}
                >
                  <CheckCheck size={16} />
                  Mark all read
                </button>
              </section>
              <div className="notice">
                <Clock size={16} />
                <span>
                  Signals are evaluated when FINN loads or you refresh. Market
                  signals show the latest available completed session, which may
                  be stale. No background push delivery.
                </span>
              </div>
              <section className="panel">
                {alerts.length ? (
                  alerts.map((a) => (
                    <article
                      key={a.id}
                      className={`alert-row ${read.includes(a.id) ? "read" : ""}`}
                    >
                      <div className="alert-dot" />
                      <div>
                        <div className="eyebrow">
                          {a.ticker} · {a.type} · {date(a.date)}
                        </div>
                        <h3>{a.title}</h3>
                        <p>{a.detail}</p>
                        <a
                          className="source-link"
                          href={a.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Inspect source <ArrowUpRight size={13} />
                        </a>
                      </div>
                      <button
                        className="icon-button"
                        aria-label={`Mark ${a.ticker} signal as ${read.includes(a.id) ? "unread" : "read"}`}
                        onClick={() =>
                          setRead(
                            read.includes(a.id)
                              ? read.filter((id) => id !== a.id)
                              : [...read, a.id],
                          )
                        }
                      >
                        <Check size={18} />
                      </button>
                    </article>
                  ))
                ) : (
                  <Empty title="Your thresholds are quiet">
                    No signals match the available data and your current
                    settings. Change thresholds to explore the observations.
                  </Empty>
                )}
              </section>
              <button
                className="button secondary adjust-alerts"
                onClick={() => setTab("Settings")}
              >
                <SlidersHorizontal size={16} />
                Adjust alert thresholds
              </button>
            </>
          )}
          {tab === "Settings" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const s = normalizeSettings(settingsDraft);
                setSettings(s);
                setSettingsDraft(s);
                setWindow(s.window);
                setToast("Preferences saved on this device");
              }}
            >
              <div className="settings-grid">
                <section className="panel settings-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Market thresholds</h2>
                      <p>Applied to completed daily trading sessions.</p>
                    </div>
                    <SlidersHorizontal size={20} />
                  </div>
                  <div className="setting-field">
                    <label htmlFor="price-threshold">
                      Daily price movement{" "}
                      <span>±{settingsDraft.priceThreshold}%</span>
                    </label>
                    <p>Flag a closing-price change in either direction.</p>
                    <input
                      id="price-threshold"
                      type="range"
                      min="0.5"
                      max="15"
                      step="0.5"
                      value={settingsDraft.priceThreshold}
                      onChange={(e) =>
                        setSettingsDraft({
                          ...settingsDraft,
                          priceThreshold: +e.target.value,
                        })
                      }
                    />
                    <div className="range-labels">
                      <span>0.5%</span>
                      <span>15%</span>
                    </div>
                  </div>
                  <div className="setting-field">
                    <label htmlFor="volume-threshold">
                      Relative trading volume{" "}
                      <span>{settingsDraft.volumeThreshold.toFixed(1)}×</span>
                    </label>
                    <p>
                      Daily volume ÷ average of the prior 20 trading sessions.
                    </p>
                    <input
                      id="volume-threshold"
                      type="range"
                      min="0.5"
                      max="5"
                      step="0.1"
                      value={settingsDraft.volumeThreshold}
                      onChange={(e) =>
                        setSettingsDraft({
                          ...settingsDraft,
                          volumeThreshold: +e.target.value,
                        })
                      }
                    />
                    <div className="range-labels">
                      <span>0.5×</span>
                      <span>5×</span>
                    </div>
                  </div>
                  <div className="setting-field">
                    <label htmlFor="digest-window">Default digest window</label>
                    <select
                      id="digest-window"
                      value={settingsDraft.window}
                      onChange={(e) =>
                        setSettingsDraft({
                          ...settingsDraft,
                          window: e.target.value,
                        })
                      }
                    >
                      <option value="24h">Last 24 hours</option>
                      <option value="7d">Last 7 days</option>
                      <option value="30d">Last 30 days</option>
                    </select>
                  </div>
                </section>
                <section className="panel settings-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Announcement interests</h2>
                      <p>Choose which disclosures appear in your feed.</p>
                    </div>
                    <Filter size={19} />
                  </div>
                  <div className="category-grid">
                    {categories.map((c) => (
                      <label key={c} className="check-label">
                        <input
                          type="checkbox"
                          checked={settingsDraft.categories.includes(c)}
                          onChange={(e) =>
                            setSettingsDraft({
                              ...settingsDraft,
                              categories: e.target.checked
                                ? [...settingsDraft.categories, c]
                                : settingsDraft.categories.filter(
                                    (x) => x !== c,
                                  ),
                            })
                          }
                        />
                        <span>{label(c)}</span>
                      </label>
                    ))}
                  </div>
                </section>
              </div>
              <div className="settings-footer">
                <p>
                  <ShieldCheck size={16} /> Saved locally in this browser. No
                  account required.
                </p>
                <button
                  type="button"
                  className="button secondary"
                  onClick={() => setSettingsDraft(defaultSettings)}
                >
                  Restore defaults
                </button>
                <button type="submit" className="button primary">
                  <Check size={16} />
                  Save preferences
                </button>
              </div>
              <div className="panel methodology">
                <h3>How FINN decides what deserves attention</h3>
                <p>
                  Category sets the starting score. Explicit leadership and
                  financial-risk indicators raise it; notices, meeting schedules
                  and routine disclosures lower it. Recent items get a small
                  boost. Every filing explains its score. Price and volume
                  alerts use the thresholds above.
                </p>
                <p>
                  Prices are end-of-day observations, not live quotes. The mock
                  watchlist has no position sizes, so FINN does not invent
                  portfolio returns. Research is an information tool, not a buy
                  or sell recommendation.
                </p>
              </div>
            </form>
          )}
          <footer className="footer">
            <span className="footer-brand">finn.</span>
            <span>From market noise to investment intelligence.</span>
            <span>
              <ShieldCheck size={13} /> Evidence before opinion
            </span>
          </footer>
        </div>
      </main>
      <nav className="mobile-nav" aria-label="Mobile navigation">
        {nav.map(({ name, icon: Icon }) => (
          <button
            className={tab === name ? "active" : ""}
            key={name}
            onClick={() => setTab(name)}
          >
            <Icon size={21} />
            <span>{name}</span>
            {name === "Alerts" && unread > 0 && <i />}
          </button>
        ))}
      </nav>
      {toast && (
        <div className="toast" role="status">
          <Check size={16} />
          {toast}
        </div>
      )}
      {searchOpen && (
        <div className="modal-backdrop" onClick={() => setSearchOpen(false)}>
          <section
            className="search-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Search NSE companies"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <h2>
                {searchMode === "add"
                  ? "Add to your watchlist"
                  : "Start your research"}
              </h2>
              <button
                className="icon-button"
                aria-label="Close search"
                onClick={() => setSearchOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="modal-search">
              <Search size={20} />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Company name or NSE ticker"
                aria-label="Company name or ticker"
              />
            </div>
            <p className="search-help">
              NSE equity directory · new holdings validated against price
              provider
            </p>
            <div className="search-results">
              {searchBusy ? (
                <p className="search-help">Searching / validating…</p>
              ) : results.length ? (
                results.map((c) => (
                  <button key={c.ticker} onClick={() => choose(c)}>
                    <span className="stock-avatar">{c.ticker.slice(0, 2)}</span>
                    <span>
                      <strong>{c.ticker}</strong>
                      <small>{c.name}</small>
                    </span>
                    {portfolio.includes(c.ticker) && searchMode === "add" ? (
                      <Check size={18} />
                    ) : (
                      <Plus size={18} />
                    )}
                  </button>
                ))
              ) : (
                <p className="search-help">
                  No matching supported ticker. Try a company name.
                </p>
              )}
            </div>
          </section>
        </div>
      )}
      {drawer && (
        <div
          className="modal-backdrop drawer-backdrop"
          onClick={() => setDrawer(null)}
        >
          <section
            className="company-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={`${drawer} details`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-head">
              <span className="eyebrow">COMPANY DETAIL</span>
              <button
                className="icon-button"
                aria-label="Close company details"
                onClick={() => setDrawer(null)}
              >
                <X size={20} />
              </button>
            </div>
            <span className="drawer-monogram">{drawer.slice(0, 2)}</span>
            <h2>{drawer}</h2>
            <p className="muted">
              {selectedQuote?.name || "NSE listed equity"}
            </p>
            <div className="drawer-price">
              {selectedQuote?.close != null
                ? `₹${number(selectedQuote.close)}`
                : "Unavailable"}
              <span
                className={
                  (selectedQuote?.change ?? 0) >= 0 ? "positive" : "negative"
                }
              >
                {selectedQuote?.change != null
                  ? `${number(selectedQuote.change)}%`
                  : ""}
              </span>
            </div>
            <p className="small muted">
              EOD close ·{" "}
              {selectedQuote?.asOf
                ? date(selectedQuote.asOf)
                : "No available date"}{" "}
              · {selectedQuote?.status}
            </p>
            {selectedQuote && (
              <>
                <Sparkline bars={selectedQuote.bars} large />
                <div className="chart-labels">
                  <span>{selectedQuote.bars[0]?.date}</span>
                  <span>{selectedQuote.bars.at(-1)?.date}</span>
                </div>
                <div className="drawer-metrics">
                  <div>
                    <span>Daily volume</span>
                    <strong>{compact(selectedQuote.volume)}</strong>
                  </div>
                  <div>
                    <span>Prior 20-day average</span>
                    <strong>{compact(selectedQuote.averageVolume)}</strong>
                  </div>
                  <div>
                    <span>Relative volume</span>
                    <strong>{number(selectedQuote.relativeVolume)}×</strong>
                  </div>
                  <div>
                    <span>Price threshold</span>
                    <strong>±{settings.priceThreshold}%</strong>
                  </div>
                </div>
                <p className="small muted">
                  Retrieved {date(selectedQuote.fetchedAt, true)} IST.{" "}
                  {selectedQuote.error
                    ? `Source check: ${selectedQuote.error}.`
                    : ""}{" "}
                  Unadjusted daily close; corporate actions can distort apparent
                  changes.
                </p>
                <a
                  className="source-link"
                  href={selectedQuote.sourceUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  View provider history <ExternalLink size={13} />
                </a>
              </>
            )}
            <button
              className="button primary full"
              onClick={() => {
                setTab("Research");
                runResearch(drawer);
                setDrawer(null);
              }}
            >
              <BookOpen size={17} />
              Research this company <ArrowRight size={16} />
            </button>
            <button
              className="remove-button"
              disabled={portfolio.length <= 1}
              onClick={() => {
                setPortfolio(portfolio.filter((t) => t !== drawer));
                setDrawer(null);
                setToast("Company removed from your watchlist");
              }}
            >
              <Trash2 size={14} />
              Remove from watchlist
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
function EvidenceCard({ chunk, sources }: { chunk: Chunk; sources: Source[] }) {
  return (
    <article className="evidence-card">
      <div className="eyebrow">
        {chunk.section || "PRIMARY DOCUMENT EXCERPT"}
      </div>
      {chunk.text.length > 650 ? (
        <>
          <p>{chunk.text.slice(0, 600)}…</p>
          <details className="passage-details">
            <summary>Read full retrieved passage</summary>
            <p>{chunk.text}</p>
          </details>
        </>
      ) : (
        <p>{chunk.text}</p>
      )}
      <SourceLink
        source={sources.find((s) => s.id === chunk.sourceId)}
        page={chunk.page}
      />
    </article>
  );
}
function Trajectory({ research }: { research: Research }) {
  const f = research.facts.find((f) => f.label === "Revenue" && f.previous);
  if (!f || !f.previous)
    return (
      <div className="panel">
        <Empty title="Comparable periods not established">
          A trajectory needs consistent metrics, periods, units and reporting
          bases. No growth rate is inferred from incomplete evidence.
        </Empty>
      </div>
    );
  const growth = percentChange(f.value, f.previous);
  return (
    <section className="panel trajectory">
      <div className="panel-heading">
        <div>
          <h2>Revenue trajectory</h2>
          <p>
            {f.basis} · {f.unit} · annual YoY comparison
          </p>
        </div>
        <span className="growth-chip">
          {growth! >= 0 ? "+" : ""}
          {number(growth)}% YoY
        </span>
      </div>
      <div className="bar-chart">
        {[
          { value: f.previous, period: f.previousPeriod },
          { value: f.value, period: f.period },
        ].map((x, i) => (
          <div key={x.period}>
            <strong>{number(x.value, 0)}</strong>
            <div
              className={`bar ${i ? "current" : ""}`}
              style={{
                height: `${(x.value / Math.max(f.value, f.previous!)) * 170}px`,
              }}
            />
            <span>{x.period}</span>
          </div>
        ))}
      </div>
      <div className="trajectory-foot">
        <SourceLink
          source={research.sources.find((s) => s.id === f.sourceId)}
          page={f.page}
        />
        <p>
          Calculated from reported revenue in the same currency and basis. This
          is not constant-currency growth. Two observations describe a change,
          not a durable trend.
        </p>
      </div>
    </section>
  );
}
function RealityCheck({
  ticker,
  onChoose,
}: {
  ticker: string;
  onChoose: () => void;
}) {
  const r = evidence.realityCheck;
  const comparison = compareGuidance(r.expectedLow, r.expectedHigh, r.actual);
  if (ticker !== "INFY")
    return (
      <div className="panel">
        <Empty title="No verified guidance comparison yet">
          This company needs matched guidance and subsequent results on the same
          basis. FINN will not force a classification.
          <br />
          <button className="button secondary" onClick={onChoose}>
            Open the verified Infosys case <ArrowRight size={14} />
          </button>
        </Empty>
      </div>
    );
  return (
    <section className="reality-panel">
      <div className="reality-heading">
        <div className="eyebrow">
          <Target size={15} /> FINN REALITY CHECK
        </div>
        <span className="historical-label">Historical case study · FY2025</span>
      </div>
      <h2>
        The promise. The performance.
        <br />
        <span>The space between.</span>
      </h2>
      <p className="reality-intro">
        Infosys · Full-year revenue growth · Consolidated, constant currency
      </p>
      <div className="comparison">
        <div className="expectation">
          <div className="eyebrow">01 / MANAGEMENT EXPECTATION</div>
          <strong>
            {r.expectedLow.toFixed(1)}–{r.expectedHigh.toFixed(1)}
            <span>%</span>
          </strong>
          <span>FY2025 revenue-growth guidance</span>
          <blockquote>“{r.quote}”</blockquote>
          <small>
            {r.speaker}
            <br />
            {date(r.statementDate)}
          </small>
          <a
            href={`${evidence.sources.find((s) => s.id === r.guidanceSourceId)?.url}#page=7`}
            target="_blank"
            rel="noreferrer"
          >
            Read the call transcript · p. 7 <ArrowUpRight size={13} />
          </a>
        </div>
        <div className="comparison-arrow">
          <ArrowRight size={24} />
        </div>
        <div className="actual">
          <div className="eyebrow">02 / REPORTED OUTCOME</div>
          <strong>
            {r.actual.toFixed(1)}
            <span>%</span>
          </strong>
          <span>FY2025 actual constant-currency growth</span>
          <div className="comparison-result">
            <span className="missed">{comparison.status}</span>
            <b>{comparison.variance?.toFixed(1)} pp</b>
            <small>below the lower end of guidance</small>
          </div>
          <small>
            Financial year ended 31 March 2025
            <br />
            Reported {date(r.actualDate)}
          </small>
          <a
            href={`${evidence.sources.find((s) => s.id === r.actualSourceId)?.url}#page=1`}
            target="_blank"
            rel="noreferrer"
          >
            Read reported results · p. 1 <ArrowUpRight size={13} />
          </a>
        </div>
      </div>
      <div className="reality-conclusion">
        <ShieldCheck size={20} />
        <div>
          <strong>What the evidence supports</strong>
          <p>{r.interpretation}</p>
        </div>
      </div>
      <p className="comparison-note">
        Method: compare the January 2025 guidance vintage with the subsequent
        FY2025 outcome. Variance = actual − lower bound. Constant currency is
        kept separate from reported USD growth.
      </p>
    </section>
  );
}
