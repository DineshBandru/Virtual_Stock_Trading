import { useEffect, useMemo, useRef, useState } from "react";
import { ColorType, CrosshairMode, createChart } from "lightweight-charts";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { Skeleton } from "../Skeleton";
import {
  calculateEMA,
  calculateMACD,
  calculateRSI,
  calculateSMA,
  stripNullValues
} from "../../utils/technicalIndicators";

const DEFAULT_VISIBLE_INDICATORS = {
  volume: true,
  SMA20: false,
  SMA50: false,
  EMA20: false,
  RSI: false,
  MACD: false
};

const formatPrice = (value) =>
  Number.isFinite(Number(value)) ? `Rs. ${Number(value).toFixed(2)}` : "-";

const formatTimeLabel = (time) =>
  new Date(Number(time) * 1000).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

const normalizeVolume = (data) =>
  data.map((item) => ({
    time: item.time,
    value: Number(item.volume) || 0,
    color: item.close >= item.open ? "rgba(34, 211, 238, 0.55)" : "rgba(248, 113, 113, 0.55)"
  }));

const buildLineSeries = (data) =>
  data.map((item) => ({ time: item.time, value: item.close }));

const ChartSkeleton = () => (
  <div className="flex h-[420px] w-full flex-col gap-4 rounded-2xl border border-borderGlow/60 bg-base/70 p-4">
    <div className="flex items-center justify-between gap-3">
      <Skeleton className="h-6 w-44" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-16 rounded-full" />
        <Skeleton className="h-8 w-16 rounded-full" />
        <Skeleton className="h-8 w-16 rounded-full" />
      </div>
    </div>
    <Skeleton className="h-full w-full rounded-2xl" />
  </div>
);

const SmallChartTooltip = {
  background: "rgba(7, 11, 20, 0.96)",
  border: "1px solid rgba(148, 163, 184, 0.2)",
  borderRadius: 8,
  color: "#E7E9F3"
};

const CandlestickChart = ({
  data = [],
  height = 420,
  loading = false,
  error = "",
  title = "Advanced Chart",
  symbol = "",
  quote = null,
  period = "1M",
  historyMeta = null,
  mode = "candles",
  onModeChange,
  onPeriodChange
}) => {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const lineSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const overlaySeriesRefs = useRef({});
  const resizeObserverRef = useRef(null);
  const [crosshair, setCrosshair] = useState(null);
  const [visibleIndicators, setVisibleIndicators] = useState(DEFAULT_VISIBLE_INDICATORS);

  const candles = useMemo(
    () =>
      data.filter((item) =>
        Number.isFinite(Number(item.time)) &&
        Number.isFinite(Number(item.open)) &&
        Number.isFinite(Number(item.high)) &&
        Number.isFinite(Number(item.low)) &&
        Number.isFinite(Number(item.close))
      ),
    [data]
  );
  const lineData = useMemo(() => buildLineSeries(candles), [candles]);
  const volumeData = useMemo(() => normalizeVolume(candles), [candles]);
  const indicators = useMemo(
    () => ({
      SMA20: stripNullValues(calculateSMA(candles, 20)),
      SMA50: stripNullValues(calculateSMA(candles, 50)),
      EMA20: stripNullValues(calculateEMA(candles, 20)),
      RSI: calculateRSI(candles, 14),
      MACD: calculateMACD(candles, 12, 26, 9)
    }),
    [candles]
  );

  const rsiData = useMemo(
    () =>
      indicators.RSI.map((point) => ({
        label: formatTimeLabel(point.time),
        rsi: point.value
      })).filter((point) => Number.isFinite(point.rsi)),
    [indicators.RSI]
  );

  const macdData = useMemo(
    () =>
      indicators.MACD.macdLine.map((point, index) => ({
        label: formatTimeLabel(point.time),
        macd: point.value,
        signal: indicators.MACD.signalLine[index]?.value,
        histogram: indicators.MACD.histogram[index]?.value
      })).filter((point) => Number.isFinite(point.macd) || Number.isFinite(point.signal) || Number.isFinite(point.histogram)),
    [indicators.MACD]
  );

  useEffect(() => {
    if (!containerRef.current) return undefined;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "#070B14" },
        textColor: "#D7E3FF",
        fontFamily: 'Inter, "Segoe UI", sans-serif',
        fontSize: 12
      },
      grid: {
        vertLines: { color: "rgba(71, 85, 105, 0.22)" },
        horzLines: { color: "rgba(71, 85, 105, 0.22)" }
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: "rgba(56, 189, 248, 0.7)", width: 1, style: 2, labelBackgroundColor: "#0EA5E9" },
        horzLine: { color: "rgba(56, 189, 248, 0.7)", width: 1, style: 2, labelBackgroundColor: "#0EA5E9" }
      },
      rightPriceScale: {
        borderColor: "rgba(59, 130, 246, 0.18)",
        scaleMargins: { top: 0.08, bottom: 0.25 }
      },
      timeScale: {
        borderColor: "rgba(59, 130, 246, 0.18)",
        timeVisible: true,
        secondsVisible: false
      },
      localization: {
        priceFormatter: (value) => formatPrice(value)
      }
    });

    const candleSeries = chart.addCandlestickSeries({
      upColor: "#22D3EE",
      downColor: "#F87171",
      borderUpColor: "#22D3EE",
      borderDownColor: "#F87171",
      wickUpColor: "#22D3EE",
      wickDownColor: "#F87171"
    });
    const lineSeries = chart.addLineSeries({
      color: "#7C3AED",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true
    });
    const volumeSeries = chart.addHistogramSeries({
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
      color: "rgba(34, 211, 238, 0.55)",
      scaleMargins: { top: 0.82, bottom: 0 }
    });
    const sma20Series = chart.addLineSeries({ color: "#F59E0B", lineWidth: 2, priceLineVisible: false, lastValueVisible: false });
    const sma50Series = chart.addLineSeries({ color: "#38BDF8", lineWidth: 2, priceLineVisible: false, lastValueVisible: false });
    const ema20Series = chart.addLineSeries({ color: "#A855F7", lineWidth: 2, priceLineVisible: false, lastValueVisible: false });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    lineSeriesRef.current = lineSeries;
    volumeSeriesRef.current = volumeSeries;
    overlaySeriesRefs.current = { SMA20: sma20Series, SMA50: sma50Series, EMA20: ema20Series };

    const handleResize = () => {
      if (!containerRef.current) return;
      chart.applyOptions({ width: containerRef.current.clientWidth });
    };

    resizeObserverRef.current = new ResizeObserver(handleResize);
    resizeObserverRef.current.observe(containerRef.current);

    chart.subscribeCrosshairMove((param) => {
      if (!param || !param.point || !param.time) {
        setCrosshair(null);
        return;
      }
      const candle = param.seriesData.get(candleSeriesRef.current) || param.seriesData.get(lineSeriesRef.current);
      const volume = param.seriesData.get(volumeSeriesRef.current)?.value ?? null;
      setCrosshair({
        price: candle?.close ?? candle?.value ?? null,
        open: candle?.open ?? null,
        high: candle?.high ?? null,
        low: candle?.low ?? null,
        volume
      });
    });

    return () => {
      resizeObserverRef.current?.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      lineSeriesRef.current = null;
      volumeSeriesRef.current = null;
      overlaySeriesRefs.current = {};
    };
  }, [height]);

  useEffect(() => {
    if (!chartRef.current) return;
    candleSeriesRef.current?.setData(candles);
    lineSeriesRef.current?.setData(lineData);
    volumeSeriesRef.current?.setData(volumeData);
    overlaySeriesRefs.current.SMA20?.setData(indicators.SMA20);
    overlaySeriesRefs.current.SMA50?.setData(indicators.SMA50);
    overlaySeriesRefs.current.EMA20?.setData(indicators.EMA20);
    chartRef.current.timeScale().fitContent();
  }, [candles, lineData, volumeData, indicators]);

  useEffect(() => {
    if (!chartRef.current) return;
    const showCandles = mode === "candles";
    candleSeriesRef.current?.applyOptions({ visible: showCandles });
    lineSeriesRef.current?.applyOptions({ visible: !showCandles });
    volumeSeriesRef.current?.applyOptions({ visible: visibleIndicators.volume && showCandles });
    overlaySeriesRefs.current.SMA20?.applyOptions({ visible: visibleIndicators.SMA20 && showCandles });
    overlaySeriesRefs.current.SMA50?.applyOptions({ visible: visibleIndicators.SMA50 && showCandles });
    overlaySeriesRefs.current.EMA20?.applyOptions({ visible: visibleIndicators.EMA20 && showCandles });
    chartRef.current.timeScale().fitContent();
  }, [mode, visibleIndicators]);

  const chartSubtitle = useMemo(() => {
    if (!crosshair) {
      return quote?.c ? `Live quote ${formatPrice(quote.c)}` : "Hover the chart for OHLCV details";
    }
    return [
      `Price ${formatPrice(crosshair.price)}`,
      crosshair.open ? `O ${formatPrice(crosshair.open)}` : null,
      crosshair.high ? `H ${formatPrice(crosshair.high)}` : null,
      crosshair.low ? `L ${formatPrice(crosshair.low)}` : null,
      crosshair.volume != null ? `Vol ${Math.round(crosshair.volume).toLocaleString("en-IN")}` : null
    ].filter(Boolean).join(" | ");
  }, [crosshair, quote]);

  if (loading) return <ChartSkeleton />;

  if (error || candles.length === 0) {
    return (
      <div className="flex min-h-[420px] flex-col items-center justify-center rounded-2xl border border-borderGlow/60 bg-base/70 px-6 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Chart unavailable</p>
        <p className="mt-3 max-w-md text-sm text-slate-400">
          {error || "Chart data could not be loaded for the selected range. Try another period or symbol."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-4 rounded-2xl border border-borderGlow/60 bg-base/70 p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">{symbol || title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <span className="rounded-full border border-borderGlow/60 px-3 py-1 text-[11px] uppercase tracking-[0.25em] text-slate-300">{period}</span>
            <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.25em] text-cyan-200">
              {mode === "candles" ? "Candlestick" : "Line"}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-400">{chartSubtitle}</p>
          {historyMeta?.fetchedAt ? (
            <p className="mt-1 text-xs text-slate-500">
              History {historyMeta.cached ? historyMeta.stale ? "stale cached" : "cached" : "updated"} at {new Date(historyMeta.fetchedAt).toLocaleString()}
            </p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex flex-wrap rounded-lg border border-borderGlow/60 bg-panel/60 p-1">
            {["1D", "1W", "1M", "3M", "6M", "1Y", "5Y"].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onPeriodChange?.(item)}
                className={`rounded-lg px-3 py-2 uppercase tracking-[0.12em] transition ${
                  period === item ? "bg-cyan-400/10 text-cyan-200" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="flex rounded-lg border border-borderGlow/60 bg-panel/60 p-1">
            {["candles", "line"].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onModeChange?.(item)}
                className={`rounded-lg px-3 py-2 uppercase tracking-[0.12em] transition ${
                  mode === item ? "bg-cyan-400/10 text-cyan-200" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {item === "candles" ? "Candles" : "Line"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-slate-400">
        <span className="mr-1 text-slate-500">Indicators</span>
        {[
          ["volume", "#22D3EE", "Volume"],
          ["SMA20", "#F59E0B", "SMA 20"],
          ["SMA50", "#38BDF8", "SMA 50"],
          ["EMA20", "#A855F7", "EMA 20"],
          ["RSI", "#22C55E", "RSI"],
          ["MACD", "#F97316", "MACD"]
        ].map(([key, color, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setVisibleIndicators((current) => ({ ...current, [key]: !current[key] }))}
            className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition ${
              visibleIndicators[key]
                ? "border-borderGlow/80 bg-panel/70 text-slate-200"
                : "border-borderGlow/30 bg-transparent text-slate-500"
            }`}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
            {label}
          </button>
        ))}
      </div>

      <div className="relative min-w-0 overflow-hidden rounded-2xl border border-borderGlow/60 bg-[#06101E]">
        <div ref={containerRef} className="w-full" style={{ height }} />
        <div className="pointer-events-none absolute left-4 top-4 flex max-w-[calc(100%-2rem)] flex-col gap-1 rounded-xl border border-borderGlow/60 bg-panel/80 px-3 py-2 text-[11px] uppercase tracking-[0.12em] text-slate-300 shadow-glow">
          <span>{symbol || title}</span>
          <span className="text-cyan-200">{chartSubtitle}</span>
        </div>
      </div>

      {visibleIndicators.RSI ? (
        <div className="min-w-0 rounded-2xl border border-borderGlow/60 bg-[#06101E] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-slate-300">RSI 14</p>
              <p className="mt-1 text-xs text-slate-500">RSI is a momentum indicator. It should not be used alone to make trading decisions.</p>
            </div>
            <span className="text-xs text-slate-500">Reference: 70 / 30</span>
          </div>
          <div className="mt-4 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rsiData}>
                <CartesianGrid stroke="rgba(148, 163, 184, 0.12)" strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fill: "#94A3B8", fontSize: 11 }} minTickGap={24} />
                <YAxis domain={[0, 100]} tick={{ fill: "#94A3B8", fontSize: 11 }} width={44} />
                <Tooltip contentStyle={SmallChartTooltip} />
                <ReferenceLine y={70} stroke="#F59E0B" strokeDasharray="4 4" />
                <ReferenceLine y={30} stroke="#38BDF8" strokeDasharray="4 4" />
                <Line type="monotone" dataKey="rsi" stroke="#22C55E" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      {visibleIndicators.MACD ? (
        <div className="min-w-0 rounded-2xl border border-borderGlow/60 bg-[#06101E] p-4">
          <p className="text-xs font-semibold uppercase text-slate-300">MACD 12/26/9</p>
          <p className="mt-1 text-xs text-slate-500">MACD compares moving averages and momentum; it is educational context, not a signal.</p>
          <div className="mt-4 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={macdData}>
                <CartesianGrid stroke="rgba(148, 163, 184, 0.12)" strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fill: "#94A3B8", fontSize: 11 }} minTickGap={24} />
                <YAxis tick={{ fill: "#94A3B8", fontSize: 11 }} width={56} />
                <Tooltip contentStyle={SmallChartTooltip} />
                <Bar dataKey="histogram" fill="#F97316" />
                <Line type="monotone" dataKey="macd" stroke="#38BDF8" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="signal" stroke="#A855F7" strokeWidth={2} dot={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default CandlestickChart;
