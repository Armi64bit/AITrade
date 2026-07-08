import { useEffect, useState, useCallback } from "react";
import { api } from "../api/client";

interface AIResponse {
  messages: string[];
  recommended_pair: string;
  suggest_optimize: boolean;
  position_status: string;
  expected_next_trade: number | null;
  expected_profit_24h: number | null;
  current_pnl: number | null;
}

interface Signal {
  signal: string;
  entry: string;
  stop_loss: string;
  take_profit: string;
  confidence: number;
  reasoning: string;
}

export function AIInsights({ onOptimize }: { onOptimize: () => void }) {
  const [data, setData] = useState<AIResponse | null>(null);
  const [signal, setSignal] = useState<Signal | null>(null);
  const [loading, setLoading] = useState(true);
  const [sigLoading, setSigLoading] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      try {
        const d = await api.getAIInsights();
        setData(d);
      } catch {}
      setLoading(false);
    };
    fetch();
    const id = setInterval(fetch, 8000);
    return () => clearInterval(id);
  }, []);

  const fetchSignal = useCallback(async () => {
    setSigLoading(true);
    try {
      const d = await api.getDeepAnalysis();
      setSignal(d);
    } catch {
      setSignal(null);
    }
    setSigLoading(false);
  }, []);

  // Auto-fetch signal on mount and every 30s
  useEffect(() => {
    fetchSignal();
    const id = setInterval(fetchSignal, 30000);
    return () => clearInterval(id);
  }, [fetchSignal]);

  if (loading && !data) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold text-slate-200 mb-3">AI Analysis</h3>
        <div className="text-slate-500 text-sm animate-pulse">Analyzing market...</div>
      </div>
    );
  }
  if (!data) return null;

  const isSearching = data.position_status === "SEARCHING";
  const isInBuy = data.position_status?.startsWith("IN B");
  const isInSell = data.position_status?.startsWith("IN S");

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold">
            AI
          </div>
          <h3 className="text-lg font-semibold text-slate-200">AI Analysis</h3>
        </div>
      </div>

      {/* Top status bar */}
      <div className="flex flex-wrap gap-2 mb-4 p-3 rounded-lg bg-slate-800/50">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isSearching ? "bg-yellow-400" : isInBuy ? "bg-emerald-400" : isInSell ? "bg-red-400" : "bg-slate-500"}`} />
          <span className={`text-sm font-semibold ${isSearching ? "text-yellow-400" : isInBuy ? "text-emerald-400" : isInSell ? "text-red-400" : "text-slate-400"}`}>
            {data.position_status}
          </span>
        </div>
        {data.expected_next_trade != null && isSearching && (
          <div className="text-xs text-slate-400">
            Next trade in ~{data.expected_next_trade}h
          </div>
        )}
        {data.current_pnl != null && !isSearching && (
          <div className={`text-xs font-medium ${data.current_pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            P&L: {data.current_pnl >= 0 ? "+" : ""}{data.current_pnl}%
          </div>
        )}
        {data.expected_profit_24h != null && (
          <div className={`text-xs font-medium ${data.expected_profit_24h >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            24h forecast: {data.expected_profit_24h >= 0 ? "+" : ""}{data.expected_profit_24h}%
          </div>
        )}
      </div>

      {/* AI Trading Signal */}
      <div className="mb-3 p-3 rounded-lg bg-gradient-to-r from-slate-800 to-slate-900 border border-slate-700">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="text-xs text-slate-400 uppercase tracking-wider">Signal</div>
            {signal && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                signal.signal === "BUY" ? "bg-emerald-500/20 text-emerald-400" :
                signal.signal === "SELL" ? "bg-red-500/20 text-red-400" :
                signal.signal === "HOLD" ? "bg-yellow-500/20 text-yellow-400" :
                "bg-slate-600/20 text-slate-400"
              }`}>
                {signal.signal}
              </span>
            )}
          </div>
          <button
            onClick={fetchSignal}
            disabled={sigLoading}
            className="text-xs text-slate-500 hover:text-slate-300 disabled:text-slate-700 transition-colors cursor-pointer"
          >
            {sigLoading ? "⟳" : "↻"}
          </button>
        </div>

        {sigLoading && !signal ? (
          <div className="text-xs text-slate-500 animate-pulse">Analyzing market...</div>
        ) : signal ? (
          <div className="space-y-2">
            {/* Confidence bar */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-500">Confidence</span>
              <div className="flex-1 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    signal.confidence >= 70 ? "bg-emerald-500" :
                    signal.confidence >= 40 ? "bg-yellow-500" :
                    "bg-red-500"
                  }`}
                  style={{ width: `${signal.confidence}%` }}
                />
              </div>
              <span className="text-slate-300 font-mono w-8 text-right">{signal.confidence}%</span>
            </div>

            {/* Entry / SL / TP grid */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="p-1.5 rounded bg-slate-800/80">
                <div className="text-slate-500">Entry</div>
                <div className="text-slate-200 font-mono">{signal.entry}</div>
              </div>
              <div className="p-1.5 rounded bg-slate-800/80">
                <div className="text-red-400">Stop Loss</div>
                <div className="text-slate-200 font-mono">{signal.stop_loss}</div>
              </div>
              <div className="p-1.5 rounded bg-slate-800/80">
                <div className="text-emerald-400">Take Profit</div>
                <div className="text-slate-200 font-mono">{signal.take_profit}</div>
              </div>
            </div>

            {/* Reasoning */}
            {signal.reasoning && !signal.reasoning.includes("⚠️") && (
              <div className="text-xs text-slate-400 leading-relaxed">{signal.reasoning}</div>
            )}
            {signal.reasoning && signal.reasoning.includes("⚠️") && (
              <div className="text-xs text-yellow-300">{signal.reasoning}</div>
            )}
          </div>
        ) : (
          <div className="text-xs text-slate-500">Click refresh to get a signal.</div>
        )}
      </div>

      {/* Messages */}
      <div className="space-y-2 mb-3 max-h-64 overflow-y-auto">
        {data.messages.map((msg, i) => {
          const isWarning = msg.includes("⚠️") || msg.includes("losses in a row");
          const isAction = msg.includes("⏳") || msg.includes("⏹️") || msg.includes("🔍");
          const isPositive = msg.includes("📈") || msg.includes("💡");
          return (
            <div
              key={i}
              className={`text-sm px-3 py-2 rounded-lg ${
                isWarning ? "bg-yellow-500/10 border border-yellow-500/20 text-yellow-300" :
                isAction ? "bg-blue-500/10 border border-blue-500/20 text-blue-300" :
                isPositive ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300" :
                "bg-slate-800/50 text-slate-300"
              }`}
            >
              {msg}
            </div>
          );
        })}
      </div>

      {/* Bottom bar */}
      <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-700">
        <div className="text-xs text-slate-500">
          Recommended: <span className="text-emerald-400 font-semibold">{data.recommended_pair}</span>
        </div>
        {data.suggest_optimize && (
          <button
            onClick={onOptimize}
            className="ml-auto px-3 py-1 text-xs bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors cursor-pointer"
          >
            Auto-Optimize Now
          </button>
        )}
      </div>
    </div>
  );
}
