import type { Performance } from "../api/client";
import { money } from "../utils/currency";

export function Dashboard({ perf }: { perf: Performance | null }) {
  if (!perf) return null;

  const isGreen = perf.total_pnl >= 0;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="card">
        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Balance</div>
        <div className={`text-xl md:text-2xl font-bold ${isGreen ? "text-emerald-400" : "text-red-400"}`}>
          {money(perf.current_balance)}
        </div>
      </div>
      <div className="card">
        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Profit & Loss</div>
        <div className={`text-xl md:text-2xl font-bold ${isGreen ? "text-emerald-400" : "text-red-400"}`}>
          {perf.total_pnl >= 0 ? "+" : ""}{money(perf.total_pnl)}
        </div>
      </div>
      <div className="card">
        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Win Rate</div>
        <div className="text-xl md:text-2xl font-bold text-blue-400">
          {(perf.win_rate * 100).toFixed(1)}%
        </div>
        <div className="text-xs text-slate-500 mt-1">
          <span className="text-emerald-400">{perf.wins} wins</span>
          {" / "}
          <span className="text-red-400">{perf.losses} losses</span>
        </div>
      </div>
      <div className="card">
        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Trades</div>
        <div className="text-xl md:text-2xl font-bold text-purple-400">{perf.total_trades}</div>
        <div className="mt-1 flex gap-2">
          <span className="badge badge-win">{perf.wins} W</span>
          <span className="badge badge-loss">{perf.losses} L</span>
        </div>
      </div>
    </div>
  );
}
