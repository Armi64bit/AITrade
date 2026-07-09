import type { Performance } from "../api/client";
import { money } from "../utils/currency";
import SpotlightCard from "./SpotlightCard";

export function Dashboard({ perf }: { perf: Performance | null }) {
  if (!perf) return null;

  const isGreen = perf.total_pnl >= 0;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-8">
      {/* Balance Card */}
      <SpotlightCard>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Balance</label>
            <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 opacity-75"></div>
          </div>
          <div className={`text-2xl md:text-3xl font-black bg-gradient-to-r ${isGreen ? "from-emerald-400 via-emerald-300 to-cyan-400" : "from-red-400 via-red-300 to-orange-400"} bg-clip-text text-transparent`}>
            {money(perf.current_balance)}
          </div>
          <div className={`h-0.5 w-12 rounded-full bg-gradient-to-r ${isGreen ? "from-emerald-400 to-cyan-400" : "from-red-400 to-orange-400"}`}></div>
        </div>
      </SpotlightCard>

      {/* Profit & Loss Card */}
      <SpotlightCard>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">P&L</label>
            <div className={`w-1.5 h-1.5 rounded-full ${isGreen ? "bg-emerald-400" : "bg-red-400"} opacity-75`}></div>
          </div>
          <div className={`text-2xl md:text-3xl font-black bg-gradient-to-r ${isGreen ? "from-emerald-400 via-emerald-300 to-cyan-400" : "from-red-400 via-red-300 to-orange-400"} bg-clip-text text-transparent`}>
            {perf.total_pnl >= 0 ? "+" : ""}{money(perf.total_pnl)}
          </div>
          <div className={`text-xs font-medium ${isGreen ? "text-emerald-400/80" : "text-red-400/80"}`}>
            {isGreen ? "↑ Positive" : "↓ Negative"}
          </div>
        </div>
      </SpotlightCard>

      {/* Win Rate Card */}
      <SpotlightCard>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Win Rate</label>
            <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-blue-400 to-violet-500 opacity-75"></div>
          </div>
          <div className="text-2xl md:text-3xl font-black bg-gradient-to-r from-blue-400 via-blue-300 to-cyan-400 bg-clip-text text-transparent">
            {(perf.win_rate * 100).toFixed(1)}%
          </div>
          <div className="flex gap-3 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
              <span className="text-emerald-400">{perf.wins}W</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-400"></div>
              <span className="text-red-400">{perf.losses}L</span>
            </div>
          </div>
        </div>
      </SpotlightCard>

      {/* Total Trades Card */}
      <SpotlightCard>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Trades</label>
            <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-purple-400 to-pink-500 opacity-75"></div>
          </div>
          <div className="text-2xl md:text-3xl font-black bg-gradient-to-r from-purple-400 via-purple-300 to-pink-400 bg-clip-text text-transparent">
            {perf.total_trades}
          </div>
          <div className="flex gap-2 pt-1">
            <div className="flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-gradient-to-r from-emerald-500/10 to-emerald-400/5 border border-emerald-400/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              <span className="text-xs font-bold text-emerald-400">{perf.wins}</span>
            </div>
            <div className="flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-gradient-to-r from-red-500/10 to-red-400/5 border border-red-400/20">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
              <span className="text-xs font-bold text-red-400">{perf.losses}</span>
            </div>
          </div>
        </div>
      </SpotlightCard>
    </div>
  );
}
