import { useEffect, useRef } from "react";
import { createChart, ColorType } from "lightweight-charts";

const CandlestickChart = ({ data = [], height = 260 }) => {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const seriesRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return undefined;

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: "#0A0A0F" },
        textColor: "#CBD5F5",
        fontFamily: "DM Mono, monospace"
      },
      grid: {
        vertLines: { color: "rgba(30, 41, 59, 0.4)" },
        horzLines: { color: "rgba(30, 41, 59, 0.4)" }
      },
      height,
      rightPriceScale: { borderColor: "rgba(0, 245, 255, 0.2)" },
      timeScale: { borderColor: "rgba(0, 245, 255, 0.2)" }
    });

    const series = chart.addCandlestickSeries({
      upColor: "#00F5FF",
      downColor: "#FF4D4D",
      borderUpColor: "#00F5FF",
      borderDownColor: "#FF4D4D",
      wickUpColor: "#00F5FF",
      wickDownColor: "#FF4D4D"
    });

    chartRef.current = chart;
    seriesRef.current = series;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        chart.applyOptions({ width: entry.contentRect.width });
      }
    });
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      chart.remove();
    };
  }, [height]);

  useEffect(() => {
    if (seriesRef.current) {
      seriesRef.current.setData(data);
    }
  }, [data]);

  return (
    <div className="relative">
      <div ref={containerRef} className="w-full" />
      {data.length === 0 ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-slate-400">
          No chart data yet
        </div>
      ) : null}
    </div>
  );
};

export default CandlestickChart;
