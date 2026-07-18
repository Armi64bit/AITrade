import { useEffect, useRef, useState } from "react";
import { createChart, CandlestickSeries, HistogramSeries, LineSeries, createSeriesMarkers, type IChartApi, type ISeriesApi, type ISeriesMarkersPluginApi, type CandlestickData, type HistogramData, type LineData, type Time, type SeriesMarker } from "lightweight-charts";
import { api } from "../api/client";

interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface PredictionSignal {
  signal: number;
  direction: "buy" | "sell" | "hold";
  confidence: number;
  prob_win: number;
  prob_loss: number;
  adaptive_threshold: number;
  model_agreement: string;
  model_ready: boolean;
  ensemble_conviction: number;
  trend: number;
}

export function CandlestickChart({ data, entryPrice }: { data: Candle[]; entryPrice?: number | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const volumeRef = useRef<ISeriesApi<"Histogram"> | null>(null);
  const entryLineRef = useRef<ISeriesApi<"Line"> | null>(null);
  const markersRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const hasDataRef = useRef(false);
  const [prediction, setPrediction] = useState<PredictionSignal | null>(null);

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
    markersRef.current = createSeriesMarkers<Time>(candleSeries as ISeriesApi<"Candlestick", Time>);

    const handleResize = () => {
      if (containerRef.current) chart.applyOptions({ width: containerRef.current.clientWidth });
    };
    const ro = new ResizeObserver(handleResize);
    ro.observe(containerRef.current);
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      ro.disconnect();
      chart.remove();
    };
  }, []);

  useEffect(() => {
    if (!seriesRef.current || !volumeRef.current || data.length === 0) return;
    const candles: CandlestickData[] = data.map((d) => ({
      time: Math.floor(d.time / 1000) as Time,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));
    const volumes: HistogramData[] = data.map((d) => ({
      time: Math.floor(d.time / 1000) as Time,
      value: Math.abs(d.close - d.open) * 10 + 100,
      color: d.close >= d.open ? "#22c55e40" : "#ef444440",
    }));
    seriesRef.current.setData(candles);
    volumeRef.current.setData(volumes);

    if (markersRef.current) {
      if (prediction && prediction.direction !== "hold" && prediction.signal !== 0) {
        const lastTime = Math.floor(data[data.length - 1].time / 1000) as Time;
        const markerColor = prediction.direction === "buy" ? "#22c55e" : "#ef4444";
        const markerText = prediction.direction === "buy" ? "▲ BUY" : "▼ SELL";

        const markers: SeriesMarker<Time>[] = [{
          time: lastTime,
          position: prediction.direction === "buy" ? "belowBar" : "aboveBar",
          color: markerColor,
          shape: prediction.direction === "buy" ? "arrowUp" : "arrowDown",
          text: `${markerText} ${(prediction.confidence * 100).toFixed(0)}%`,
          size: 1.5,
        }];
        markersRef.current.setMarkers(markers);
      } else {
        markersRef.current.setMarkers([]);
      }
    }

    if (!hasDataRef.current) {
      chartRef.current?.timeScale().fitContent();
      hasDataRef.current = true;
    }
  }, [data, prediction]);

  useEffect(() => {
    if (!chartRef.current || !seriesRef.current || data.length === 0) return;
    if (entryLineRef.current) {
      chartRef.current.removeSeries(entryLineRef.current);
      entryLineRef.current = null;
    }
    if (entryPrice == null) return;
    const now = Math.floor(Date.now() / 1000) as Time;
    const lineData: LineData[] = data.length > 0
      ? [{ time: Math.floor(data[0].time / 1000) as Time, value: entryPrice }, { time: now, value: entryPrice }]
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

  useEffect(() => {
    const fetchPrediction = async () => {
      try {
        const p = await api.getModelPredictSignal();
        setPrediction(p);
      } catch {}
    };
    fetchPrediction();
    const id = setInterval(fetchPrediction, 5000);
    return () => clearInterval(id);
  }, []);

  return <div ref={containerRef} className="w-full rounded-lg overflow-hidden" />;
}
