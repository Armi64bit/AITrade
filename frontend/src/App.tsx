import { useEffect, useState, useCallback } from "react";
import { api, type BotStatus, type Trade, type StrategyInfo, type Performance } from "./api/client";
import { useWebSocket } from "./hooks/useWebSocket";
import { useTradeSounds } from "./hooks/useTradeSounds";
import { Dashboard } from "./components/Dashboard";
import { CandlestickChart } from "./components/CandlestickChart";
import { SymbolSelector } from "./components/SymbolSelector";
import { TradeLog } from "./components/TradeLog";
import { AIInsights } from "./components/AIInsights";
import { MarketNews } from "./components/MarketNews";
import { StrategyVotes } from "./components/StrategyVotes";
import { RightSidebar } from "./components/RightSidebar";
import { StrategyHistory } from "./components/StrategyHistory";
import { DailyPerformance } from "./components/DailyPerformance";
import { ActivityLog } from "./components/ActivityLog";
import { StopDialog } from "./components/StopDialog";
import { fetchTndRate } from "./utils/currency";
import Aurora from "./components/Aurora";
import FadeContent from "./components/FadeContent";
import SpotlightCard from "./components/SpotlightCard";
import { Mascot, type MascotMood } from "./components/Mascot";
import LiquidChrome from "./components/LiquidChrome";

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
  const [loaded, setLoaded] = useState(false);
  const [historyTab, setHistoryTab] = useState(() => localStorage.getItem("aitrader_history_tab") || "strategies");

  useTradeSounds(trades);

  const status = restStatus ?? wsStatus;

  const mascotMood: MascotMood = (() => {
    if (optimizing) return "thinking";
    if (status?.consecutive_losses !== undefined && status.consecutive_losses >= 3) return "stressed";
    if (perf?.total_pnl !== undefined && perf?.total_pnl !== null) {
      if (perf.total_pnl > 0) return "happy";
      if (perf.total_pnl < 0) return "sad";
    }
    if (status?.running && !status.position) return "thinking";
    return "neutral";
  })();

  useEffect(() => {
    Promise.all([
      api.getTrades(),
      api.getStrategy(),
      fetchTndRate(),
    ]).then(([t, s]) => {
      setTrades(t);
      if (s?.wins !== undefined) setStrategy(s);
      setLoaded(true);
    });
  }, []);

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
      setSymbol(prev => s?.symbol && s.symbol !== prev ? s.symbol : prev);
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
      if (!result.kept_existing) {
        setStrategy((prev) => prev ? { ...prev, ...result } : { params: result.params, sharpe_ratio: result.sharpe_ratio, wins: 0, losses: 0, total_trades: 0 });
      }
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

  if (!loaded) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950 relative overflow-hidden">
        <div className="absolute inset-0">
          <LiquidChrome />
        </div>
        <div className="flex flex-col items-center gap-4 relative z-10">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg animate-pulse">AI</div>
          <div className="text-slate-400 text-sm">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 relative overflow-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <Aurora />
      </div>
      <div className="mx-auto w-full max-w-screen-2xl px-4 py-4 sm:px-6 lg:px-10 xl:px-12 relative z-10">
        <FadeContent>
          <header className="mb-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-3xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow-xl shadow-purple-500/20">AI</div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-100">AiTrader</h1>
                <p className="text-sm text-slate-500">Self-improving AI trading bot</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="rounded-3xl border border-slate-800/80 bg-slate-950/90 p-4 shadow-[0_18px_55px_rgba(0,0,0,0.25)]">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Live status</p>
                <p className="mt-2 text-sm text-slate-300">{status?.running ? "Bot is running" : "Bot is stopped"}</p>
              </div>
              <div className="rounded-3xl border border-slate-800/80 bg-slate-950/90 p-4 shadow-[0_18px_55px_rgba(0,0,0,0.25)]">
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Active mode</p>
                <p className="mt-2 text-sm font-semibold text-slate-100">{status?.paper_mode ? "Paper trading" : status?.running ? "Live trading" : "Stopped"}</p>
              </div>
              <div className="rounded-3xl border border-slate-800/80 bg-slate-950/90 p-4 shadow-[0_18px_55px_rgba(0,0,0,0.25)]">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Pair selector</p>
                    <div className="mt-3">
                      <SymbolSelector value={symbol} onChange={handleSymbolChange} disabled={changingSymbol} />
                    </div>
                  </div>
                  <div className="rounded-3xl border border-slate-800/80 bg-slate-900/80 p-3">
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Status</p>
                    <p className="mt-2 text-sm text-slate-200">{status?.running ? "Running" : "Offline"}</p>
                    <p className="mt-1 text-xs text-slate-500">{status?.paper_mode ? "Paper trading" : "Live trading"}</p>
                  </div>
                </div>
              </div>
            </div>
          </header>
        </FadeContent>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.7fr_1fr] mb-6">
          <FadeContent>
            <Dashboard perf={perf} />
          </FadeContent>
          <FadeContent>
            {/* <MarketNews /> */}
                            <Mascot mood={mascotMood} />

          </FadeContent>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(360px,1fr)] xl:grid-cols-[minmax(0,2.2fr)_minmax(380px,1fr)] mb-6">
          <div className="space-y-4 min-w-0">
            <FadeContent>
              <CandlestickChart data={candles} />
            </FadeContent>
            <FadeContent>
              <TradeLog trades={trades} />
            </FadeContent>
            <FadeContent>
              <AIInsights onOptimize={handleOptimize} />
            </FadeContent>
          </div>

          <div className="space-y-4 min-w-0">
            <FadeContent>
              <RightSidebar
                status={status}
                symbol={symbol}
                onStart={handleStart}
                onStop={handleStop}
                strategy={strategy}
                onOptimize={handleOptimize}
                optimizing={optimizing}
              />
            </FadeContent>
        
            <FadeContent>
              <SpotlightCard className="p-4 sm:p-6 md:p-8"><ActivityLog key="log" /></SpotlightCard>
            </FadeContent>
            <FadeContent>
              <StrategyVotes />
            </FadeContent>
          </div>
        </div>

        <FadeContent>
          <div className="card mb-6 w-full min-w-0 overflow-hidden flex flex-col">
            <div className="flex flex-wrap bg-slate-800/40 rounded-lg p-0.5 gap-0.5 mb-4">
              {(["strategies", "daily"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => { setHistoryTab(t); localStorage.setItem("aitrader_history_tab", t); }}
                  className={`flex-1 min-w-[120px] px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                    historyTab === t
                      ? "bg-slate-700 text-slate-100"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {t === "strategies" ? "Strategies" : "Daily"}
                </button>
              ))}
            </div>
            <div className="max-h-[min(24rem,60vh)] overflow-y-auto pr-1">
              {historyTab === "strategies" ? (
                <StrategyHistory key="strategies" onActivate={handleActivateStrategy} />
              ) : (
                <DailyPerformance key="daily" trades={trades} />
              )}
            </div>
          </div>
        </FadeContent>

        {showStopDialog && (
          <StopDialog
            onStopNow={stopNow}
            onStopAfterTrade={stopAfterTrade}
            onCancel={cancelDialog}
            pendingOptimize={pendingOptimize}
          />
        )}
      </div>
    </div>
  );
}
