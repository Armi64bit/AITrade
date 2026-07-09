import { useEffect, useRef } from "react";
import { createChart, CandlestickSeries, HistogramSeries, LineSeries, type IChartApi, type ISeriesApi, type CandlestickData, type HistogramData, type LineData, type Time } from "lightweight-charts";

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export function CandlestickChart({ data, entryPrice }: { data: Candle[]; entryPrice?: number | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const entryLineRef = useRef<ISeriesApi<"Line"> | null>(null);
  const hasDataRef = useRef(false);

  useEffect(() => {
    if (!containerRef.current) return;
    const chart = createChart(containerRef.current, {
      layout: { background: { color: "#1a1a2e" }, textColor: "#94a3b8" },
      grid: { vertLines: { color: "#2a2a4a" }, horzLines: { color: "#2a2a4a" } },
      crosshair: { mode: 0 },
      timeScale: { timeVisible: true, secondsVisible: false, borderColor: "#2a2a4a" },
      rightPriceScale: { borderColor: "#2a2a4a" },
      width: containerRef.current.clientWidth,
      height: 400,
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderDownColor: "#ef4444",
      borderUpColor: "#22c55e",
      wickDownColor: "#ef4444",
      wickUpColor: "#22c55e",
    });

    const volSeries = chart.addSeries(HistogramSeries, {
      color: "#3b82f6",
      priceFormat: { type: "volume" },
      priceScaleId: "volume",
    });

    chart.priceScale("volume").applyOptions({ scaleMargins: { top: 0.85, bottom: 0 } });

    chartRef.current = chart;
    seriesRef.current = candleSeries;
    volumeRef.current = volSeries;

    const handleResize = () => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current || !volumeRef.current || data.length === 0) return;
    const candles: CandlestickData[] = data.map((d) => ({
      time: (d.time / 1000) as Time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));
    const volumes: HistogramData[] = data.map((d) => ({
      time: (d.time / 1000) as Time,
      value: Math.abs(d.close - d.open) * 10 + 100,
      color: d.close >= d.open ? "#22c55e40" : "#ef444440",
    }));
    seriesRef.current.setData(candles);
    volumeRef.current.setData(volumes);
    if (!hasDataRef.current) {
      chartRef.current?.timeScale().fitContent();
      hasDataRef.current = true;
    }
  }, [data]);

  useEffect(() => {
    if (!chartRef.current || !seriesRef.current || data.length === 0) return;
    if (entryLineRef.current) {
      chartRef.current.removeSeries(entryLineRef.current);
      entryLineRef.current = null;
    }
    if (entryPrice == null) return;
    const now = (Math.floor(Date.now() / 1000)) as Time;
    const lineData: LineData[] = data.length > 0
      ? [{ time: (data[0].time / 1000) as Time, value: entryPrice }, { time: now, value: entryPrice }]
      : [{ time: now, value: entryPrice }];
    entryLineRef.current = chartRef.current.addSeries(LineSeries, {
      color: "#f59e0b",
      lineWidth: 2,
      lineStyle: 2,
      lastValueVisible: true,
      priceLineVisible: false,
    });
    entryLineRef.current.setData(lineData);
  }, [entryPrice, data]);

  return <div ref={containerRef} className="w-full rounded-lg overflow-hidden" />;
}
