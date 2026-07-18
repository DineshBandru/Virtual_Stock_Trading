import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import GlassPanel from "../components/GlassPanel";
import PageHeader from "../components/PageHeader";
import TopTicker from "../components/TopTicker";
import { Skeleton } from "../components/Skeleton";
import useAuth from "../hooks/useAuth";
import useLivePrices from "../hooks/useLivePrices";
import api from "../utils/api";
import { getApiErrorMessage } from "../utils/errorMessage";

const INDEX_SYMBOLS = [
  { label: "NIFTY 50", symbol: "^NSEI" },
  { label: "SENSEX", symbol: "^BSESN" },
  { label: "BANKNIFTY", symbol: "^NSEBANK" }
];

const DEMO_INDEX_OVERVIEW = [
  {
    label: "NIFTY 50",
    symbol: "^NSEI",
    value: 22550.4,
    changePct: 0.72,
    direction: "up",
    marketTime: "ref"
  },
  {
    label: "SENSEX",
    symbol: "^BSESN",
    value: 74120.85,
    changePct: -0.28,
    direction: "down",
    marketTime: "ref"
  },
  {
    label: "BANKNIFTY",
    symbol: "^NSEBANK",
    value: 48210.65,
    changePct: 0.34,
    direction: "up",
    marketTime: "ref"
  }
];

const DEMO_MARKET_UNIVERSE = [
  { symbol: "RELIANCE.NS", name: "Reliance Industries", currentPrice: 1321.2, changePct: -2.17, volume: 18200000 },
  { symbol: "TCS.NS", name: "Tata Consultancy Services", currentPrice: 2258.9, changePct: -1.11, volume: 4200000 },
  { symbol: "INFY.NS", name: "Infosys", currentPrice: 1160.9, changePct: 0.09, volume: 9100000 },
  { symbol: "HDFCBANK.NS", name: "HDFC Bank", currentPrice: 744.55, changePct: -1.86, volume: 12400000 },
  { symbol: "ICICIBANK.NS", name: "ICICI Bank", currentPrice: 1256.4, changePct: -1.28, volume: 10200000 },
  { symbol: "SBIN.NS", name: "State Bank of India", currentPrice: 964.4, changePct: -0.35, volume: 15800000 },
  { symbol: "ITC.NS", name: "ITC", currentPrice: 286.9, changePct: -1.73, volume: 11700000 },
  { symbol: "LT.NS", name: "Larsen and Toubro", currentPrice: 4076.5, changePct: 0.72, volume: 2900000 },
  { symbol: "BHARTIARTL.NS", name: "Bharti Airtel", currentPrice: 1829, changePct: -1.25, volume: 8400000 },
  { symbol: "KOTAKBANK.NS", name: "Kotak Mahindra Bank", currentPrice: 384.2, changePct: -1.16, volume: 6300000 },
  { symbol: "HINDUNILVR.NS", name: "Hindustan Unilever", currentPrice: 2153.5, changePct: -2.04, volume: 7600000 },
  { symbol: "ASIANPAINT.NS", name: "Asian Paints", currentPrice: 2671.6, changePct: -0.01, volume: 5100000 },
  { symbol: "BAJFINANCE.NS", name: "Bajaj Finance", currentPrice: 908.25, changePct: -2.46, volume: 6900000 },
  { symbol: "HCLTECH.NS", name: "HCL Technologies", currentPrice: 1183.8, changePct: 1.60, volume: 5700000 },
  { symbol: "AXISBANK.NS", name: "Axis Bank", currentPrice: 1286.6, changePct: -1.34, volume: 9800000 },
  { symbol: "WIPRO.NS", name: "Wipro", currentPrice: 204.25, changePct: 1.32, volume: 7200000 },
  { symbol: "ADANIENT.NS", name: "Adani Enterprises", currentPrice: 2937.4, changePct: -1.20, volume: 4300000 },
  { symbol: "SUNPHARMA.NS", name: "Sun Pharma", currentPrice: 1191.3, changePct: -0.67, volume: 6100000 },
  { symbol: "TITAN.NS", name: "Titan", currentPrice: 3078.2, changePct: 0.95, volume: 3500000 },
  { symbol: "MARUTI.NS", name: "Maruti Suzuki", currentPrice: 12824.9, changePct: -0.44, volume: 2600000 }
];

const DEMO_NEWS_ITEMS = [
  {
    source: "Market Wire",
    headline: "FII buying lifts defensives as volatility cools into the close",
    datetime: Math.floor(Date.now() / 1000) - 900,
    url: "https://www.tradingview.com/news/",
    summary: ""
  },
  {
    source: "Equity Brief",
    headline: "Banks and autos hold support while IT sees selective profit booking",
    datetime: Math.floor(Date.now() / 1000) - 1800,
    url: "https://www.tradingview.com/markets/stocks-india/",
    summary: ""
  },
  {
    source: "Macro Desk",
    headline: "Midcaps stay range-bound ahead of global macro cues and crude prints",
    datetime: Math.floor(Date.now() / 1000) - 2700,
    url: "https://www.nseindia.com/",
    summary: ""
  },
  {
    source: "Options Flow",
    headline: "Index traders position for a narrow session as Bank Nifty stabilizes",
    datetime: Math.floor(Date.now() / 1000) - 3600,
    url: "https://www.nseindia.com/market-data/live-equity-market",
    summary: ""
  },
  {
    source: "Opening Bell",
    headline: "Nifty futures steady; focus shifts to earnings and institutional flow",
    datetime: Math.floor(Date.now() / 1000) - 4500,
    url: "https://www.moneycontrol.com/",
    summary: ""
  }
];

const quickLinks = [
  { label: "Portfolio", path: "/portfolio" },
  { label: "Watchlist", path: "/watchlist" },
  { label: "Transactions", path: "/transactions" },
  { label: "Alerts", path: "/alerts" },
  { label: "Analytics", path: "/analytics" },
  { label: "Leaderboard", path: "/leaderboard" },
  { label: "Competitions", path: "/competitions" }
];

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2
});

const compactInr = new Intl.NumberFormat("en-IN", {
  notation: "compact",
  maximumFractionDigits: 1
});

const formatCurrency = (value) =>
  Number.isFinite(value) ? inr.format(value) : "—";

const formatPercent = (value) =>
  Number.isFinite(value) ? `${value >= 0 ? "+" : ""}${value.toFixed(2)}%` : "—";

const formatCompact = (value) =>
  Number.isFinite(value) ? compactInr.format(value) : "—";

const stripNseSuffix = (symbol) => symbol.replace(/\.NS$/i, "");

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : NaN;
};

const getChangePct = (quote) => {
  const current = toNumber(quote?.regularMarketPrice ?? quote?.c);
  const previous = toNumber(quote?.regularMarketPreviousClose ?? quote?.pc);
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) {
    return NaN;
  }
  return ((current - previous) / previous) * 100;
};

const getMarketStatus = () => {
  const ist = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" }));
  const day = ist.getDay();
  const minutes = ist.getHours() * 60 + ist.getMinutes();
  const isWeekday = day >= 1 && day <= 5;
  const isOpen = isWeekday && minutes >= 9 * 60 + 15 && minutes <= 15 * 60 + 30;

  return {
    label: isOpen ? "Market Open" : "Market Closed",
    tone: isOpen ? "text-cyan-300" : "text-amber-300",
    dot: isOpen ? "bg-cyan-400" : "bg-amber-400",
    clock: ist.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    })
  };
};

const withTimeout = (promise, timeoutMs, fallbackValue) =>
  Promise.race([
    promise,
    new Promise((resolve) => {
      setTimeout(() => resolve(fallbackValue), timeoutMs);
    })
  ]);

const Dashboard = () => {
  const { user } = useAuth();
  const livePrices = useLivePrices();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [marketOverview, setMarketOverview] = useState(DEMO_INDEX_OVERVIEW);
  const [marketUniverse, setMarketUniverse] = useState(DEMO_MARKET_UNIVERSE);
  const [newsItems, setNewsItems] = useState(DEMO_NEWS_ITEMS);
  const [portfolioHoldings, setPortfolioHoldings] = useState([]);
  const [watchlistSymbols, setWatchlistSymbols] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError("");
        setMarketOverview(DEMO_INDEX_OVERVIEW);

        const [portfolioData, watchlistData, trendingData, newsData] = await Promise.all([
          withTimeout(
            api.get("/api/portfolio").then((response) => response.data || []).catch(() => []),
            2500,
            []
          ),
          withTimeout(
            api.get("/api/watchlist").then((response) => response.data?.symbols || []).catch(() => []),
            2500,
            []
          ),
          withTimeout(
            api.get("/api/stocks/trending").then((response) => response.data || []).catch(() => []),
            2500,
            []
          ),
          withTimeout(
            api.get("/api/news").then((response) => response.data || []).catch(() => []),
            2500,
            []
          )
        ]);

        const holdings = portfolioData;
        const watchlist = watchlistData;
        const trending = trendingData;
        const news = newsData;

        const universe = trending.length > 0 ? trending.map((item) => {
          const quote = item.quote || {};
          const currentPrice = toNumber(quote?.regularMarketPrice ?? quote?.c);
          const changePct = getChangePct(quote);
          const volume = toNumber(quote?.regularMarketVolume ?? quote?.v);

          return {
            symbol: item.symbol,
            name: item.name || quote?.shortName || stripNseSuffix(item.symbol),
            currentPrice,
            changePct,
            volume
          };
        }) : DEMO_MARKET_UNIVERSE;

        const holdingQuoteResults = await Promise.allSettled(
          holdings.map((holding) => api.get(`/api/stocks/${encodeURIComponent(holding.symbol)}`))
        );

        const enrichedHoldings = holdings.map((holding, index) => {
          const response = holdingQuoteResults[index];
          const quote =
            response.status === "fulfilled" ? response.value.data?.quote || {} : {};
          const currentPrice = toNumber(quote?.c);
          const openPrice = toNumber(quote?.o);
          const currentValue = toNumber(holding.currentValue);
          const invested = toNumber(holding.totalInvested);

          return {
            ...holding,
            quote,
            currentPrice,
            currentValue: Number.isFinite(currentValue)
              ? currentValue
              : Number.isFinite(currentPrice)
                ? currentPrice * toNumber(holding.quantity)
                : 0,
            invested: Number.isFinite(invested) ? invested : 0,
            todayPnl:
              Number.isFinite(currentPrice) && Number.isFinite(openPrice)
                ? (currentPrice - openPrice) * toNumber(holding.quantity)
                : 0
          };
        });

        if (!active) {
          return;
        }

        setMarketUniverse(universe);
        setNewsItems(news.length > 0 ? news.slice(0, 5) : DEMO_NEWS_ITEMS);
        setPortfolioHoldings(enrichedHoldings);
        setWatchlistSymbols(watchlist);
        setLastUpdated(new Date());
      } catch (fetchError) {
        if (active) {
          setMarketOverview(DEMO_INDEX_OVERVIEW);
          setError(getApiErrorMessage(fetchError, "Failed to load dashboard"));
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadDashboard();

    return () => {
      active = false;
    };
  }, [user?.id, user?._id]);

  const topGainers = useMemo(
    () =>
      [...marketUniverse]
        .filter((item) => Number.isFinite(item.changePct))
        .sort((left, right) => right.changePct - left.changePct)
        .slice(0, 5),
    [marketUniverse]
  );

  const topLosers = useMemo(
    () =>
      [...marketUniverse]
        .filter((item) => Number.isFinite(item.changePct))
        .sort((left, right) => left.changePct - right.changePct)
        .slice(0, 5),
    [marketUniverse]
  );

  const topVolumeStocks = useMemo(
    () =>
      [...marketUniverse]
        .filter((item) => Number.isFinite(item.volume) && item.volume > 0)
        .sort((left, right) => right.volume - left.volume)
        .slice(0, 5),
    [marketUniverse]
  );

  const portfolioValue = portfolioHoldings.reduce((sum, item) => sum + item.currentValue, 0);
  const availableCash = toNumber(user?.balance) || 0;
  const totalAccountValue = availableCash + portfolioValue;
  const totalPnl = portfolioHoldings.reduce((sum, item) => sum + (item.currentValue - item.invested), 0);
  const todayPnl = portfolioHoldings.reduce((sum, item) => sum + item.todayPnl, 0);
  const marketStatus = getMarketStatus();
  const watchlistPreview = watchlistSymbols.slice(0, 5);

  return (
    <div className="flex flex-col gap-8">
      <TopTicker />

      <div className="flex flex-col gap-4">
        <PageHeader
          title="Terminal Dashboard"
          subtitle="Professional market intelligence, portfolio surveillance, and live trading context in one command center."
        />

        <div className="grid gap-4 xl:grid-cols-[1.6fr_0.9fr]">
          <GlassPanel className="flex flex-col justify-between gap-4 border-cyan-500/30 bg-gradient-to-br from-panel/80 via-panel/70 to-base/90">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-300/80">
                Search Desk
              </p>
              <h2 className="mt-2 text-xl font-semibold text-white">
                Navigate any NSE symbol in seconds
              </h2>
            </div>
            <input
              type="text"
              placeholder="Search NSE Stocks (e.g. RELIANCE)..."
              className="w-full rounded-2xl border border-borderGlow/60 bg-base/85 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
            />
          </GlassPanel>

          <GlassPanel className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-slate-400">
                Market Status
              </p>
              <div className="mt-3 flex items-center gap-3">
                <span className={`h-3 w-3 rounded-full ${marketStatus.dot}`} />
                <p className={`text-lg font-semibold ${marketStatus.tone}`}>
                  {marketStatus.label}
                </p>
              </div>
              <p className="mt-2 text-xs text-slate-400">
                Last updated {marketStatus.clock}
              </p>
            </div>

            <div className="rounded-2xl border border-borderGlow/60 bg-base/70 px-4 py-3 text-right">
              <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">
                Watchlist Feed
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">{watchlistSymbols.length}</p>
              <p className="text-xs text-slate-400">Symbols tracked</p>
            </div>
          </GlassPanel>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-8">
          <GlassPanel>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">
                  Market Overview
                </p>
                <h3 className="mt-2 text-xl font-semibold text-white">
                  Index pulse for the Indian market
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                {lastUpdated
                  ? `Synced ${lastUpdated.toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit"
                    })}`
                  : "Syncing market feed..."}
              </p>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {loading
                ? Array.from({ length: 3 }).map((_, index) => (
                    <div
                      key={index}
                      className="rounded-2xl border border-borderGlow/60 bg-base/70 p-4"
                    >
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="mt-4 h-7 w-3/4" />
                      <Skeleton className="mt-3 h-4 w-1/3" />
                    </div>
                  ))
                : marketOverview.map((item) => (
                    <div
                      key={item.symbol}
                      className="rounded-2xl border border-borderGlow/60 bg-base/75 p-4 shadow-glow/20"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">
                            {item.label}
                          </p>
                          <p className="mt-2 text-xl font-semibold text-white">
                            {formatCurrency(item.value)}
                          </p>
                        </div>
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-2xl border ${
                            item.direction === "up"
                              ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-300"
                              : "border-red-400/40 bg-red-400/10 text-red-300"
                          }`}
                        >
                          {item.direction === "up" ? "▲" : "▼"}
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between text-sm">
                        <span className={item.direction === "up" ? "text-cyan-300" : "text-red-300"}>
                          {formatPercent(item.changePct)}
                        </span>
                        <span className="text-xs text-slate-500">
                          {item.marketTime ? `Updated ${item.marketTime}` : "Live"}
                        </span>
                      </div>
                    </div>
                  ))}
            </div>
          </GlassPanel>

          <div className="grid gap-6 lg:grid-cols-2">
            <GlassPanel>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-slate-400">
                    Top Gainers
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-white">Strongest movers today</h3>
                </div>
                <span className="text-xs text-slate-400">Top 5</span>
              </div>

              <div className="mt-6 space-y-3">
                {topGainers.length === 0 ? (
                  <p className="text-sm text-slate-400">No gainers available yet.</p>
                ) : (
                  topGainers.map((item, index) => (
                    <Link
                      key={item.symbol}
                      to={`/stocks/${stripNseSuffix(item.symbol)}`}
                      className="flex items-center justify-between rounded-2xl border border-borderGlow/60 bg-base/70 px-4 py-3 transition hover:border-cyan-400/50 hover:bg-base/90"
                    >
                      <div>
                        <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
                          #{index + 1} {stripNseSuffix(item.symbol)}
                        </p>
                        <p className="mt-1 text-sm text-slate-300">{item.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-white">{formatCurrency(item.currentPrice)}</p>
                        <p className="text-xs text-cyan-300">{formatPercent(item.changePct)}</p>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </GlassPanel>

            <GlassPanel>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-slate-400">
                    Top Losers
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-white">Weakest movers today</h3>
                </div>
                <span className="text-xs text-slate-400">Top 5</span>
              </div>

              <div className="mt-6 space-y-3">
                {topLosers.length === 0 ? (
                  <p className="text-sm text-slate-400">No losers available yet.</p>
                ) : (
                  topLosers.map((item, index) => (
                    <Link
                      key={item.symbol}
                      to={`/stocks/${stripNseSuffix(item.symbol)}`}
                      className="flex items-center justify-between rounded-2xl border border-borderGlow/60 bg-base/70 px-4 py-3 transition hover:border-red-400/50 hover:bg-base/90"
                    >
                      <div>
                        <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
                          #{index + 1} {stripNseSuffix(item.symbol)}
                        </p>
                        <p className="mt-1 text-sm text-slate-300">{item.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-white">{formatCurrency(item.currentPrice)}</p>
                        <p className="text-xs text-red-300">{formatPercent(item.changePct)}</p>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </GlassPanel>
          </div>

          <GlassPanel>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">
                  Trending Stocks
                </p>
                <h3 className="mt-2 text-lg font-semibold text-white">Top volume names in focus</h3>
              </div>
              <span className="text-xs text-slate-400">Top 5 by volume</span>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {topVolumeStocks.length === 0 ? (
                <div className="text-sm text-slate-400 md:col-span-2 xl:col-span-5">
                  Volume data is currently unavailable.
                </div>
              ) : (
                topVolumeStocks.map((item) => (
                  <Link
                    key={item.symbol}
                    to={`/stocks/${stripNseSuffix(item.symbol)}`}
                    className="rounded-2xl border border-borderGlow/60 bg-base/75 p-4 transition hover:border-cyan-400/50 hover:bg-base/90"
                  >
                    <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
                      {stripNseSuffix(item.symbol)}
                    </p>
                    <p className="mt-2 text-sm font-medium text-slate-200">{item.name}</p>
                    <p className="mt-4 font-mono text-lg text-white">
                      {formatCurrency(item.currentPrice)}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className={item.changePct >= 0 ? "text-cyan-300" : "text-red-300"}>
                        {formatPercent(item.changePct)}
                      </span>
                      <span className="text-slate-400">Vol {formatCompact(item.volume)}</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </GlassPanel>

          <GlassPanel>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">
                  Market News Widget
                </p>
                <h3 className="mt-2 text-lg font-semibold text-white">Latest market headlines</h3>
              </div>
              <span className="text-xs text-slate-400">Clickable cards</span>
            </div>

            <div className="mt-6 space-y-3">
              {newsItems.length === 0 ? (
                <p className="text-sm text-slate-400">No news feed available right now.</p>
              ) : (
                newsItems.map((item, index) => {
                  const timestamp = item.datetime
                    ? new Date(item.datetime * 1000).toLocaleString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit"
                      })
                    : "Just now";

                  return (
                    <a
                      key={`${item.headline}-${index}`}
                      href={item.url || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-2xl border border-borderGlow/60 bg-base/75 px-4 py-4 transition hover:border-cyan-400/50 hover:bg-base/90"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-[11px] uppercase tracking-[0.25em] text-cyan-300/80">
                            {item.source || "Market News"}
                          </p>
                          <p className="mt-2 line-clamp-2 text-sm font-medium text-white">
                            {item.headline || item.summary || "Market update"}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full border border-borderGlow/60 px-3 py-1 text-[11px] text-slate-400">
                          {timestamp}
                        </span>
                      </div>
                    </a>
                  );
                })
              )}
            </div>
          </GlassPanel>
        </div>

        <div className="space-y-6 xl:col-span-4">
          <GlassPanel>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">
                  Portfolio Snapshot Widget
                </p>
                <h3 className="mt-2 text-lg font-semibold text-white">Account overview</h3>
              </div>
              <span className="text-xs text-slate-400">Live</span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              {[
                { label: "Total Portfolio Value", value: formatCurrency(totalAccountValue) },
                { label: "Available Cash", value: formatCurrency(availableCash) },
                { label: "Today's P&L", value: formatCurrency(todayPnl) },
                { label: "Total P&L", value: formatCurrency(totalPnl) }
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-2xl border border-borderGlow/60 bg-base/75 px-4 py-4"
                >
                  <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">
                    {item.label}
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </GlassPanel>

          <GlassPanel>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">
                  Watchlist Quick View
                </p>
                <h3 className="mt-2 text-lg font-semibold text-white">Symbols on your radar</h3>
              </div>
              <span className="text-xs text-slate-400">{watchlistPreview.length} shown</span>
            </div>

            <div className="mt-6 space-y-3">
              {watchlistPreview.length === 0 ? (
                <p className="text-sm text-slate-400">
                  Add symbols to your watchlist to see live prices here.
                </p>
              ) : (
                watchlistPreview.map((symbol) => {
                  const quote =
                    livePrices[symbol] ||
                    marketUniverse.find((item) => item.symbol === `${symbol}.NS`) ||
                    {};
                  const currentPrice = toNumber(quote.c ?? quote.currentPrice);
                  const previousClose = toNumber(quote.pc ?? quote.regularMarketPreviousClose);
                  const changePct = Number.isFinite(quote.changePct)
                    ? quote.changePct
                    : Number.isFinite(currentPrice) &&
                        Number.isFinite(previousClose) &&
                        previousClose !== 0
                      ? ((currentPrice - previousClose) / previousClose) * 100
                      : NaN;

                  return (
                    <Link
                      key={symbol}
                      to={`/stocks/${symbol}`}
                      className="flex items-center justify-between rounded-2xl border border-borderGlow/60 bg-base/75 px-4 py-3 transition hover:border-cyan-400/50 hover:bg-base/90"
                    >
                      <div>
                        <p className="text-xs uppercase tracking-[0.25em] text-slate-400">{symbol}</p>
                        <p className="mt-2 font-mono text-lg text-white">{formatCurrency(currentPrice)}</p>
                      </div>
                      <p className={`text-sm ${changePct >= 0 ? "text-cyan-300" : "text-red-300"}`}>
                        {formatPercent(changePct)}
                      </p>
                    </Link>
                  );
                })
              )}
            </div>
          </GlassPanel>

          <GlassPanel>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">
                  Market Status Widget
                </p>
                <h3 className="mt-2 text-lg font-semibold text-white">Session state</h3>
              </div>
              <span className={`text-sm font-semibold ${marketStatus.tone}`}>
                {marketStatus.label}
              </span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-2xl border border-borderGlow/60 bg-base/75 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">State</p>
                <p className={`mt-3 text-2xl font-semibold ${marketStatus.tone}`}>
                  {marketStatus.label}
                </p>
              </div>
              <div className="rounded-2xl border border-borderGlow/60 bg-base/75 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.25em] text-slate-400">
                  Last Updated
                </p>
                <p className="mt-3 text-2xl font-semibold text-white">{marketStatus.clock}</p>
              </div>
            </div>
          </GlassPanel>
        </div>
      </div>

      <GlassPanel>
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">
          Quick Links
        </h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="rounded-xl border border-borderGlow/60 bg-base/70 px-4 py-3 text-sm font-semibold text-slate-300 transition hover:border-cyan-400/60 hover:text-cyan-300"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </GlassPanel>
    </div>
  );
};

export default Dashboard;
