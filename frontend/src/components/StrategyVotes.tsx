import { useEffect, useState } from "react";
import { api } from "../api/client";

interface Vote {
  name: string;
  signal: number;
  confidence: number;
  weight: number;
}

interface Tracking {
  [name: string]: { wins: number; losses: number; trades: number };
}

const SIGNAL_LABELS: Record<number, string> = { 1: "BUY", 0: "—", -1: "SELL" };
const SIGNAL_COLORS: Record<number, string> = {
  1: "bg-emerald-500/20 text-emerald-400",
  -1: "bg-red-500/20 text-red-400",
  0: "bg-slate-600/20 text-slate-500",
};

export function StrategyVotes() {
  const [votes, setVotes] = useState<Vote[]>([]);
  const [tracking, setTracking] = useState<Tracking>({});

  useEffect(() => {
    const fetch = async () => {
      try {
        const d = await api.getStrategyVotes();
        setVotes(d.votes);
        setTracking(d.tracking);
      } catch {}
    };
    fetch();
    const id = setInterval(fetch, 10000);
    return () => clearInterval(id);
  }, []);

  if (votes.length === 0) return null;

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-slate-200 mb-3">Strategy Votes</h3>
      <div className="space-y-1.5 text-xs">
        {votes.map((v) => {
          const t = tracking[v.name];
          const wr = t && t.trades > 0 ? ((t.wins / t.trades) * 100).toFixed(0) : "—";
          return (
            <div key={v.name} className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/30">
              <span className="w-20 text-slate-300 shrink-0">{v.name}</span>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${SIGNAL_COLORS[v.signal]}`}>
                {SIGNAL_LABELS[v.signal]}
              </span>
              <div className="flex-1 h-1 rounded-full bg-slate-700 overflow-hidden">
                <div
                  className={`h-full rounded-full ${v.confidence > 0 ? "bg-cyan-500" : ""}`}
                  style={{ width: `${v.confidence * 100}%` }}
                />
              </div>
              <span className="text-slate-500 w-14 text-right">w:{wr}%</span>
              <span className="text-slate-600 w-10 text-right">w:{v.weight.toFixed(1)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
