import { useEffect, useMemo, useRef, useState } from "react";
import { ColorType, CrosshairMode, createChart } from "lightweight-charts";
import { Skeleton } from "../Skeleton";

const MA_WINDOW = {
  MA20: 20,
  MA50: 50,
  MA200: 200
};

const DEFAULT_VISIBLE_INDICATORS = {
  MA20: true,
  MA50: true,
  MA200: true,
  volume: true
};

const formatPrice = (value) =>
  Number.isFinite(value) ? `₹${value.toFixed(2)}` : "—";

const movingAverage = (data, windowSize) =>
  data
    .map((item, index) => {
      if (index + 1 < windowSize) {
        return null;
      }

      const slice = data.slice(index + 1 - windowSize, index + 1);
      const average = slice.reduce((sum, point) => sum + point.close, 0) / windowSize;
      return { time: item.time, value: average };
    })
    .filter(Boolean);

const normalizeVolume = (data) =>
  data.map((item) => ({
    time: item.time,
    value: item.volume ?? 0,
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

const CandlestickChart = ({
  data = [],
  height = 420,
  loading = false,
  error = "",
  title = "Advanced Chart",
  symbol = "",
  quote = null,
  period = "1M",
  mode = "candles",
  onModeChange,
  onPeriodChange
}) => {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const lineSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const maSeriesRefs = useRef({});
  const resizeObserverRef = useRef(null);
  const [crosshair, setCrosshair] = useState(null);
  const [visibleIndicators, setVisibleIndicators] = useState(DEFAULT_VISIBLE_INDICATORS);

  const candles = useMemo(() => data.filter((item) => Number.isFinite(item.open) && Number.isFinite(item.close)), [data]);
  const lineData = useMemo(() => buildLineSeries(candles), [candles]);
  const volumeData = useMemo(() => normalizeVolume(candles), [candles]);
  const movingAverages = useMemo(
    () => ({
      MA20: movingAverage(candles, MA_WINDOW.MA20),
      MA50: movingAverage(candles, MA_WINDOW.MA50),
      MA200: movingAverage(candles, MA_WINDOW.MA200)
    }),
    [candles]
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
        vertLine: {
          color: "rgba(56, 189, 248, 0.7)",
          width: 1,
          style: 2,
          labelBackgroundColor: "#0EA5E9"
        },
        horzLine: {
          color: "rgba(56, 189, 248, 0.7)",
          width: 1,
          style: 2,
          labelBackgroundColor: "#0EA5E9"
        }
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
        priceFormatter: (value) => `₹${value.toFixed(2)}`
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

    const ma20Series = chart.addLineSeries({ color: "#F59E0B", lineWidth: 2, priceLineVisible: false, lastValueVisible: false });
    const ma50Series = chart.addLineSeries({ color: "#38BDF8", lineWidth: 2, priceLineVisible: false, lastValueVisible: false });
    const ma200Series = chart.addLineSeries({ color: "#A855F7", lineWidth: 2, priceLineVisible: false, lastValueVisible: false });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    lineSeriesRef.current = lineSeries;
    volumeSeriesRef.current = volumeSeries;
    maSeriesRefs.current = { MA20: ma20Series, MA50: ma50Series, MA200: ma200Series };

    const handleResize = () => {
      if (!containerRef.current) return;
      chart.applyOptions({ width: containerRef.current.clientWidth });
    };

    resizeObserverRef.current = new ResizeObserver(handleResize);
    resizeObserverRef.current.observe(containerRef.current);
    chart.timeScale().fitContent();

    chart.subscribeCrosshairMove((param) => {
      if (!param || !param.point || !param.time) {
        setCrosshair(null);
        return;
      }

      const candle = param.seriesData.get(candleSeriesRef.current) || param.seriesData.get(lineSeriesRef.current);
      const price = candle?.close ?? candle?.value ?? null;
      const open = candle?.open ?? null;
      const high = candle?.high ?? null;
      const low = candle?.low ?? null;
      const volume = param.seriesData.get(volumeSeriesRef.current)?.value ?? null;

      setCrosshair({
        time: param.time,
        price,
        open,
        high,
        low,
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
      maSeriesRefs.current = {};
    };
  }, [height]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const candleSeries = candleSeriesRef.current;
    const lineSeries = lineSeriesRef.current;
    const volumeSeries = volumeSeriesRef.current;
    const maSeries = maSeriesRefs.current;

    candleSeries?.setData(candles);
    lineSeries?.setData(lineData);
    volumeSeries?.setData(volumeData);
    maSeries.MA20?.setData(movingAverages.MA20);
    maSeries.MA50?.setData(movingAverages.MA50);
    maSeries.MA200?.setData(movingAverages.MA200);
    chart.timeScale().fitContent();
  }, [candles, lineData, volumeData, movingAverages]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;

    const isCandles = mode === "candles";
    candleSeriesRef.current?.applyOptions({ visible: isCandles });
    lineSeriesRef.current?.applyOptions({ visible: !isCandles });
    volumeSeriesRef.current?.applyOptions({ visible: visibleIndicators.volume && isCandles });
    maSeriesRefs.current.MA20?.applyOptions({ visible: visibleIndicators.MA20 && isCandles });
    maSeriesRefs.current.MA50?.applyOptions({ visible: visibleIndicators.MA50 && isCandles });
    maSeriesRefs.current.MA200?.applyOptions({ visible: visibleIndicators.MA200 && isCandles });
    chart.timeScale().fitContent();
  }, [mode, visibleIndicators]);

  const chartSubtitle = useMemo(() => {
    if (!crosshair) {
      return quote?.c ? `Live quote ${formatPrice(quote.c)}` : "Hover the chart for crosshair pricing";
    }

    const parts = [
      `Price ${formatPrice(crosshair.price)}`,
      crosshair.open ? `O ${formatPrice(crosshair.open)}` : null,
      crosshair.high ? `H ${formatPrice(crosshair.high)}` : null,
      crosshair.low ? `L ${formatPrice(crosshair.low)}` : null,
      crosshair.volume != null ? `Vol ${Math.round(crosshair.volume).toLocaleString()}` : null
    ].filter(Boolean);

    return parts.join(" • ");
  }, [crosshair, quote]);

  if (loading) {
    return <ChartSkeleton />;
  }

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
    <div className="flex flex-col gap-4 rounded-2xl border border-borderGlow/60 bg-base/70 p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-400">{symbol || title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <span className="rounded-full border border-borderGlow/60 px-3 py-1 text-[11px] uppercase tracking-[0.25em] text-slate-300">
              {period}
            </span>
            <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[11px] uppercase tracking-[0.25em] text-cyan-200">
              {mode === "candles" ? "Candlestick" : "Line"}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-400">{chartSubtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="flex rounded-full border border-borderGlow/60 bg-panel/60 p-1">
            {["1D", "1W", "1M", "3M", "6M", "1Y", "5Y"].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => onPeriodChange?.(item)}
                className={`rounded-full px-3 py-2 uppercase tracking-[0.2em] transition ${
                  period === item ? "bg-cyan-400/10 text-cyan-200" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="flex rounded-full border border-borderGlow/60 bg-panel/60 p-1">
            <button
              type="button"
              onClick={() => onModeChange?.("candles")}
              className={`rounded-full px-3 py-2 uppercase tracking-[0.2em] transition ${
                mode === "candles" ? "bg-cyan-400/10 text-cyan-200" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Candles
            </button>
            <button
              type="button"
              onClick={() => onModeChange?.("line")}
              className={`rounded-full px-3 py-2 uppercase tracking-[0.2em] transition ${
                mode === "line" ? "bg-cyan-400/10 text-cyan-200" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Line
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-slate-400">
        <span className="mr-2 text-slate-500">Overlays</span>
        {[
          ["MA20", "#F59E0B"],
          ["MA50", "#38BDF8"],
          ["MA200", "#A855F7"],
          ["volume", "#22D3EE"]
        ].map(([key, color]) => (
          <button
            key={key}
            type="button"
            onClick={() =>
              setVisibleIndicators((current) => ({
                ...current,
                [key]: !current[key]
              }))
            }
            className={`flex items-center gap-2 rounded-full border px-3 py-2 transition ${
              visibleIndicators[key]
                ? "border-borderGlow/80 bg-panel/70 text-slate-200"
                : "border-borderGlow/30 bg-transparent text-slate-500"
            }`}
          >
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
            {key}
          </button>
        ))}
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-borderGlow/60 bg-[#06101E]">
        <div ref={containerRef} className="w-full" style={{ height }} />

        <div className="pointer-events-none absolute left-4 top-4 flex flex-col gap-1 rounded-xl border border-borderGlow/60 bg-panel/80 px-3 py-2 text-[11px] uppercase tracking-[0.2em] text-slate-300 shadow-glow">
          <span>{symbol || title}</span>
          <span className="text-cyan-200">{chartSubtitle}</span>
        </div>

        {crosshair ? (
          <div className="pointer-events-none absolute bottom-4 left-4 rounded-xl border border-borderGlow/60 bg-panel/80 px-3 py-2 text-[11px] uppercase tracking-[0.2em] text-slate-300 shadow-glow">
            <div className="flex flex-wrap gap-x-4 gap-y-1">
              <span>Price {formatPrice(crosshair.price)}</span>
              {crosshair.volume != null ? <span>Volume {Math.round(crosshair.volume).toLocaleString()}</span> : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default CandlestickChart;
