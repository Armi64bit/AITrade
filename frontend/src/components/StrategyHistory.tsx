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

export function StrategyHistory({ onActivate }: { onActivate: (params: Record<string, number>, sharpe: number | null) => void }) {
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
        onActivate(result.params, result.sharpe_ratio);
        await fetchHistory();
      }
    } catch {}
    setActivating(null);
  };

  const activeEntry = history.find((h) => h.is_active);
  const pastEntries = history.filter((h) => !h.is_active);

  if (loading) return null;

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-slate-200 mb-3">Strategy History</h3>

      {activeEntry && (
        <div className="mb-3 p-2 rounded bg-emerald-500/10 border border-emerald-500/30">
          <div className="text-xs text-emerald-400 uppercase tracking-wider mb-1">Active Strategy</div>
          <div className="text-sm flex items-center justify-between">
            <span className="text-slate-300">#{activeEntry.id}</span>
            <span className="text-emerald-400 font-mono text-xs">
              Sharpe: {activeEntry.sharpe_ratio?.toFixed(3) ?? "—"}
            </span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            W: {activeEntry.wins} / L: {activeEntry.losses} / Trades: {activeEntry.total_trades}
          </div>
        </div>
      )}

      {pastEntries.length > 0 && (
        <div className="space-y-2 text-sm max-h-60 overflow-y-auto">
          {pastEntries.map((entry) => (
            <div
              key={entry.id}
              className="p-2 rounded bg-slate-800/50 flex items-center justify-between"
            >
              <div>
                <div className="text-slate-300 text-xs font-medium">#{entry.id}</div>
                <div className="text-xs text-slate-500">
                  W: {entry.wins} / L: {entry.losses}
                </div>
                {entry.sharpe_ratio != null && (
                  <div className={`text-xs font-mono ${entry.sharpe_ratio >= 1 ? "text-emerald-400" : entry.sharpe_ratio >= 0 ? "text-yellow-400" : "text-red-400"}`}>
                    Sharpe: {entry.sharpe_ratio.toFixed(3)}
                  </div>
                )}
              </div>
              <button
                onClick={() => handleActivate(entry)}
                disabled={activating === entry.id}
                className="px-2.5 py-1 text-xs bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 rounded transition-colors cursor-pointer"
              >
                {activating === entry.id ? "..." : "Use"}
              </button>
            </div>
          ))}
        </div>
      )}

      {!activeEntry && pastEntries.length === 0 && (
        <div className="text-center text-slate-500 text-xs py-4">No strategies saved yet. Run Auto-Optimize to create one.</div>
      )}
    </div>
  );
}
