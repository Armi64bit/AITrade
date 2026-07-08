import { useEffect, useState } from "react";
import { api } from "../api/client";

interface HistoryEntry {
  id: number;
  params: Record<string, number>;
  sharpe_ratio: number | null;
  is_active: boolean;
  created_at: string | null;
  total_trades: number;
  wins: number;
  losses: number;
}

export function StrategyHistory({ onActivate }: { onActivate: (params: Record<string, number>, sharpe: number | null, total_trades?: number, wins?: number, losses?: number) => void }) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState<number | null>(null);

  const fetchHistory = async () => {
    try {
      const h = await api.getStrategyHistory();
      setHistory(h);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchHistory(); }, []);

  const handleActivate = async (entry: HistoryEntry) => {
    if (entry.is_active) return;
    setActivating(entry.id);
    try {
      const result = await api.activateStrategy(entry.id);
      if (result.status === "activated") {
        onActivate(result.params, result.sharpe_ratio, entry.total_trades, entry.wins, entry.losses);
        await fetchHistory();
      }
    } catch {}
    setActivating(null);
  };

  if (loading) return null;

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-slate-200 mb-3">Strategy History</h3>

      {history.length > 0 && (
        <div className="space-y-2 text-sm max-h-80 overflow-y-auto">
          {history.map((entry) => {
            const isActive = entry.is_active;
            return (
              <div
                key={entry.id}
                className={`p-2 rounded flex items-center justify-between ${
                  isActive ? "bg-emerald-500/10 border border-emerald-500/30" : "bg-slate-800/50"
                }`}
              >
                <div>
                  <div className="text-xs font-medium flex items-center gap-2">
                    <span className={isActive ? "text-emerald-300" : "text-slate-300"}>#{entry.id}</span>
                    {isActive && <span className="text-[10px] text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-full font-semibold">ACTIVE</span>}
                  </div>
                  <div className="text-xs text-slate-500">
                    W: {entry.wins} / L: {entry.losses}
                  </div>
                  {entry.sharpe_ratio != null && (
                    <div className={`text-xs font-mono ${entry.sharpe_ratio >= 1 ? "text-emerald-400" : entry.sharpe_ratio >= 0 ? "text-yellow-400" : "text-red-400"}`}>
                      Sharpe: {entry.sharpe_ratio.toFixed(3)}
                    </div>
                  )}
                </div>
                {!isActive && (
                  <button
                    onClick={() => handleActivate(entry)}
                    disabled={activating === entry.id}
                    className="px-2.5 py-1 text-xs bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 rounded transition-colors cursor-pointer"
                  >
                    {activating === entry.id ? "..." : "Use"}
                  </button>
                )}
                {isActive && (
                  <span className="text-xs text-emerald-500 font-medium">In use</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {history.length === 0 && (
        <div className="text-center text-slate-500 text-xs py-4">No strategies saved yet. Run Auto-Optimize to create one.</div>
      )}
    </div>
  );
}
