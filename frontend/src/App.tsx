import { useEffect, useState } from "react";
import { api, type Trade, type StrategyInfo, type Performance } from "./api/client";
import { useWebSocket } from "./hooks/useWebSocket";
import { Dashboard } from "./components/Dashboard";
import { PriceChart } from "./components/PriceChart";
import { TradeLog } from "./components/TradeLog";
import { StrategyPanel } from "./components/StrategyPanel";
import { Controls } from "./components/Controls";

const WS_CANDLES: any[] = [];

export default function App() {
  const wsStatus = useWebSocket();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [strategy, setStrategy] = useState<StrategyInfo | null>(null);
  const [perf, setPerf] = useState<Performance | null>(null);
  const [candles, setCandles] = useState<any[]>([]);
  const [optimizing, setOptimizing] = useState(false);

  useEffect(() => { api.getTrades().then(setTrades); }, []);
  useEffect(() => { api.getStrategy().then(setStrategy); }, []);
  useEffect(() => { api.getPerformance().then(setPerf); }, []);

  const addCandle = (price: number) => {
    WS_CANDLES.push({ time: Date.now(), close: price });
    if (WS_CANDLES.length > 200) WS_CANDLES.shift();
    setCandles([...WS_CANDLES]);
  };

  useEffect(() => {
    if (wsStatus?.last_price) addCandle(wsStatus.last_price);
  }, [wsStatus?.last_price]);

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const s = await api.getStatus();
        if (s.last_price) addCandle(s.last_price);
      } catch {}
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleStart = async () => { await api.startBot(); };
  const handleStop = async () => { await api.stopBot(); };
  const handleOptimize = async () => {
    setOptimizing(true);
    const result = await api.optimize(100);
    setStrategy((prev) => prev ? { ...prev, ...result } : { params: result.params, sharpe_ratio: result.sharpe_ratio });
    setOptimizing(false);
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      <header className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-slate-100">
          AiTrader
          <span className="text-sm text-slate-500 font-normal ml-3">Binance Testnet • BTC/USDT</span>
        </h1>
        <p className="text-sm text-slate-500 mt-1">Self-improving AI trading bot</p>
      </header>

      <Dashboard perf={perf} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <PriceChart data={candles} />
        </div>
        <div className="space-y-4">
          <Controls status={wsStatus} onStart={handleStart} onStop={handleStop} />
          <StrategyPanel strategy={strategy} onOptimize={handleOptimize} optimizing={optimizing} />
        </div>
      </div>

      <TradeLog trades={trades} />
    </div>
  );
}
