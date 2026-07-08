import type { BotStatus } from "../api/client";

export function Controls({ status, onStart, onStop }: {
  status: BotStatus | null;
  onStart: () => void;
  onStop: () => void;
}) {
  const running = status?.running ?? false;
  const price = status?.last_price;
  const rsi = status?.indicators?.rsi;
  const emaS = status?.indicators?.ema_short;
  const emaL = status?.indicators?.ema_long;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-200">Bot Controls</h3>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${running ? "bg-emerald-400 animate-pulse" : "bg-red-500"}`} />
          <span className="text-sm text-slate-400">{running ? "Running" : "Stopped"}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
        <div className="bg-slate-800/50 px-3 py-2 rounded">
          <div className="text-slate-400">BTC/USDT</div>
          <div className="text-lg font-bold text-slate-100">${price?.toFixed(2) ?? "—"}</div>
        </div>
        <div className="bg-slate-800/50 px-3 py-2 rounded">
          <div className="text-slate-400">RSI (14)</div>
          <div className={`text-lg font-bold ${rsi !== null && rsi !== undefined ? (rsi > 70 ? "text-red-400" : rsi < 30 ? "text-emerald-400" : "text-slate-100") : "text-slate-500"}`}>
            {rsi !== null && rsi !== undefined ? rsi.toFixed(1) : "—"}
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          onClick={onStart}
          disabled={running}
          className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg font-medium transition-colors cursor-pointer"
        >
          Start
        </button>
        <button
          onClick={onStop}
          disabled={!running}
          className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg font-medium transition-colors cursor-pointer"
        >
          Stop
        </button>
      </div>
    </div>
  );
}
