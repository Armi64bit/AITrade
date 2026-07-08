import { useEffect, useState, useCallback } from "react";
import { api, type BotStatus, type Trade, type StrategyInfo, type Performance } from "./api/client";
import { useWebSocket } from "./hooks/useWebSocket";
import { useTradeSounds } from "./hooks/useTradeSounds";
import { Dashboard } from "./components/Dashboard";
import { CandlestickChart } from "./components/CandlestickChart";
import { SymbolSelector } from "./components/SymbolSelector";
import { TradeLog } from "./components/TradeLog";
import { AIInsights } from "./components/AIInsights";
import { RightSidebar } from "./components/RightSidebar";
import { StopDialog } from "./components/StopDialog";
import { fetchTndRate } from "./utils/currency";

const LS_KEY = "aitrader_symbol";
const LS_STRATEGY = "aitrader_strategy";

export default function App() {
  const wsStatus = useWebSocket();
  const [trades, setTrades] = useState<Trade[]>([]);
  const [strategy, setStrategy] = useState<StrategyInfo | null>(() => {
    const saved = localStorage.getItem(LS_STRATEGY);
    if (saved) try { return JSON.parse(saved); } catch {}
    return null;
  });
  const [perf, setPerf] = useState<Performance | null>(null);
  const [candles, setCandles] = useState<any[]>([]);
  const [optimizing, setOptimizing] = useState(false);
  const [restStatus, setRestStatus] = useState<BotStatus | null>(null);
  const [symbol, setSymbol] = useState(() => localStorage.getItem(LS_KEY) || "BTC/USDT");
  const [changingSymbol, setChangingSymbol] = useState(false);
  const [showStopDialog, setShowStopDialog] = useState(false);
  const [pendingOptimize, setPendingOptimize] = useState(false);

  useTradeSounds(trades);

  const status = restStatus ?? wsStatus;

  useEffect(() => { api.getTrades().then(setTrades); }, []);
  useEffect(() => { api.getStrategy().then(s => { if (s?.wins !== undefined) setStrategy(s); }); }, []);
  useEffect(() => { fetchTndRate(); }, []);

  useEffect(() => {
    if (strategy) localStorage.setItem(LS_STRATEGY, JSON.stringify(strategy));
  }, [strategy]);

  const pollAll = useCallback(async () => {
    try {
      const [c, s, p, t, st] = await Promise.all([api.getCandles(), api.getStatus(), api.getPerformance(), api.getTrades(), api.getStrategy()]);
      if (c.length > 0) setCandles(c);
      setRestStatus(s);
      setPerf(p);
      setTrades(t);
      if (st) setStrategy(st);
    } catch {}
  }, []);

  useEffect(() => {
    pollAll();
    const id = setInterval(pollAll, 5000);
    return () => clearInterval(id);
  }, [pollAll]);

  const handleSymbolChange = async (s: string) => {
    setChangingSymbol(true);
    try {
      await api.setSymbol(s);
      setSymbol(s);
      localStorage.setItem(LS_KEY, s);
      await pollAll();
    } catch {}
    setChangingSymbol(false);
  };

  const handleStart = async () => { await api.startBot(); };

  const doOptimize = async () => {
    setOptimizing(true);
    try {
      const result = await api.optimize(500);
      setStrategy((prev) => prev ? { ...prev, ...result } : { params: result.params, sharpe_ratio: result.sharpe_ratio, wins: 0, losses: 0, total_trades: 0 });
    } catch {}
    setOptimizing(false);
  };

  const stopNow = async () => {
    setShowStopDialog(false);
    await api.stopBot("now");
    if (pendingOptimize) {
      setPendingOptimize(false);
      await doOptimize();
    }
  };

  const stopAfterTrade = async () => {
    setShowStopDialog(false);
    await api.stopBot("after_trade");
    if (pendingOptimize) {
      setPendingOptimize(false);
      await doOptimize();
    }
  };

  const cancelDialog = () => {
    setShowStopDialog(false);
    setPendingOptimize(false);
  };

  const handleStop = () => {
    if (status?.position) {
      setShowStopDialog(true);
    } else {
      api.stopBot("now");
    }
  };

  const handleOptimize = () => {
    if (status?.position) {
      setShowStopDialog(true);
      setPendingOptimize(true);
    } else {
      doOptimize();
    }
  };

  const handleActivateStrategy = (params: Record<string, number>, sharpe: number | null, total_trades = 0, wins = 0, losses = 0) => {
    setStrategy({ params, sharpe_ratio: sharpe, total_trades, wins, losses });
  };

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      <header className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg">AI</div>
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-100">AiTrader</h1>
            <p className="text-xs text-slate-500">Self-improving AI trading bot</p>
          </div>
        </div>
        <SymbolSelector value={symbol} onChange={handleSymbolChange} disabled={changingSymbol} />
      </header>

      <Dashboard perf={perf} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 space-y-4">
          <CandlestickChart data={candles} />
          <AIInsights onOptimize={handleOptimize} />
        </div>
        <div className="space-y-4">
          <RightSidebar
            status={status}
            symbol={symbol}
            onStart={handleStart}
            onStop={handleStop}
            strategy={strategy}
            onOptimize={handleOptimize}
            optimizing={optimizing}
            onActivateStrategy={handleActivateStrategy}
          />
        </div>
      </div>

      <TradeLog trades={trades} />

      {showStopDialog && (
        <StopDialog
          onStopNow={stopNow}
          onStopAfterTrade={stopAfterTrade}
          onCancel={cancelDialog}
          pendingOptimize={pendingOptimize}
        />
      )}
    </div>
  );
}
