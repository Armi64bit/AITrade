import { useEffect, useState } from "react";
import { api, type BotStatus, type Trade, type StrategyInfo, type Performance } from "./api/client";
import { useWebSocket } from "./hooks/useWebSocket";
import { Dashboard } from "./components/Dashboard";
import { CandlestickChart } from "./components/CandlestickChart";
import { SymbolSelector } from "./components/SymbolSelector";
import { TradeLog } from "./components/TradeLog";
import { StrategyPanel } from "./components/StrategyPanel";
import { Controls } from "./components/Controls";

export default function App() {
  const wsStatus = useWebSocket();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [strategy, setStrategy] = useState<StrategyInfo | null>(null);
  const [perf, setPerf] = useState<Performance | null>(null);
  const [candles, setCandles] = useState<any[]>([]);
  const [optimizing, setOptimizing] = useState(false);
  const [restStatus, setRestStatus] = useState<BotStatus | null>(null);
  const [symbol, setSymbol] = useState("BTC/USDT");
  const [changingSymbol, setChangingSymbol] = useState(false);

  const status = restStatus ?? wsStatus;

  useEffect(() => { api.getTrades().then(setTrades); }, []);
  useEffect(() => { api.getStrategy().then(setStrategy); }, []);

  const fetchCandles = async () => {
    try {
      const c = await api.getCandles();
      if (c.length > 0) setCandles(c);
    } catch {}
  };

  const poll = async () => {
    try {
      const [s, p] = await Promise.all([api.getStatus(), api.getPerformance()]);
      setRestStatus(s);
      setPerf(p);
    } catch {}
  };

  useEffect(() => {
    fetchCandles();
    poll();
    const id = setInterval(() => { poll(); fetchCandles(); }, 5000);
    return () => clearInterval(id);
  }, []);

  const handleSymbolChange = async (s: string) => {
    setChangingSymbol(true);
    try {
      await api.setSymbol(s);
      setSymbol(s);
      await fetchCandles();
    } catch {}
    setChangingSymbol(false);
  };

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
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-100">AiTrader</h1>
          <p className="text-sm text-slate-500 mt-1">Self-improving AI trading bot</p>
        </div>
        <SymbolSelector value={symbol} onChange={handleSymbolChange} disabled={changingSymbol} />
      </header>

      <Dashboard perf={perf} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2">
          <CandlestickChart data={candles} />
        </div>
        <div className="space-y-4">
          <Controls status={status} onStart={handleStart} onStop={handleStop} />
          <StrategyPanel strategy={strategy} onOptimize={handleOptimize} optimizing={optimizing} />
        </div>
      </div>

      <TradeLog trades={trades} />
    </div>
  );
}
