import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, GraduationCap, MousePointerClick, Search } from "lucide-react";
import GlassPanel from "../components/GlassPanel";
import HelpTooltip from "../components/HelpTooltip";
import PageHeader from "../components/PageHeader";
import { Skeleton } from "../components/Skeleton";
import { firstTradeGuideEventName, startTradingSteps } from "../data/beginnerGuidance";
import useAuth from "../hooks/useAuth";
import useLivePrices from "../hooks/useLivePrices";
import api from "../utils/api";
import { getApiErrorMessage } from "../utils/errorMessage";
import socket from "../utils/socket";
import { getNseMarketStatus } from "../utils/marketStatus";

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
  Number.isFinite(value) ? inr.format(value) : "N/A";

const formatPercent = (value) =>
  Number.isFinite(value) ? `${value >= 0 ? "+" : ""}${value.toFixed(2)}%` : "N/A";

const formatCompact = (value) =>
  Number.isFinite(value) ? compactInr.format(value) : "N/A";

const stripNseSuffix = (symbol) => symbol.replace(/\.NS$/i, "");

const ensureNseSuffix = (symbol) => {
  const normalized = String(symbol || "").trim().toUpperCase();
  if (!normalized) return "";
  return normalized.endsWith(".NS") ? normalized : `${normalized}.NS`;
};

const normalizeSearchResult = (item) => {
  const symbol = ensureNseSuffix(item?.symbol || item?.ticker || "");
  const companyName = String(item?.companyName || item?.name || item?.description || symbol).trim();
  if (!symbol.endsWith(".NS")) return null;
  return { symbol, companyName };
};

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

const withTimeout = (promise, timeoutMs, fallbackValue) =>
  Promise.race([
    promise,
    new Promise((resolve) => {
      setTimeout(() => resolve(fallbackValue), timeoutMs);
    })
  ]);

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [marketUniverse, setMarketUniverse] = useState([]);
  const [newsItems, setNewsItems] = useState([]);
  const [portfolioHoldings, setPortfolioHoldings] = useState([]);
  const [watchlistSymbols, setWatchlistSymbols] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [searchSymbol, setSearchSymbol] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [highlightedSearchIndex, setHighlightedSearchIndex] = useState(0);
  const [refreshTick, setRefreshTick] = useState(0);
  const searchRequestId = useRef(0);
  const subscribedSymbols = useMemo(
    () => [
      ...portfolioHoldings.map((holding) => holding.symbol),
      ...watchlistSymbols
    ].filter(Boolean),
    [portfolioHoldings, watchlistSymbols]
  );
  const livePrices = useLivePrices(subscribedSymbols);

  const goToSymbol = (symbol) => {
    const normalized = ensureNseSuffix(symbol);
    if (normalized) {
      navigate(`/stocks/${encodeURIComponent(normalized)}`);
    }
  };

  const selectSearchResult = (result) => {
    if (!result?.symbol) return;
    setSearchSymbol(result.symbol);
    setSearchOpen(false);
    setSearchResults([]);
    setSearchError("");
    goToSymbol(result.symbol);
  };

  useEffect(() => {
    let active = true;

    const loadDashboard = async () => {
      try {
        setLoading(true);
        setError("");

        const [portfolioResponse, watchlistResponse, trendingData, newsData] = await Promise.all([
          api.get("/api/portfolio"),
          api.get("/api/watchlist"),
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

        const holdings = Array.isArray(portfolioResponse.data) ? portfolioResponse.data : [];
        const watchlist = watchlistResponse.data?.symbols || [];
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
        }) : [];

        const enrichedHoldings = holdings.map((holding) => {
          const currentPrice = toNumber(holding.currentPrice);
          const openPrice = toNumber(holding.open);
          const currentValue = toNumber(holding.currentValue);
          const invested = toNumber(holding.investedValue ?? holding.totalInvested);

          return {
            ...holding,
            currentPrice,
            currentValue: Number.isFinite(currentValue)
              ? currentValue
              : Number.isFinite(currentPrice)
                ? currentPrice * toNumber(holding.quantity)
                : null,
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
        setNewsItems(news.length > 0 ? news.slice(0, 5) : []);
        setPortfolioHoldings(enrichedHoldings);
        setWatchlistSymbols(watchlist);
        setLastUpdated(new Date());
      } catch (fetchError) {
        if (active) {
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
  }, [user?.id, user?._id, refreshTick]);

  useEffect(() => {
    const refreshDashboard = () => setRefreshTick((value) => value + 1);

    socket.on("portfolio-update", refreshDashboard);
    socket.on("position-update", refreshDashboard);
    socket.on("transaction-update", refreshDashboard);
    socket.on("order-update", refreshDashboard);
    socket.on("connect", refreshDashboard);

    return () => {
      socket.off("portfolio-update", refreshDashboard);
      socket.off("position-update", refreshDashboard);
      socket.off("transaction-update", refreshDashboard);
      socket.off("order-update", refreshDashboard);
      socket.off("connect", refreshDashboard);
    };
  }, []);

  useEffect(() => {
    const query = searchSymbol.trim();
    const requestId = searchRequestId.current + 1;
    searchRequestId.current = requestId;

    if (query.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      setSearchError("");
      setSearchOpen(false);
      setHighlightedSearchIndex(0);
      return undefined;
    }

    const controller = new AbortController();
    setSearchLoading(true);
    setSearchError("");
    setSearchOpen(true);
    const timer = window.setTimeout(async () => {
      try {
        const response = await api.get("/api/stocks/search", {
          params: { q: query },
          signal: controller.signal
        });

        if (searchRequestId.current !== requestId) {
          return;
        }

        const rawResults = Array.isArray(response.data?.result)
          ? response.data.result
          : Array.isArray(response.data)
            ? response.data
            : [];
        const seen = new Set();
        const normalizedResults = rawResults
          .map(normalizeSearchResult)
          .filter(Boolean)
          .filter((item) => {
            if (!item.symbol || seen.has(item.symbol)) {
              return false;
            }
            seen.add(item.symbol);
            return true;
          });

        setSearchResults(normalizedResults);
        setHighlightedSearchIndex(0);
      } catch (err) {
        if (controller.signal.aborted || searchRequestId.current !== requestId) {
          return;
        }
        setSearchResults([]);
        setSearchError(getApiErrorMessage(err, "Unable to search stocks"));
      } finally {
        if (!controller.signal.aborted && searchRequestId.current === requestId) {
          setSearchLoading(false);
        }
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [searchSymbol]);

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

  const livePortfolioHoldings = useMemo(() => {
    return portfolioHoldings.map((item) => {
      const quote = livePrices[item.symbol];
      const livePrice = toNumber(quote?.price ?? quote?.c);
      const fallbackPrice = toNumber(item.currentPrice);
      const hasPrice = Number.isFinite(livePrice) && livePrice > 0
        ? true
        : Number.isFinite(fallbackPrice) && fallbackPrice > 0;
      const currentPrice = Number.isFinite(livePrice) && livePrice > 0 ? livePrice : hasPrice ? fallbackPrice : null;
      const quantity = toNumber(item.quantity);
      const invested = toNumber(item.invested ?? item.investedValue ?? item.totalInvested) || 0;
      const currentValue = hasPrice ? currentPrice * quantity : null;
      const previousClose = toNumber(quote?.previousClose ?? quote?.pc);
      return {
        ...item,
        currentPrice,
        currentValue,
        invested,
        todayPnl:
          Number.isFinite(currentPrice) && Number.isFinite(previousClose)
            ? (currentPrice - previousClose) * quantity
            : item.todayPnl || 0
      };
    });
  }, [livePrices, portfolioHoldings]);

  const portfolioValue = livePortfolioHoldings.reduce((sum, item) => sum + (Number(item.currentValue) || 0), 0);
  const availableCash = toNumber(user?.balance) || 0;
  const totalAccountValue = availableCash + portfolioValue;
  const totalPnl = livePortfolioHoldings.reduce((sum, item) => sum + ((Number(item.currentValue) || 0) - (Number(item.invested) || 0)), 0);
  const todayPnl = livePortfolioHoldings.reduce((sum, item) => sum + (Number(item.todayPnl) || 0), 0);
  const marketStatus = getNseMarketStatus();
  const watchlistPreview = watchlistSymbols.slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <PageHeader
          title="Dashboard"
          subtitle="Market overview, portfolio status, watchlist activity, and current trading context."
        />

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
          <GlassPanel className="flex flex-col justify-between gap-4" data-tour="stock-search">
            <div>
              <p className="text-sm font-medium text-[#A1A1B5]">
                Search
              </p>
              <h2 className="mt-1 text-xl font-semibold text-white">
                Navigate any NSE symbol in seconds
              </h2>
            </div>
            <form
              className="relative flex flex-col gap-3 sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                const selectedResult = searchResults[highlightedSearchIndex] || searchResults[0];
                if (selectedResult) {
                  selectSearchResult(selectedResult);
                } else if (searchSymbol.trim().toUpperCase().endsWith(".NS")) {
                  goToSymbol(searchSymbol);
                } else if (searchSymbol.trim().length >= 2) {
                  setSearchOpen(true);
                  setSearchError("Select a valid NSE result before opening the stock.");
                }
              }}
            >
              <div className="relative min-w-0 flex-1">
                <input
                  type="text"
                  value={searchSymbol}
                  onChange={(event) => {
                    setSearchSymbol(event.target.value);
                    setSearchOpen(true);
                  }}
                  onFocus={() => {
                    if (searchSymbol.trim().length >= 2) {
                      setSearchOpen(true);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (!searchOpen && ["ArrowDown", "ArrowUp"].includes(event.key)) {
                      setSearchOpen(true);
                      return;
                    }
                    if (event.key === "ArrowDown") {
                      event.preventDefault();
                      setHighlightedSearchIndex((current) =>
                        searchResults.length ? (current + 1) % searchResults.length : 0
                      );
                    } else if (event.key === "ArrowUp") {
                      event.preventDefault();
                      setHighlightedSearchIndex((current) =>
                        searchResults.length ? (current - 1 + searchResults.length) % searchResults.length : 0
                      );
                    } else if (event.key === "Escape") {
                      setSearchOpen(false);
                    }
                  }}
                  placeholder="Search NSE Stocks (e.g. RELIANCE)..."
                  aria-expanded={searchOpen}
                  aria-controls="dashboard-stock-search-results"
                  className="w-full rounded-2xl border border-white/10 bg-[#080910] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#6F7487] focus:border-cyan focus:ring-2 focus:ring-cyan/20"
                />

                {searchOpen && searchSymbol.trim().length >= 2 ? (
                  <div
                    id="dashboard-stock-search-results"
                    className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-50 overflow-hidden rounded-2xl border border-white/10 bg-[#121320] shadow-2xl"
                  >
                    {searchLoading ? (
                      <div className="px-4 py-3 text-sm text-[#C2C4D2]">Searching NSE stocks...</div>
                    ) : searchError ? (
                      <div className="px-4 py-3 text-sm text-red-300">{searchError}</div>
                    ) : searchResults.length > 0 ? (
                      <div className="max-h-72 overflow-y-auto py-2">
                        {searchResults.map((result, index) => (
                          <button
                            key={result.symbol}
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => selectSearchResult(result)}
                            className={`flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition ${
                              index === highlightedSearchIndex
                                ? "bg-cyan/10 text-white"
                                : "text-[#C2C4D2] hover:bg-white/[0.04] hover:text-white"
                            }`}
                          >
                            <span className="min-w-0">
                              <span className="block font-mono text-sm font-semibold">{result.symbol}</span>
                              <span className="mt-1 block truncate text-xs text-[#A1A1B5]">{result.companyName}</span>
                            </span>
                            <span className="shrink-0 rounded-md border border-white/10 px-2 py-1 text-[11px] text-cyan">
                              NSE
                            </span>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="px-4 py-3 text-sm text-[#C2C4D2]">No valid NSE results found.</div>
                    )}
                  </div>
                ) : null}
              </div>
              <button
                type="submit"
                disabled={searchLoading || (searchSymbol.trim().length >= 2 && !searchResults.length && !searchSymbol.trim().toUpperCase().endsWith(".NS"))}
                className="rounded-2xl bg-cyan px-5 py-3 text-sm font-semibold text-base transition hover:bg-cyan/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {searchLoading ? "Searching..." : "Search"}
              </button>
              <button
                type="button"
                onClick={() => goToSymbol("RELIANCE.NS")}
                className="rounded-2xl border border-white/10 bg-[#080910] px-5 py-3 text-sm font-semibold text-[#C2C4D2] transition hover:border-cyan/40 hover:text-cyan"
              >
                Try RELIANCE
              </button>
            </form>
          </GlassPanel>

          <GlassPanel className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-[#A1A1B5]">
                Market Status
              </p>
              <div className="mt-3 flex items-center gap-3">
                <span className={`h-3 w-3 rounded-full ${marketStatus.dot}`} />
                <p className={`text-lg font-semibold ${marketStatus.textTone}`}>
                  {marketStatus.label}
                </p>
              </div>
              <p className="mt-2 text-xs text-[#A1A1B5]">
                {marketStatus.open ? marketStatus.hours : marketStatus.helper}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#080910] px-4 py-3 text-right">
              <p className="text-xs text-[#A1A1B5]">
                Watchlist Feed
              </p>
              <p className="mt-2 text-2xl font-semibold text-white">{watchlistSymbols.length}</p>
              <p className="text-xs text-[#A1A1B5]">Symbols tracked</p>
            </div>
          </GlassPanel>
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      <GlassPanel className="border-cyan/20 bg-cyan/5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-cyan">Start Trading</p>
            <h2 className="mt-2 text-xl font-semibold text-white">Complete your first virtual trade in a few simple steps.</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => document.querySelector("[data-tour='stock-search'] input")?.focus()}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-cyan px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              Search Stocks
            </button>
            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent(firstTradeGuideEventName))}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-cyan/40 bg-cyan/10 px-4 py-2 text-sm font-semibold text-cyan transition hover:bg-cyan/20"
            >
              <MousePointerClick className="h-4 w-4" aria-hidden="true" />
              First Trade Guide
            </button>
            <Link
              to="/trading-guide"
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-[#E7E9F3] transition hover:border-cyan/40 hover:text-cyan"
            >
              <GraduationCap className="h-4 w-4" aria-hidden="true" />
              Learn How Trading Works
            </Link>
          </div>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {startTradingSteps.map((step, index) => (
            <div key={step} className="flex min-h-[76px] items-start gap-3 rounded-lg border border-white/10 bg-[#080910] p-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-cyan" aria-hidden="true" />
              <p className="text-sm leading-5 text-[#C2C4D2]">
                <span className="block text-xs font-semibold text-[#A1A1B5]">Step {index + 1}</span>
                {step}
              </p>
            </div>
          ))}
        </div>
      </GlassPanel>

      <div className="grid gap-6 xl:grid-cols-12">
        <div className="space-y-6 xl:col-span-8">
          <GlassPanel>
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-[#A1A1B5]">Market Feed</p>
                <h3 className="mt-1 text-xl font-semibold text-white">
                  Live NSE names from the market API
                </h3>
              </div>
              <p className="text-xs text-[#A1A1B5]">
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
                      className="rounded-2xl border border-white/10 bg-[#080910] p-4"
                    >
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="mt-4 h-7 w-3/4" />
                      <Skeleton className="mt-3 h-4 w-1/3" />
                    </div>
                  ))
                : marketUniverse.slice(0, 3).length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-[#080910] p-4 text-sm text-[#A1A1B5] md:col-span-3">
                      Market feed is unavailable right now.
                    </div>
                  ) : marketUniverse.slice(0, 3).map((item) => (
                    <div
                      key={item.symbol}
                      className="rounded-2xl border border-white/10 bg-[#080910] p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-xs font-medium text-[#A1A1B5]">
                            {stripNseSuffix(item.symbol)}
                          </p>
                          <p className="mt-2 text-xl font-semibold text-white">
                            {formatCurrency(item.currentPrice)}
                          </p>
                        </div>
                        <div
                          className={`flex h-8 min-w-12 items-center justify-center rounded-md border px-2 text-xs font-semibold ${
                            item.changePct >= 0
                              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                              : "border-red-500/30 bg-red-500/10 text-red-400"
                          }`}
                        >
                          {item.changePct >= 0 ? "Up" : "Down"}
                        </div>
                      </div>
                      <div className="mt-4 flex items-center justify-between text-sm">
                        <span className={item.changePct >= 0 ? "text-emerald-400" : "text-red-400"}>
                          {formatPercent(item.changePct)}
                        </span>
                        <span className="text-xs text-[#6F7487]">
                          Vol {formatCompact(item.volume)}
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
                  <p className="text-sm font-medium text-[#A1A1B5]">
                    Top Gainers
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-white">Strongest movers today</h3>
                </div>
                <span className="text-xs text-[#A1A1B5]">Top 5</span>
              </div>

              <div className="mt-6 space-y-3">
                {topGainers.length === 0 ? (
                  <p className="text-sm text-[#A1A1B5]">No gainers available yet.</p>
                ) : (
                  topGainers.map((item, index) => (
                    <Link
                      key={item.symbol}
                      to={`/stocks/${stripNseSuffix(item.symbol)}`}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#080910] px-4 py-3 transition hover:border-cyan/40 hover:bg-[#1A1B2B]"
                    >
                      <div>
                        <p className="text-xs font-medium text-[#A1A1B5]">
                          #{index + 1} {stripNseSuffix(item.symbol)}
                        </p>
                        <p className="mt-1 text-sm text-[#C2C4D2]">{item.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-white">{formatCurrency(item.currentPrice)}</p>
                        <p className="text-xs text-emerald-400">{formatPercent(item.changePct)}</p>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </GlassPanel>

            <GlassPanel>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-[#A1A1B5]">
                    Top Losers
                  </p>
                  <h3 className="mt-1 text-lg font-semibold text-white">Weakest movers today</h3>
                </div>
                <span className="text-xs text-[#A1A1B5]">Top 5</span>
              </div>

              <div className="mt-6 space-y-3">
                {topLosers.length === 0 ? (
                  <p className="text-sm text-[#A1A1B5]">No losers available yet.</p>
                ) : (
                  topLosers.map((item, index) => (
                    <Link
                      key={item.symbol}
                      to={`/stocks/${stripNseSuffix(item.symbol)}`}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#080910] px-4 py-3 transition hover:border-red-500/40 hover:bg-[#1A1B2B]"
                    >
                      <div>
                        <p className="text-xs font-medium text-[#A1A1B5]">
                          #{index + 1} {stripNseSuffix(item.symbol)}
                        </p>
                        <p className="mt-1 text-sm text-[#C2C4D2]">{item.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-mono text-white">{formatCurrency(item.currentPrice)}</p>
                        <p className="text-xs text-red-400">{formatPercent(item.changePct)}</p>
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </GlassPanel>
          </div>

          <GlassPanel id="market-news">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[#A1A1B5]">
                  Trending Stocks
                </p>
                <h3 className="mt-1 text-lg font-semibold text-white">Top volume names in focus</h3>
              </div>
              <span className="text-xs text-[#A1A1B5]">Top 5 by volume</span>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
              {topVolumeStocks.length === 0 ? (
                <div className="text-sm text-[#A1A1B5] md:col-span-2 xl:col-span-5">
                  Volume data is currently unavailable.
                </div>
              ) : (
                topVolumeStocks.map((item) => (
                  <Link
                    key={item.symbol}
                    to={`/stocks/${stripNseSuffix(item.symbol)}`}
                    className="rounded-2xl border border-white/10 bg-[#080910] p-4 transition hover:border-cyan/40 hover:bg-[#1A1B2B]"
                  >
                    <p className="text-xs font-medium text-[#A1A1B5]">
                      {stripNseSuffix(item.symbol)}
                    </p>
                    <p className="mt-2 text-sm font-medium text-[#E7E9F3]">{item.name}</p>
                    <p className="mt-4 font-mono text-lg text-white">
                      {formatCurrency(item.currentPrice)}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-xs">
                      <span className={item.changePct >= 0 ? "text-emerald-400" : "text-red-400"}>
                        {formatPercent(item.changePct)}
                      </span>
                      <span className="text-[#A1A1B5]">Vol {formatCompact(item.volume)}</span>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </GlassPanel>

          <GlassPanel>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[#A1A1B5]">
                  Market News
                </p>
                <h3 className="mt-1 text-lg font-semibold text-white">Latest market headlines</h3>
              </div>
              <span className="text-xs text-[#A1A1B5]">Clickable cards</span>
            </div>

            <div className="mt-6 space-y-3">
              {newsItems.length === 0 ? (
                <p className="text-sm text-[#A1A1B5]">No news feed available right now.</p>
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
                      className="block rounded-2xl border border-white/10 bg-[#080910] px-4 py-4 transition hover:border-cyan/40 hover:bg-[#1A1B2B]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-cyan">
                            {item.source || "Market News"}
                          </p>
                          <p className="mt-2 line-clamp-2 text-sm font-medium text-white">
                            {item.headline || item.summary || "Market update"}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-md border border-white/10 px-3 py-1 text-xs text-[#A1A1B5]">
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
                <p className="text-sm font-medium text-[#A1A1B5]">
                  Portfolio Snapshot
                </p>
                <h3 className="mt-1 text-lg font-semibold text-white">Account overview</h3>
              </div>
              <span className="text-xs text-[#A1A1B5]">Live</span>
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
                  data-tour={item.label === "Available Cash" ? "virtual-balance" : undefined}
                  className="rounded-2xl border border-white/10 bg-[#080910] px-4 py-4"
                >
                  <p className="flex items-center gap-2 text-xs font-medium text-[#A1A1B5]">
                    {item.label}
                    {item.label === "Available Cash" ? <HelpTooltip term="availableBalance" label="Available Balance" /> : null}
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </GlassPanel>

          <GlassPanel>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[#A1A1B5]">
                  Watchlist
                </p>
                <h3 className="mt-1 text-lg font-semibold text-white">Symbols on your radar</h3>
              </div>
              <span className="text-xs text-[#A1A1B5]">{watchlistPreview.length} shown</span>
            </div>

            <div className="mt-6 space-y-3">
              {watchlistPreview.length === 0 ? (
                <p className="text-sm text-[#A1A1B5]">
                  Add symbols to your watchlist to see live prices here.
                </p>
              ) : (
                watchlistPreview.map((symbol) => {
                  const normalizedSymbol = ensureNseSuffix(symbol);
                  const quote =
                    livePrices[normalizedSymbol] ||
                    marketUniverse.find((item) => item.symbol === normalizedSymbol) ||
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
                      to={`/stocks/${normalizedSymbol}`}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-[#080910] px-4 py-3 transition hover:border-cyan/40 hover:bg-[#1A1B2B]"
                    >
                      <div>
                        <p className="text-xs font-medium text-[#A1A1B5]">{symbol}</p>
                        <p className="mt-2 font-mono text-lg text-white">{formatCurrency(currentPrice)}</p>
                      </div>
                      <p className={`text-sm ${changePct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
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
                <p className="text-sm font-medium text-[#A1A1B5]">
                  Market Status
                </p>
                <h3 className="mt-1 text-lg font-semibold text-white">Session state</h3>
              </div>
              <span className={`text-sm font-semibold ${marketStatus.textTone}`}>
                {marketStatus.label}
              </span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-2xl border border-white/10 bg-[#080910] px-4 py-4">
                <p className="text-xs font-medium text-[#A1A1B5]">State</p>
                <p className={`mt-3 text-2xl font-semibold ${marketStatus.textTone}`}>
                  {marketStatus.label}
                </p>
                <p className="mt-2 text-xs text-[#A1A1B5]">{marketStatus.helper}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#080910] px-4 py-4">
                <p className="text-xs font-medium text-[#A1A1B5]">
                  Last Updated
                </p>
                <p className="mt-3 text-2xl font-semibold text-white">{marketStatus.clock}</p>
              </div>
            </div>
          </GlassPanel>
        </div>
      </div>

      <GlassPanel>
        <h3 className="text-sm font-semibold text-[#C2C4D2]">
          Quick Links
        </h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {quickLinks.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="rounded-2xl border border-white/10 bg-[#080910] px-4 py-3 text-sm font-medium text-[#C2C4D2] transition hover:border-cyan/40 hover:bg-[#1A1B2B] hover:text-white"
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
