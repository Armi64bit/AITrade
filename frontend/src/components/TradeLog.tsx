import type { Trade } from "../api/client";

export function TradeLog({ trades }: { trades: Trade[] }) {
  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-3 text-slate-200">Trade History</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-slate-400 border-b border-slate-700">
              <th className="text-left py-2">Time</th>
              <th className="text-left py-2">Side</th>
              <th className="text-right py-2">Entry</th>
              <th className="text-right py-2">Exit</th>
              <th className="text-right py-2">Qty</th>
              <th className="text-right py-2">P&L</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((t) => (
              <tr key={t.id} className="border-b border-slate-800 hover:bg-slate-800/30">
                <td className="py-2 text-slate-400">{new Date(t.entry_time).toLocaleString()}</td>
                <td className={`py-2 font-medium ${t.side === "buy" ? "text-emerald-400" : "text-red-400"}`}>
                  {t.side.toUpperCase()}
                </td>
                <td className="text-right py-2">${t.entry_price?.toFixed(2)}</td>
                <td className="text-right py-2">{t.exit_price ? `$${t.exit_price.toFixed(2)}` : "—"}</td>
                <td className="text-right py-2 text-slate-400">{t.quantity?.toFixed(6)}</td>
                <td className={`text-right py-2 font-medium ${t.pnl && t.pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {t.pnl ? `${t.pnl >= 0 ? "+" : ""}$${t.pnl.toFixed(2)}` : "—"}
                </td>
              </tr>
            ))}
            {trades.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-6 text-slate-500">No trades yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
