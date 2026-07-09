import { useMemo, useState } from "react";
import type { Trade } from "../api/client";
import { CryptoIcon } from "./CryptoIcon";

interface DayGroup {
  date: string;
  label: string;
  trades: Trade[];
  totalPnl: number;
  wins: number;
  losses: number;
}

function groupByDay(trades: Trade[]): DayGroup[] {
  const closed = trades.filter(t => t.status === "closed" && t.exit_time);
  const map = new Map<string, Trade[]>();
  for (const t of closed) {
    const day = t.exit_time!.slice(0, 10);
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(t);
  }
  const groups: DayGroup[] = [];
  for (const [date, ts] of map) {
    const wins = ts.filter(t => t.pnl && t.pnl > 0).length;
    const losses = ts.filter(t => t.pnl && t.pnl <= 0).length;
    const totalPnl = ts.reduce((s, t) => s + (t.pnl ?? 0), 0);
    const d = new Date(date);
    const label = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    groups.push({ date, label, trades: ts.sort((a, b) => (b.exit_time ?? "").localeCompare(a.exit_time ?? "")), totalPnl, wins, losses });
  }
  return groups.sort((a, b) => b.date.localeCompare(a.date));
}

export function DailyPerformance({ trades }: { trades: Trade[] }) {
  const days = useMemo(() => groupByDay(trades), [trades]);
  const [expanded, setExpanded] = useState<string | null>(null);

  if (days.length === 0) {
    return (
      <div className="text-center text-slate-500 text-xs py-4">No closed trades yet.</div>
    );
  }

  return (
    <div className="space-y-2 text-sm">
      {days.map((day) => {
        const isOpen = expanded === day.date;
        return (
          <div key={day.date} className="bg-slate-800/50 rounded overflow-hidden">
            <button
              onClick={() => setExpanded(isOpen ? null : day.date)}
              className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-slate-700/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">{day.label}</span>
                <span className={`text-xs font-medium ${day.totalPnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {day.totalPnl >= 0 ? "+" : ""}{day.totalPnl.toFixed(2)} USD
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="text-emerald-400">{day.wins}W</span>
                <span className="text-slate-600">|</span>
                <span className="text-red-400">{day.losses}L</span>
                <span className={`text-slate-500 transition-transform ${isOpen ? "rotate-90" : ""}`}>▶</span>
              </div>
            </button>
            {isOpen && (
              <div className="px-3 pb-2 space-y-1">
                {day.trades.map((t) => (
                  <div key={t.id} className="flex items-center justify-between text-xs px-2 py-1 rounded bg-slate-900/50">
                    <div className="flex items-center gap-1.5">
                      <CryptoIcon symbol={t.symbol} size={16} />
                      <span className={t.side === "buy" ? "text-emerald-400" : "text-red-400"}>{t.side.toUpperCase()}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-500">{t.entry_time?.slice(11, 19)}</span>
                      <span className={t.pnl && t.pnl >= 0 ? "text-emerald-400" : "text-red-400"}>
                        {t.pnl != null ? `${t.pnl >= 0 ? "+" : ""}${t.pnl.toFixed(2)}` : "—"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
