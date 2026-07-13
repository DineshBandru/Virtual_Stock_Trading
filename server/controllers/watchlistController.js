const mongoose = require("mongoose");
const Watchlist = require("../models/Watchlist");

const DEFAULT_LIST_NAME = "Default Watchlist";

const getListId = (list) => String(list?._id || list?.id || "");

const normalizeEntry = (entry) => {
  if (!entry) {
    return null;
  }

  if (typeof entry === "string") {
    const symbol = entry.trim().toUpperCase();
    return symbol ? { symbol, companyName: "" } : null;
  }

  const symbol = String(entry.symbol || entry.ticker || "").trim().toUpperCase();
  if (!symbol) {
    return null;
  }

  return {
    symbol,
    companyName: String(entry.companyName || entry.name || "").trim()
  };
};

const normalizeItems = (list) => {
  const rawItems = Array.isArray(list.items) && list.items.length > 0 ? list.items : list.symbols || [];
  const seen = new Set();
  const items = [];

  rawItems.forEach((entry) => {
    const normalized = normalizeEntry(entry);
    if (!normalized || seen.has(normalized.symbol)) {
      return;
    }
    seen.add(normalized.symbol);
    items.push(normalized);
  });

  return items;
};

const getListSnapshot = (list) => ({
  id: getListId(list),
  name: list.name,
  isDefault: Boolean(list.isDefault),
  items: normalizeItems(list),
  symbols: normalizeItems(list).map((item) => item.symbol),
  createdAt: list.createdAt,
  updatedAt: list.updatedAt
});

const ensureNormalizedWatchlist = async (userId) => {
  let watchlist = await Watchlist.findOne({ userId });

  if (!watchlist) {
    watchlist = await Watchlist.create({
      userId,
      lists: [
        {
          name: DEFAULT_LIST_NAME,
          isDefault: true,
          items: [],
          symbols: []
        }
      ]
    });
  }

  if (!Array.isArray(watchlist.lists) || watchlist.lists.length === 0) {
    const legacySymbols = Array.isArray(watchlist.symbols) ? watchlist.symbols : [];
    watchlist.lists = [
      {
        name: DEFAULT_LIST_NAME,
        isDefault: true,
        items: legacySymbols.map((symbol) => normalizeEntry(symbol)).filter(Boolean),
        symbols: legacySymbols.map((symbol) => String(symbol).trim().toUpperCase()).filter(Boolean)
      }
    ];
  }

  if (!watchlist.lists.some((list) => list.isDefault)) {
    watchlist.lists[0].isDefault = true;
  }

  if (!watchlist.activeListId || !watchlist.lists.some((list) => getListId(list) === String(watchlist.activeListId))) {
    const defaultList = watchlist.lists.find((list) => list.isDefault) || watchlist.lists[0];
    watchlist.activeListId = defaultList?._id;
  }

  const activeList = watchlist.lists.find((list) => getListId(list) === String(watchlist.activeListId)) || watchlist.lists[0];
  const activeItems = normalizeItems(activeList || {});
  activeList.items = activeItems;
  activeList.symbols = activeItems.map((item) => item.symbol);
  watchlist.symbols = activeList.symbols;

  await watchlist.save();
  return watchlist;
};

const serializeWatchlist = (watchlist) => {
  const lists = Array.isArray(watchlist.lists) ? watchlist.lists.map(getListSnapshot) : [];
  const activeList = lists.find((list) => list.id === String(watchlist.activeListId)) || lists[0] || null;

  return {
    id: String(watchlist._id),
    activeListId: activeList?.id || null,
    lists,
    activeList,
    symbols: activeList?.symbols || []
  };
};

const getTargetList = (watchlist, listId) => {
  const normalizedListId = listId ? String(listId) : String(watchlist.activeListId || "");
  return (
    watchlist.lists.find((list) => getListId(list) === normalizedListId) ||
    watchlist.lists.find((list) => list.isDefault) ||
    watchlist.lists[0]
  );
};

const getWatchlist = async (req, res, next) => {
  try {
    const watchlist = await ensureNormalizedWatchlist(req.user.id);
    res.json(serializeWatchlist(watchlist));
  } catch (error) {
    next(error);
  }
};

const createWatchlist = async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();
    if (!name) {
      return res.status(400).json({ message: "Watchlist name is required" });
    }

    const watchlist = await ensureNormalizedWatchlist(req.user.id);
    const duplicate = watchlist.lists.some((list) => list.name.toLowerCase() === name.toLowerCase());
    if (duplicate) {
      return res.status(400).json({ message: "A watchlist with that name already exists" });
    }

    watchlist.lists.push({ name, isDefault: false, items: [], symbols: [] });
    await watchlist.save();
    res.status(201).json(serializeWatchlist(watchlist));
  } catch (error) {
    next(error);
  }
};

const renameWatchlist = async (req, res, next) => {
  try {
    const name = String(req.body.name || "").trim();
    if (!name) {
      return res.status(400).json({ message: "Watchlist name is required" });
    }

    const watchlist = await ensureNormalizedWatchlist(req.user.id);
    const list = watchlist.lists.id(req.params.listId);
    if (!list) {
      return res.status(404).json({ message: "Watchlist not found" });
    }

    const duplicate = watchlist.lists.some((item) => item._id.toString() !== list._id.toString() && item.name.toLowerCase() === name.toLowerCase());
    if (duplicate) {
      return res.status(400).json({ message: "A watchlist with that name already exists" });
    }

    list.name = name;
    await watchlist.save();
    res.json(serializeWatchlist(watchlist));
  } catch (error) {
    next(error);
  }
};

const deleteWatchlist = async (req, res, next) => {
  try {
    const watchlist = await ensureNormalizedWatchlist(req.user.id);
    const list = watchlist.lists.id(req.params.listId);
    if (!list) {
      return res.status(404).json({ message: "Watchlist not found" });
    }

    if (watchlist.lists.length === 1) {
      return res.status(400).json({ message: "You need at least one watchlist" });
    }

    if (list.isDefault) {
      return res.status(400).json({ message: "The default watchlist cannot be deleted" });
    }

    const wasActive = watchlist.activeListId && list._id.toString() === String(watchlist.activeListId);
    watchlist.lists.pull(list._id);

    if (wasActive) {
      const fallback = watchlist.lists.find((item) => item.isDefault) || watchlist.lists[0];
      watchlist.activeListId = fallback?._id || null;
      const fallbackItems = normalizeItems(fallback || {});
      if (fallback) {
        fallback.items = fallbackItems;
        fallback.symbols = fallbackItems.map((item) => item.symbol);
      }
      watchlist.symbols = fallbackItems.map((item) => item.symbol);
    }

    await watchlist.save();
    res.json(serializeWatchlist(watchlist));
  } catch (error) {
    next(error);
  }
};

const setActiveWatchlist = async (req, res, next) => {
  try {
    const watchlist = await ensureNormalizedWatchlist(req.user.id);
    const list = watchlist.lists.id(req.params.listId);
    if (!list) {
      return res.status(404).json({ message: "Watchlist not found" });
    }

    watchlist.activeListId = list._id;
    const activeItems = normalizeItems(list);
    list.items = activeItems;
    list.symbols = activeItems.map((item) => item.symbol);
    watchlist.symbols = list.symbols;
    await watchlist.save();
    res.json(serializeWatchlist(watchlist));
  } catch (error) {
    next(error);
  }
};

const addToWatchlist = async (req, res, next) => {
  try {
    const symbol = String(req.body.symbol || "").trim().toUpperCase();
    if (!symbol) {
      return res.status(400).json({ message: "Symbol is required" });
    }

    const companyName = String(req.body.companyName || req.body.name || "").trim();

    const watchlist = await ensureNormalizedWatchlist(req.user.id);
    const targetList = getTargetList(watchlist, req.body.listId);
    if (!targetList) {
      return res.status(404).json({ message: "Watchlist not found" });
    }

    const items = normalizeItems(targetList);
    if (!items.some((item) => item.symbol === symbol)) {
      items.push({ symbol, companyName });
    }

    targetList.items = items;
    targetList.symbols = items.map((item) => item.symbol);

    if (String(targetList._id) === String(watchlist.activeListId)) {
      watchlist.symbols = targetList.symbols;
    }

    await watchlist.save();
    res.json(serializeWatchlist(watchlist));
  } catch (error) {
    next(error);
  }
};

const removeFromWatchlist = async (req, res, next) => {
  try {
    const watchlist = await ensureNormalizedWatchlist(req.user.id);
    const targetList = getTargetList(watchlist, req.query.listId);
    if (!targetList) {
      return res.status(404).json({ message: "Watchlist not found" });
    }

    const symbol = String(req.params.symbol || "").trim().toUpperCase();
    const items = normalizeItems(targetList).filter((item) => item.symbol !== symbol);
    targetList.items = items;
    targetList.symbols = items.map((item) => item.symbol);

    if (String(targetList._id) === String(watchlist.activeListId)) {
      watchlist.symbols = targetList.symbols;
    }

    await watchlist.save();
    res.json(serializeWatchlist(watchlist));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getWatchlist,
  createWatchlist,
  renameWatchlist,
  deleteWatchlist,
  setActiveWatchlist,
  addToWatchlist,
  removeFromWatchlist
};