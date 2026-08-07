const axios = require("axios");
const Instrument = require("../models/Instrument");
const { ensureNseSymbol } = require("../utils/market");

const NSE_EQUITY_LIST_URLS = [
  "https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv",
  "https://archives.nseindia.com/content/equities/EQUITY_L.csv"
];
const NSE_EQUITY_LIST_URL = NSE_EQUITY_LIST_URLS[0];
const NSE_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36",
  Accept: "text/csv,application/csv,text/plain,*/*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://www.nseindia.com/"
};

const normalizeTradingSymbol = (value) => String(value || "").trim().toUpperCase();

const normalizeMarketSymbol = (value) => {
  const tradingSymbol = normalizeTradingSymbol(String(value || "").replace(/\.NS$/i, ""));
  return tradingSymbol ? ensureNseSymbol(tradingSymbol) : "";
};

const escapeRegex = (value) => String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parseCsvLine = (line) => {
  const values = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current);
  return values.map((item) => item.trim());
};

const parseCsv = (csv) => {
  const lines = String(csv || "").split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((header) => header.trim().toUpperCase());
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return headers.reduce((row, header, index) => {
      row[header] = values[index] || "";
      return row;
    }, {});
  });
};

const buildSearchText = ({ tradingSymbol, symbol, companyName, isin }) =>
  [tradingSymbol, symbol, companyName, isin].filter(Boolean).join(" ").toLowerCase();

const fetchNseEquityCsv = async () => {
  const client = axios.create({
    timeout: 30000,
    headers: NSE_HEADERS
  });

  await client.get("https://www.nseindia.com", { responseType: "text" }).catch(() => null);

  let lastError = null;
  for (const url of NSE_EQUITY_LIST_URLS) {
    try {
      const response = await client.get(url, { responseType: "text" });
      if (response.data && String(response.data).includes("SYMBOL")) {
        return { url, csv: response.data };
      }
      lastError = new Error(`Unexpected NSE response from ${url}`);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("Unable to download NSE equity list");
};

const rowToInstrument = (row, syncedAt) => {
  const tradingSymbol = normalizeTradingSymbol(row.SYMBOL);
  const companyName = String(row["NAME OF COMPANY"] || "").trim();
  const series = normalizeTradingSymbol(row.SERIES);
  const isin = String(row["ISIN NUMBER"] || "").trim().toUpperCase();

  if (!tradingSymbol || !companyName || series !== "EQ") {
    return null;
  }

  if (!/^[A-Z0-9&.-]+$/.test(tradingSymbol)) {
    return null;
  }

  const symbol = normalizeMarketSymbol(tradingSymbol);
  return {
    symbol,
    tradingSymbol,
    companyName,
    exchange: "NSE",
    series,
    isin,
    instrumentType: "EQUITY",
    active: true,
    searchText: buildSearchText({ tradingSymbol, symbol, companyName, isin }),
    lastSyncedAt: syncedAt
  };
};

const syncNseEquityInstruments = async () => {
  const syncedAt = new Date();
  const { url, csv } = await fetchNseEquityCsv();

  const rows = parseCsv(csv);
  const seen = new Set();
  const instruments = [];
  let skipped = 0;

  rows.forEach((row) => {
    const instrument = rowToInstrument(row, syncedAt);
    if (!instrument) {
      skipped += 1;
      return;
    }
    const key = `${instrument.exchange}:${instrument.tradingSymbol}`;
    if (seen.has(key)) {
      skipped += 1;
      return;
    }
    seen.add(key);
    instruments.push(instrument);
  });

  let upserted = 0;
  let updated = 0;
  for (const instrument of instruments) {
    const result = await Instrument.updateOne(
      { exchange: instrument.exchange, tradingSymbol: instrument.tradingSymbol },
      { $set: instrument },
      { upsert: true }
    );
    if (result.upsertedCount) {
      upserted += result.upsertedCount;
    } else if (result.modifiedCount || result.matchedCount) {
      updated += 1;
    }
  }

  const inactiveResult = await Instrument.updateMany(
    {
      exchange: "NSE",
      instrumentType: "EQUITY",
      tradingSymbol: { $nin: instruments.map((item) => item.tradingSymbol) },
      active: true
    },
    { $set: { active: false, lastSyncedAt: syncedAt } }
  );

  await Instrument.syncIndexes();

  return {
    source: url,
    imported: instruments.length,
    upserted,
    updated,
    skipped,
    inactive: inactiveResult.modifiedCount || 0,
    failed: 0
  };
};

const findActiveInstrument = async (symbol) => {
  const normalizedSymbol = normalizeMarketSymbol(symbol);
  if (!normalizedSymbol) return null;
  const tradingSymbol = normalizedSymbol.replace(/\.NS$/i, "");
  return Instrument.findOne({
    active: true,
    exchange: "NSE",
    instrumentType: "EQUITY",
    series: "EQ",
    $or: [{ symbol: normalizedSymbol }, { tradingSymbol }]
  }).lean();
};

const searchInstruments = async (query, limit = 15) => {
  const trimmed = String(query || "").trim();
  if (trimmed.length < 2) return [];

  const normalized = trimmed.toUpperCase().replace(/\.NS$/i, "");
  const escapedLower = escapeRegex(trimmed.toLowerCase());
  const escapedUpper = escapeRegex(normalized);
  const maxResults = Math.min(Math.max(Number(limit) || 15, 1), 20);

  const candidates = await Instrument.find({
    active: true,
    exchange: "NSE",
    instrumentType: "EQUITY",
    series: "EQ",
    $or: [
      { tradingSymbol: new RegExp(`^${escapedUpper}`) },
      { symbol: new RegExp(`^${escapedUpper}`) },
      { companyName: new RegExp(escapeRegex(trimmed), "i") },
      { searchText: new RegExp(escapedLower, "i") }
    ]
  })
    .select("symbol tradingSymbol companyName exchange instrumentType")
    .limit(100)
    .lean();

  const ranked = candidates
    .map((item) => {
      const company = String(item.companyName || "");
      const companyLower = company.toLowerCase();
      let rank = 4;
      if (item.tradingSymbol === normalized || item.symbol === `${normalized}.NS`) rank = 0;
      else if (item.tradingSymbol.startsWith(normalized)) rank = 1;
      else if (companyLower.startsWith(trimmed.toLowerCase())) rank = 2;
      else if (companyLower.includes(trimmed.toLowerCase())) rank = 3;
      return { ...item, rank };
    })
    .sort((left, right) => left.rank - right.rank || left.tradingSymbol.localeCompare(right.tradingSymbol));

  const seen = new Set();
  return ranked
    .filter((item) => {
      if (!item.symbol || seen.has(item.symbol)) return false;
      seen.add(item.symbol);
      return true;
    })
    .slice(0, maxResults)
    .map((item) => ({
      symbol: item.symbol,
      tradingSymbol: item.tradingSymbol,
      name: item.companyName,
      companyName: item.companyName,
      description: item.companyName,
      exchange: item.exchange,
      instrumentType: item.instrumentType
    }));
};

module.exports = {
  NSE_EQUITY_LIST_URL,
  findActiveInstrument,
  normalizeMarketSymbol,
  searchInstruments,
  syncNseEquityInstruments
};
