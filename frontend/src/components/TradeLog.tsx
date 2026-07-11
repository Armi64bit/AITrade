import { useState, useCallback } from "react";
import type { Trade } from "../api/client";
import { CryptoIcon } from "./CryptoIcon";
import { money, pct } from "../utils/currency";

const TRADES_PER_PAGE = 10;

export function TradeLog({ trades }: { trades: Trade[] }) {
  const [page, setPage] = useState(0);
  const totalPages = Math.ceil(trades.length / TRADES_PER_PAGE) || 1;
  const pageTrades = trades.slice(page * TRADES_PER_PAGE, (page + 1) * TRADES_PER_PAGE);

  return (
    <div className="card w-full min-w-0">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-200">Trade History</h3>
        <span className="text-xs text-slate-500">{trades.length} trades</span>
      </div>
      <div className="overflow-x-auto min-w-0">
        <table className="min-w-full w-full text-sm table-auto">
          <thead>
            <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-slate-700">
              <th className="text-left py-2 font-medium">Pair</th>
              <th className="text-left py-2 font-medium">Time</th>
              <th className="text-center py-2 font-medium">Side</th>
              <th className="text-right py-2 font-medium">Entry</th>
              <th className="text-right py-2 font-medium">Exit</th>
              <th className="text-right py-2 font-medium">P&L</th>
              <th className="text-right py-2 font-medium">Return</th>
            </tr>
          </thead>
          <tbody>
            {pageTrades.map((t) => {
              const won = t.pnl != null && t.pnl >= 0;
              return (
                <tr key={t.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                  <td className="py-2">
                    <div className="flex items-center gap-2">
                      <CryptoIcon symbol={t.symbol} size={22} />
                      <span className="text-slate-300 text-xs">{t.symbol.replace("/USDT", "")}</span>
                    </div>
                  </td>
                  <td className="py-2 text-slate-400 text-xs whitespace-nowrap">{new Date(t.entry_time).toLocaleString()}</td>
                  <td className="py-2 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                      t.side === "buy" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                    }`}>
                      {t.side === "buy" ? "BUY" : "SELL"}
                    </span>
                  </td>
                  <td className="text-right py-2 text-slate-200 font-mono text-xs">{t.entry_price ? `$${t.entry_price.toFixed(2)}` : "—"}</td>
                  <td className="text-right py-2 text-slate-200 font-mono text-xs">{t.exit_price ? `$${t.exit_price.toFixed(2)}` : "—"}</td>
                  <td className={`text-right py-2 font-mono text-xs font-medium ${won ? "text-emerald-400" : "text-red-400"}`}>
                    {t.pnl != null ? (won ? "+" : "") + money(t.pnl) : "—"}
                  </td>
                  <td className={`text-right py-2 font-mono text-xs ${won ? "text-emerald-400" : "text-red-400"}`}>
                    {t.pnl_pct != null ? pct(t.pnl_pct) : "—"}
                  </td>
                </tr>
              );
            })}
            {trades.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center py-8 text-slate-500">
                  <div className="text-2xl mb-2">📊</div>
                  No trades yet
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-3">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 rounded cursor-pointer disabled:cursor-default"
          >
            Prev
          </button>
          <span className="text-xs text-slate-500">{page + 1} / {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 rounded cursor-pointer disabled:cursor-default"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
