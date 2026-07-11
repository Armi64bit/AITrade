import { useEffect, useState } from "react";
import { api, type BotStatus } from "../api/client";

const styles = `
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.shimmer {
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
`;

interface Vote {
  name: string;
  signal: number;
  confidence: number;
  weight: number;
}
interface Tracking {
  [name: string]: { wins: number; losses: number; trades: number };
}

interface LiveML {
  signal: number;
  confidence: number;
  prediction: {
    features: number[];
    prob_win: number;
    prob_loss: number;
  } | null;
}

const STRATEGY_COLORS: Record<string, string> = {
  EmaCrossover: "#818cf8",
  RsiReversal: "#34d399",
  BbSqueeze: "#f472b6",
  Momentum: "#fb923c",
};

function signalLabel(v: number): string {
  if (v > 0) return "BUY";
  if (v < 0) return "SELL";
  return "HOLD";
}
export function DecisionBoard({ status }: { status: BotStatus | null }) {
  const [votes, setVotes] = useState<Vote[]>([]);
  const [tracking, setTracking] = useState<Tracking>({});
  const [mlLive, setMlLive] = useState<LiveML | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try {
        const [vd, ml] = await Promise.all([
          api.getStrategyVotes(),
          api.getModelPredictLive(),
        ]);
        setVotes(vd.votes);
        setTracking(vd.tracking);
        setMlLive(ml);
      } catch {}
    };
    fetch();
    const id = setInterval(fetch, 5000);
    return () => clearInterval(id);
  }, []);

  const rsi = status?.indicators?.rsi ?? null;
  const emaShort = status?.indicators?.ema_short ?? null;
  const emaLang = status?.indicators?.ema_long ?? null;
  const emaGap = emaShort != null && emaLang != null ? ((emaShort - emaLang) / emaLang) * 100 : null;
  const switchMsg = status?.last_pair_switch_msg;

  const featVals = mlLive?.prediction?.features ?? [];
  const volatility = featVals[3] ?? null;
  const momentum = featVals[4] ?? null;

  const mlSignal = mlLive?.signal ?? 0;
  const mlConf = mlLive?.confidence ?? 0;

  const buyVotes = votes.filter((v) => v.signal > 0).length;
  const sellVotes = votes.filter((v) => v.signal < 0).length;
  const finalSignal = buyVotes > sellVotes ? 1 : sellVotes > buyVotes ? -1 : 0;

  const allVotes = [
    ...votes.map((v) => ({ ...v, isML: false })),
    { name: "ML Model", signal: mlSignal, confidence: mlConf, weight: 0.5, isML: true as const },
  ];

  if (votes.length === 0 && mlLive == null) return null;

  return (
    <>
      <style>{styles}</style>
    <div className="rounded-2xl border border-slate-800/80 bg-slate-950/90 p-4 shadow-[0_18px_55px_rgba(0,0,0,0.25)]">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs uppercase tracking-[0.2em] text-slate-400 font-semibold">Decision Board</h3>
        <span className="text-[10px] font-mono text-green-400/60 animate-pulse">● Live</span>
      </div>

      <div className={`rounded-xl border p-3 mb-3 text-center transition-all duration-500 ${
        finalSignal > 0 ? "border-emerald-500/40 bg-emerald-500/5" :
        finalSignal < 0 ? "border-red-500/40 bg-red-500/5" :
        "border-slate-700/40 bg-slate-800/20"
      }`}>
        <div className="flex items-center justify-center gap-3">
          <span className={`text-2xl font-bold tracking-wider ${
            finalSignal > 0 ? "text-emerald-400" :
            finalSignal < 0 ? "text-red-400" :
            "text-slate-400"
          }`}>
            {signalLabel(finalSignal)}
          </span>
          <span className="text-xs text-purple-400 font-mono">
            {((votes.reduce((s, v) => s + v.confidence * v.weight, 0) + mlConf * 0.5) / (votes.reduce((s, v) => s + v.weight, 0) + 0.5) * 100).toFixed(0)}%
          </span>
          <div className="flex gap-1 ml-auto">
            <span className="text-[10px] text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">{buyVotes}↑</span>
            <span className="text-[10px] text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">{sellVotes}↓</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-1.5 mb-3">
        {rsi != null && (
          <div className="bg-slate-800/30 rounded-lg px-2 py-1.5 text-xs">
            <div className="text-slate-500 text-[9px] uppercase tracking-wider">RSI</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`font-bold font-mono ${rsi >= 70 ? "text-red-400" : rsi <= 30 ? "text-emerald-400" : "text-slate-200"}`}>{rsi.toFixed(1)}</span>
              <div className="flex-1 h-1 rounded-full bg-slate-700 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{
                  width: `${Math.min(100, rsi)}%`,
                  background: `linear-gradient(90deg, #34d399, #fbbf24, #ef4444)`
                }} />
              </div>
            </div>
          </div>
        )}
        {volatility != null && (
          <div className="bg-slate-800/30 rounded-lg px-2 py-1.5 text-xs">
            <div className="text-slate-500 text-[9px] uppercase tracking-wider">Volatility</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`font-bold font-mono ${volatility > 0.5 ? "text-amber-400" : "text-blue-400"}`}>{volatility.toFixed(3)}</span>
              <div className="flex-1 h-1 rounded-full bg-slate-700 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{
                  width: `${Math.min(100, volatility * 100)}%`,
                  background: volatility > 0.5 ? "#fb923c" : "#60a5fa"
                }} />
              </div>
            </div>
          </div>
        )}
        {momentum != null && (
          <div className="bg-slate-800/30 rounded-lg px-2 py-1.5 text-xs">
            <div className="text-slate-500 text-[9px] uppercase tracking-wider">Momentum</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`font-bold font-mono ${momentum > 0 ? "text-emerald-400" : "text-red-400"}`}>{momentum.toFixed(3)}</span>
              <div className="flex-1 h-1 rounded-full bg-slate-700 overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${momentum > 0 ? "bg-emerald-500" : "bg-red-500"}`} style={{
                  width: `${Math.min(100, Math.abs(momentum) * 100)}%`,
                }} />
              </div>
            </div>
          </div>
        )}
        {emaGap != null && (
          <div className="bg-slate-800/30 rounded-lg px-2 py-1.5 text-xs">
            <div className="text-slate-500 text-[9px] uppercase tracking-wider">EMA Gap</div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`font-bold font-mono ${emaGap > 0 ? "text-emerald-400" : "text-red-400"}`}>{emaGap > 0 ? "BULL" : "BEAR"}</span>
              <div className="flex-1 h-1 rounded-full bg-slate-700 overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${emaGap > 0 ? "bg-emerald-500" : "bg-red-500"}`} style={{
                  width: `${Math.min(100, Math.abs(emaGap) * 20)}%`,
                }} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-1">
        {allVotes.map((v) => {
          const t = !v.isML ? tracking[v.name] : null;
          const wr = t && t.trades > 0 ? ((t.wins / t.trades) * 100).toFixed(0) : "—";
          const color = !v.isML ? (STRATEGY_COLORS[v.name] || "#818cf8") : "#a78bfa";
          return (
            <div
              key={v.isML ? "ml" : v.name}
              className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] border-l-2 transition-all duration-300 ${
                v.isML ? "bg-purple-900/10 border-purple-500/40" : "bg-slate-800/20 border-slate-700/40"
              }`}
            >
              <span className="w-16 text-slate-300 shrink-0 font-medium">{v.isML ? "ML Model" : v.name.replace(/([A-Z])/g, " $1").trim()}</span>
              <span className={`px-1 py-0.5 rounded text-[9px] font-bold ${
                v.signal > 0 ? "bg-emerald-500/15 text-emerald-400" :
                v.signal < 0 ? "bg-red-500/15 text-red-400" :
                "bg-slate-600/20 text-slate-500"
              }`}>
                {signalLabel(v.signal)}
              </span>
              <div className="flex-1 h-1 rounded-full bg-slate-700 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 shimmer"
                  style={{ width: `${v.confidence * 100}%`, backgroundColor: color }}
                />
              </div>
              {!v.isML && (
                <>
                  <span className="text-slate-500 w-8 text-right">{wr}%</span>
                  <span className="text-slate-600 w-8 text-right">{v.weight.toFixed(1)}w</span>
                </>
              )}
              {v.isML && v.confidence > 0 && (
                <span className="text-purple-400/60 w-8 text-right">AI</span>
              )}
            </div>
          );
        })}
      </div>

      {switchMsg && (
        <div className="mt-3 rounded-lg bg-cyan-900/10 border border-cyan-500/20 px-2.5 py-1.5">
          <div className="flex items-center gap-2 text-[11px]">
            <span className="text-cyan-400 animate-pulse">↺</span>
            <span className="text-cyan-300/80 font-medium">{switchMsg}</span>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
