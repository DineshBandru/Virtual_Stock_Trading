import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowDownAZ,
  ArrowDownZA,
  ArrowUpDown,
  BarChart3,
  Loader2,
  PencilLine,
  Plus,
  Search,
  Trash2,
  TrendingUp,
  TrendingDown
} from "lucide-react";
import GlassPanel from "../components/GlassPanel";
import PageHeader from "../components/PageHeader";
import { Skeleton } from "../components/Skeleton";
import useLivePrices from "../hooks/useLivePrices";
import useToast from "../hooks/useToast";
import api from "../utils/api";
import { getApiErrorMessage } from "../utils/errorMessage";

const formatPrice = (value) => {
  if (!Number.isFinite(value)) {
    return "—";
  }
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

const formatChange = (value) => {
  if (!Number.isFinite(value)) {
    return "—";
  }
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(2)}`;
};

const formatPercent = (value) => {
  if (!Number.isFinite(value)) {
    return "—";
  }
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${value.toFixed(2)}%`;
};

const formatVolume = (value) => {
  if (!Number.isFinite(value)) {
    return "—";
  }
  return new Intl.NumberFormat("en-IN", {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
};

const Watchlist = () => {
  const prices = useLivePrices();
  const { pushToast } = useToast();
  const [watchlistData, setWatchlistData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [newListName, setNewListName] = useState("");
  const [creatingList, setCreatingList] = useState(false);
  const [renamingListId, setRenamingListId] = useState("");
  const [renameValue, setRenameValue] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "symbol", direction: "asc" });
  const [savingSymbol, setSavingSymbol] = useState("");

  const loadWatchlist = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/api/watchlist");
      setWatchlistData(response.data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load watchlist"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWatchlist();
  }, [loadWatchlist]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchError("");
      setSearchLoading(false);
      return undefined;
    }

    setSearchLoading(true);
    setSearchError("");
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await api.get("/api/stocks/search", {
          params: { q: searchQuery.trim() },
          signal: controller.signal
        });
        setSearchResults(response.data?.result || []);
      } catch (err) {
        if (err?.name !== "CanceledError" && err?.code !== "ERR_CANCELED") {
          setSearchError(getApiErrorMessage(err, "Search failed"));
        }
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [searchQuery]);

  const activeList = useMemo(() => {
    const lists = watchlistData?.lists || [];
    if (lists.length === 0) {
      return null;
    }
    return (
      lists.find((list) => list.id === watchlistData?.activeListId) ||
      watchlistData?.activeList ||
      lists[0]
    );
  }, [watchlistData]);

  const listItems = activeList?.items || [];
  const activeSymbols = useMemo(() => new Set(listItems.map((item) => item.symbol)), [listItems]);

  const rows = useMemo(() => {
    return listItems.map((item) => {
      const quote = prices[item.symbol];
      const current = Number(quote?.c);
      const previous = Number(quote?.pc);
      const dayChange = Number.isFinite(current) && Number.isFinite(previous) ? current - previous : Number.NaN;
      const dayChangePct = Number.isFinite(current) && Number.isFinite(previous) && previous !== 0 ? ((current - previous) / previous) * 100 : Number.NaN;

      return {
        symbol: item.symbol,
        companyName: item.companyName || item.symbol,
        current,
        dayChange,
        dayChangePct,
        volume: Number(quote?.v),
        high: Number(quote?.h),
        low: Number(quote?.l),
        quote
      };
    });
  }, [listItems, prices]);

  const sortedRows = useMemo(() => {
    const direction = sortConfig.direction === "asc" ? 1 : -1;
    const key = sortConfig.key;

    return [...rows].sort((left, right) => {
      const leftValue = left[key];
      const rightValue = right[key];

      if (key === "symbol" || key === "companyName") {
        return String(leftValue).localeCompare(String(rightValue)) * direction;
      }

      const safeLeft = Number.isFinite(leftValue) ? leftValue : sortConfig.direction === "asc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
      const safeRight = Number.isFinite(rightValue) ? rightValue : sortConfig.direction === "asc" ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
      return (safeLeft - safeRight) * direction;
    });
  }, [rows, sortConfig]);

  const summary = useMemo(() => {
    const gains = rows.filter((row) => Number.isFinite(row.dayChangePct) && row.dayChangePct >= 0).length;
    const losses = rows.filter((row) => Number.isFinite(row.dayChangePct) && row.dayChangePct < 0).length;
    const avgChange = rows.length
      ? rows.reduce((sum, row) => sum + (Number.isFinite(row.dayChangePct) ? row.dayChangePct : 0), 0) / rows.length
      : 0;
    const totalVolume = rows.reduce((sum, row) => sum + (Number.isFinite(row.volume) ? row.volume : 0), 0);

    return [
      {
        label: "Symbols",
        value: rows.length,
        detail: activeList?.name || "No watchlist selected",
        icon: BarChart3
      },
      {
        label: "Advancers",
        value: gains,
        detail: `${losses} declining`,
        icon: losses > 0 ? TrendingDown : TrendingUp
      },
      {
        label: "Avg Move",
        value: `${formatPercent(avgChange)}`,
        detail: "Selected list",
        icon: ArrowUpDown
      },
      {
        label: "Volume",
        value: formatVolume(totalVolume),
        detail: "Combined live volume",
        icon: BarChart3
      }
    ];
  }, [activeList?.name, rows]);

  const selectedListId = activeList?.id || "";

  const handleSelectList = useCallback(async (listId) => {
    if (!listId || listId === selectedListId) {
      return;
    }

    try {
      const response = await api.patch(`/api/watchlist/active/${listId}`);
      setWatchlistData(response.data);
    } catch (err) {
      pushToast(getApiErrorMessage(err, "Unable to switch watchlist"), "error");
    }
  }, [pushToast, selectedListId]);

  const handleCreateList = useCallback(async (event) => {
    event.preventDefault();
    const name = newListName.trim();
    if (!name) {
      return;
    }

    try {
      const response = await api.post("/api/watchlist/lists", { name });
      setWatchlistData(response.data);
      setNewListName("");
      setCreatingList(false);
      pushToast("Watchlist created", "success");
    } catch (err) {
      pushToast(getApiErrorMessage(err, "Unable to create watchlist"), "error");
    }
  }, [newListName, pushToast]);

  const beginRename = useCallback((list) => {
    setRenamingListId(list.id);
    setRenameValue(list.name);
  }, []);

  const handleRenameList = useCallback(async (event) => {
    event.preventDefault();
    const name = renameValue.trim();
    if (!name || !renamingListId) {
      return;
    }

    try {
      const response = await api.patch(`/api/watchlist/lists/${renamingListId}`, { name });
      setWatchlistData(response.data);
      setRenamingListId("");
      setRenameValue("");
      pushToast("Watchlist renamed", "success");
    } catch (err) {
      pushToast(getApiErrorMessage(err, "Unable to rename watchlist"), "error");
    }
  }, [pushToast, renameValue, renamingListId]);

  const handleDeleteList = useCallback(async (list) => {
    if (!list?.id) {
      return;
    }

    const confirmed = window.confirm(`Delete ${list.name}?`);
    if (!confirmed) {
      return;
    }

    try {
      const response = await api.delete(`/api/watchlist/lists/${list.id}`);
      setWatchlistData(response.data);
      pushToast("Watchlist deleted", "success");
    } catch (err) {
      pushToast(getApiErrorMessage(err, "Unable to delete watchlist"), "error");
    }
  }, [pushToast]);

  const handleAddSymbol = useCallback(async (result) => {
    if (!result?.symbol || !selectedListId) {
      return;
    }

    try {
      setSavingSymbol(result.symbol);
      const response = await api.post("/api/watchlist/add", {
        symbol: result.symbol,
        companyName: result.description,
        listId: selectedListId
      });
      setWatchlistData(response.data);
      pushToast(`${result.symbol} added to watchlist`, "success");
    } catch (err) {
      pushToast(getApiErrorMessage(err, "Unable to add symbol"), "error");
    } finally {
      setSavingSymbol("");
    }
  }, [pushToast, selectedListId]);

  const handleRemoveSymbol = useCallback(async (symbol) => {
    if (!symbol || !selectedListId) {
      return;
    }

    try {
      setSavingSymbol(symbol);
      const response = await api.delete(`/api/watchlist/remove/${symbol}`, {
        params: { listId: selectedListId }
      });
      setWatchlistData(response.data);
      pushToast(`${symbol} removed from watchlist`, "success");
    } catch (err) {
      pushToast(getApiErrorMessage(err, "Unable to remove symbol"), "error");
    } finally {
      setSavingSymbol("");
    }
  }, [pushToast, selectedListId]);

  const toggleSort = useCallback((key) => {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === "asc" ? "desc" : "asc"
    }));
  }, []);

  const activeQueryResults = searchResults.filter((result) => result?.symbol && !activeSymbols.has(result.symbol));

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <ArrowUpDown className="h-4 w-4 text-[#6F7487]" />;
    }

    return sortConfig.direction === "asc" ? (
      <ArrowDownAZ className="h-4 w-4 text-cyan" />
    ) : (
      <ArrowDownZA className="h-4 w-4 text-cyan" />
    );
  };

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        title="Watchlist"
        subtitle="Build multiple trading watchlists, track live prices, and manage symbols from one place."
      />

      <div className="grid gap-4 lg:grid-cols-4">
        {summary.map((item) => {
          const Icon = item.icon;
          return (
            <GlassPanel key={item.label} className="border-white/10 bg-[#121320] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase text-[#A1A1B5]">{item.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{item.value}</p>
                  <p className="mt-1 text-xs text-[#6F7487]">{item.detail}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-[#080910] p-2 text-cyan">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
            </GlassPanel>
          );
        })}
      </div>

      <GlassPanel className="space-y-6">
        {error ? (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-xs text-red-200">
            <span>{error}</span>
            <button
              type="button"
              onClick={loadWatchlist}
              className="rounded-2xl border border-red-300/60 px-4 py-2 text-[11px] font-semibold text-red-100 transition hover:bg-red-500/20"
            >
              Retry
            </button>
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-[280px_minmax(0,1fr)]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-[#080910] p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase text-[#A1A1B5]">Watchlists</p>
                  <h2 className="mt-2 text-lg font-semibold text-white">Manage lists</h2>
                </div>
                <button
                  type="button"
                  onClick={() => setCreatingList((current) => !current)}
                  className="inline-flex items-center gap-2 rounded-2xl border border-cyan/40 bg-cyan/10 px-3 py-2 text-[11px] font-semibold text-cyan transition hover:bg-cyan/20"
                >
                  <Plus className="h-3.5 w-3.5" />
                  New
                </button>
              </div>

              {creatingList ? (
                <form onSubmit={handleCreateList} className="mt-4 space-y-3">
                  <input
                    type="text"
                    value={newListName}
                    onChange={(event) => setNewListName(event.target.value)}
                    placeholder="Growth ideas"
                    className="w-full rounded-2xl border border-white/10 bg-[#080910] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#6F7487] focus:border-cyan/70"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="submit"
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-cyan px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100"
                    >
                      Create
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setCreatingList(false);
                        setNewListName("");
                      }}
                      className="inline-flex items-center justify-center rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-[#C2C4D2] transition hover:bg-white/5"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : null}

              <div className="mt-4 space-y-2">
                {loading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <Skeleton key={index} className="h-12 w-full rounded-2xl" />
                  ))
                ) : (
                  (watchlistData?.lists || []).map((list) => {
                    const isActive = list.id === selectedListId;
                    return (
                      <button
                        key={list.id}
                        type="button"
                        onClick={() => handleSelectList(list.id)}
                        className={`flex w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                          isActive
                            ? "border-cyan/50 bg-cyan/10 text-white"
                            : "border-white/10 bg-[#121320] text-[#C2C4D2] hover:border-cyan/40 hover:bg-white/5"
                        }`}
                      >
                        <div>
                          <p className="font-medium">{list.name}</p>
                          <p className="text-xs text-[#6F7487]">{list.items?.length || 0} symbols</p>
                        </div>
                        {list.isDefault ? (
                          <span className="rounded-2xl border border-white/10 px-2 py-1 text-[10px] uppercase text-[#A1A1B5]">
                            Default
                          </span>
                        ) : null}
                      </button>
                    );
                  })
                )}
              </div>

              {activeList ? (
                <div className="mt-4 rounded-2xl border border-white/10 bg-[#121320] p-4">
                  {renamingListId === activeList.id ? (
                    <form onSubmit={handleRenameList} className="space-y-3">
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(event) => setRenameValue(event.target.value)}
                        className="w-full rounded-2xl border border-white/10 bg-[#080910] px-4 py-3 text-sm text-white outline-none transition focus:border-cyan/70"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="submit"
                          className="inline-flex flex-1 items-center justify-center rounded-2xl bg-cyan px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRenamingListId("");
                            setRenameValue("");
                          }}
                          className="rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-[#C2C4D2] transition hover:bg-white/5"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <p className="text-[11px] uppercase text-[#A1A1B5]">Selected list</p>
                        <h3 className="mt-2 text-lg font-semibold text-white">{activeList.name}</h3>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => beginRename(activeList)}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 px-3 py-2 text-xs font-semibold text-[#C2C4D2] transition hover:bg-white/5"
                        >
                          <PencilLine className="h-3.5 w-3.5" />
                          Rename
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteList(activeList)}
                          disabled={Boolean(activeList.isDefault)}
                          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-red-500/40 px-3 py-2 text-xs font-semibold text-red-200 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : null}
            </div>

            <div className="rounded-2xl border border-white/10 bg-[#080910] p-4">
              <p className="text-[11px] uppercase text-[#A1A1B5]">Add symbols</p>
              <h2 className="mt-2 text-lg font-semibold text-white">Search and add</h2>
              <div className="relative mt-4">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6F7487]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search symbols or company names"
                  className="w-full rounded-2xl border border-white/10 bg-[#121320] py-3 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-[#6F7487] focus:border-cyan/70"
                />
              </div>

              <div className="mt-4 space-y-3">
                {searchLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-14 w-full rounded-2xl" />
                    <Skeleton className="h-14 w-full rounded-2xl" />
                    <Skeleton className="h-14 w-full rounded-2xl" />
                  </div>
                ) : searchError ? (
                  <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-200">{searchError}</p>
                ) : activeQueryResults.length > 0 ? (
                  activeQueryResults.slice(0, 6).map((result) => (
                    <div
                      key={result.symbol}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-[#121320] px-4 py-3"
                    >
                      <div>
                        <p className="font-mono text-sm text-white">{result.symbol}</p>
                        <p className="text-xs text-[#A1A1B5]">{result.description}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddSymbol(result)}
                        disabled={savingSymbol === result.symbol || !selectedListId}
                        className="inline-flex items-center gap-2 rounded-2xl bg-cyan px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {savingSymbol === result.symbol ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                        Add
                      </button>
                    </div>
                  ))
                ) : searchQuery.trim() ? (
                  <div className="rounded-2xl border border-white/10 bg-[#121320] px-4 py-8 text-center text-sm text-[#A1A1B5]">
                    No matching symbols found.
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-[#121320] px-4 py-8 text-center text-sm text-[#A1A1B5]">
                    Search for a stock to add it to the selected watchlist.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="min-w-0 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[11px] uppercase text-[#A1A1B5]">Holdings</p>
                <h2 className="mt-2 text-lg font-semibold text-white">{activeList?.name || "Watchlist"}</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleSort("symbol")}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-3 py-2 text-xs font-semibold text-[#C2C4D2] transition hover:bg-white/5"
                >
                  Symbol {renderSortIcon("symbol")}
                </button>
                <button
                  type="button"
                  onClick={() => toggleSort("current")}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-3 py-2 text-xs font-semibold text-[#C2C4D2] transition hover:bg-white/5"
                >
                  Price {renderSortIcon("current")}
                </button>
                <button
                  type="button"
                  onClick={() => toggleSort("dayChangePct")}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 px-3 py-2 text-xs font-semibold text-[#C2C4D2] transition hover:bg-white/5"
                >
                  Change % {renderSortIcon("dayChangePct")}
                </button>
              </div>
            </div>

            {loading ? (
              <div className="space-y-3 rounded-2xl border border-white/10 bg-[#121320] p-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="grid gap-3 rounded-2xl border border-white/10 bg-[#080910] p-4 xl:grid-cols-8">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-full xl:col-span-2" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                ))}
              </div>
            ) : sortedRows.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 bg-[#080910] p-8 md:p-10">
                <p className="text-xs font-medium text-[#A1A1B5]">Empty watchlist</p>
                <h3 className="mt-4 text-2xl font-semibold text-white">Start with a few symbols</h3>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-[#C2C4D2]">
                  Search for a company on the left, add it to this list, and the table will come alive with live prices, day change, volume, and range.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => setSearchQuery("RELIANCE")}
                    className="rounded-2xl bg-cyan px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100"
                  >
                    Try RELIANCE
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreatingList(true)}
                    className="rounded-2xl border border-white/10 px-4 py-2 text-sm font-semibold text-[#E7E9F3] transition hover:bg-white/5"
                  >
                    Create another watchlist
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="hidden overflow-hidden rounded-2xl border border-white/10 bg-[#121320] xl:block">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-white/10 text-left">
                      <thead className="bg-[#080910] text-[11px] uppercase text-[#A1A1B5]">
                        <tr>
                          <th className="px-4 py-4">Symbol</th>
                          <th className="px-4 py-4">Company Name</th>
                          <th className="px-4 py-4 text-right">Current Price</th>
                          <th className="px-4 py-4 text-right">Day Change</th>
                          <th className="px-4 py-4 text-right">Day Change %</th>
                          <th className="px-4 py-4 text-right">Volume</th>
                          <th className="px-4 py-4 text-right">High</th>
                          <th className="px-4 py-4 text-right">Low</th>
                          <th className="px-4 py-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {sortedRows.map((row) => {
                          const isUp = Number.isFinite(row.dayChange) && row.dayChange >= 0;
                          return (
                            <tr key={row.symbol} className="transition hover:bg-white/5">
                              <td className="px-4 py-4">
                                <div>
                                  <p className="font-mono text-sm font-semibold text-white">{row.symbol}</p>
                                  <p className="text-xs text-[#6F7487]">Live</p>
                                </div>
                              </td>
                              <td className="px-4 py-4 text-sm text-[#C2C4D2]">{row.companyName}</td>
                              <td className="px-4 py-4 text-right font-mono text-sm text-white">{formatPrice(row.current)}</td>
                              <td className={`px-4 py-4 text-right font-mono text-sm ${isUp ? "text-emerald-400" : "text-red-400"}`}>
                                {formatChange(row.dayChange)}
                              </td>
                              <td className={`px-4 py-4 text-right font-mono text-sm ${isUp ? "text-emerald-400" : "text-red-400"}`}>
                                {formatPercent(row.dayChangePct)}
                              </td>
                              <td className="px-4 py-4 text-right font-mono text-sm text-[#C2C4D2]">{formatVolume(row.volume)}</td>
                              <td className="px-4 py-4 text-right font-mono text-sm text-[#C2C4D2]">{formatPrice(row.high)}</td>
                              <td className="px-4 py-4 text-right font-mono text-sm text-[#C2C4D2]">{formatPrice(row.low)}</td>
                              <td className="px-4 py-4">
                                <div className="flex justify-end gap-2">
                                  <Link
                                    to={`/stocks/${row.symbol}`}
                                    className="rounded-2xl border border-white/10 px-3 py-2 text-xs font-semibold text-[#C2C4D2] transition hover:bg-white/5"
                                  >
                                    Open
                                  </Link>
                                  <Link
                                    to={`/stocks/${row.symbol}`}
                                    className="rounded-2xl border border-cyan/40 bg-cyan/10 px-3 py-2 text-xs font-semibold text-cyan transition hover:bg-cyan/20"
                                  >
                                    Buy
                                  </Link>
                                  <Link
                                    to={`/stocks/${row.symbol}`}
                                    className="rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-500/20"
                                  >
                                    Sell
                                  </Link>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveSymbol(row.symbol)}
                                    disabled={savingSymbol === row.symbol}
                                    className="rounded-2xl border border-red-500/40 px-3 py-2 text-xs font-semibold text-red-200 transition hover:bg-red-500/10 disabled:opacity-60"
                                  >
                                    {savingSymbol === row.symbol ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Remove"}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="grid gap-3 xl:hidden">
                  {sortedRows.map((row) => {
                    const isUp = Number.isFinite(row.dayChange) && row.dayChange >= 0;
                    return (
                      <div key={row.symbol} className="rounded-2xl border border-white/10 bg-[#121320] p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-mono text-base font-semibold text-white">{row.symbol}</p>
                            <p className="mt-1 text-sm text-[#A1A1B5]">{row.companyName}</p>
                          </div>
                          <div className={`text-right ${isUp ? "text-emerald-400" : "text-red-400"}`}>
                            <p className="font-mono text-lg font-semibold text-white">{formatPrice(row.current)}</p>
                            <p className="text-xs font-medium">{formatPercent(row.dayChangePct)}</p>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-[#A1A1B5]">
                          <div className="rounded-2xl border border-white/10 bg-[#080910] p-3">
                            <p>Day Change</p>
                            <p className={`mt-1 font-mono text-sm ${isUp ? "text-emerald-400" : "text-red-400"}`}>{formatChange(row.dayChange)}</p>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-[#080910] p-3">
                            <p>Volume</p>
                            <p className="mt-1 font-mono text-sm text-white">{formatVolume(row.volume)}</p>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-[#080910] p-3">
                            <p>High</p>
                            <p className="mt-1 font-mono text-sm text-white">{formatPrice(row.high)}</p>
                          </div>
                          <div className="rounded-2xl border border-white/10 bg-[#080910] p-3">
                            <p>Low</p>
                            <p className="mt-1 font-mono text-sm text-white">{formatPrice(row.low)}</p>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <Link
                            to={`/stocks/${row.symbol}`}
                            className="rounded-2xl border border-white/10 px-3 py-2 text-xs font-semibold text-[#C2C4D2] transition hover:bg-white/5"
                          >
                            Open
                          </Link>
                          <Link
                            to={`/stocks/${row.symbol}`}
                            className="rounded-2xl border border-cyan/40 bg-cyan/10 px-3 py-2 text-xs font-semibold text-cyan transition hover:bg-cyan/20"
                          >
                            Buy
                          </Link>
                          <Link
                            to={`/stocks/${row.symbol}`}
                            className="rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-500/20"
                          >
                            Sell
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleRemoveSymbol(row.symbol)}
                            disabled={savingSymbol === row.symbol}
                            className="rounded-2xl border border-red-500/40 px-3 py-2 text-xs font-semibold text-red-200 transition hover:bg-red-500/10 disabled:opacity-60"
                          >
                            {savingSymbol === row.symbol ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Remove"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      </GlassPanel>
    </div>
  );
};

export default Watchlist;
