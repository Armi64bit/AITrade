import type { Performance } from "../api/client";

export function Dashboard({ perf }: { perf: Performance | null }) {
  if (!perf) return null;
  const balanceColor = perf.total_pnl >= 0 ? "text-emerald-400" : "text-red-400";

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="card">
        <div className="text-sm text-slate-400 mb-1">Balance</div>
        <div className={`text-2xl font-bold ${balanceColor}`}>
          ${perf.current_balance.toFixed(2)}
        </div>
      </div>
      <div className="card">
        <div className="text-sm text-slate-400 mb-1">P&L</div>
        <div className={`text-2xl font-bold ${balanceColor}`}>
          {perf.total_pnl >= 0 ? "+" : ""}${perf.total_pnl.toFixed(2)}
        </div>
      </div>
      <div className="card">
        <div className="text-sm text-slate-400 mb-1">Win Rate</div>
        <div className="text-2xl font-bold text-blue-400">
          {(perf.win_rate * 100).toFixed(1)}%
        </div>
      </div>
      <div className="card">
        <div className="text-sm text-slate-400 mb-1">Trades</div>
        <div className="text-2xl font-bold text-purple-400">
          {perf.total_trades}
          <span className="text-sm text-emerald-400 ml-2">W:{perf.wins}</span>
          <span className="text-sm text-red-400 ml-2">L:{perf.losses}</span>
        </div>
      </div>
    </div>
  );
}
