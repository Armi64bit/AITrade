import type { BotStatus } from "../api/client";
import { CryptoIcon } from "./CryptoIcon";
import { money } from "../utils/currency";

function rsiLabel(v: number): string {
  if (v >= 70) return "Overbought";
  if (v <= 30) return "Oversold";
  return "Neutral";
}

function rsiColor(v: number): string {
  if (v >= 70) return "text-red-400";
  if (v <= 30) return "text-emerald-400";
  return "text-slate-100";
}

function interpretRSI(v: number): string {
  if (v >= 70) return "Market may be overpriced — potential sell signal";
  if (v <= 30) return "Market may be underpriced — potential buy signal";
  if (v > 55) return "Slight bullish momentum";
  if (v < 45) return "Slight bearish momentum";
  return "No clear direction";
}

export function Controls({ status, onStart, onStop }: {
  status: BotStatus | null;
  onStart: () => void;
  onStop: () => void;
}) {
  const running = status?.running ?? false;
  const price = status?.last_price;
  const rsi = status?.indicators?.rsi;
  const sym = status?.position?.symbol ?? "BTC/USDT";

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-200">Bot Controls</h3>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${running ? "bg-emerald-400 animate-pulse" : "bg-red-500"}`} />
          <span className={`text-sm font-medium ${running ? "text-emerald-400" : "text-red-400"}`}>
            {running ? "Running" : "Stopped"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 mb-4 text-sm">
        <div className="bg-slate-800/50 px-4 py-3 rounded flex items-center gap-3">
          <CryptoIcon symbol={sym} size={36} />
          <div className="flex-1">
            <div className="text-slate-400 text-xs uppercase tracking-wider">Current Price</div>
            <div className="text-xl font-bold text-slate-100">
              {price ? money(price) : "—"}
            </div>
          </div>
        </div>

        {rsi !== null && rsi !== undefined && (
          <div className="bg-slate-800/50 px-4 py-3 rounded">
            <div className="flex items-center justify-between mb-1">
              <div className="text-slate-400 text-xs uppercase tracking-wider">RSI (14)</div>
              <div className={`text-lg font-bold ${rsiColor(rsi)}`}>
                {rsi.toFixed(1)}
                <span className="text-xs font-normal ml-2 text-slate-500">{rsiLabel(rsi)}</span>
              </div>
            </div>
            <div className="text-xs text-slate-500">{interpretRSI(rsi)}</div>
            <div className="mt-2 w-full bg-slate-700 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all ${rsi > 50 ? "bg-emerald-500" : "bg-red-500"}`}
                style={{ width: `${Math.min(rsi, 100)}%` }}
              />
            </div>
          </div>
        )}

        {status?.indicators?.ema_short != null && status?.indicators?.ema_long != null && (
          <div className="bg-slate-800/50 px-4 py-3 rounded">
            <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Trend Signals</div>
            <div className="flex justify-between text-xs">
              <span className="text-slate-400">EMA Short (fast): <span className="text-slate-200 font-mono">{status.indicators.ema_short.toFixed(2)}</span></span>
              <span className="text-slate-400">EMA Long (slow): <span className="text-slate-200 font-mono">{status.indicators.ema_long.toFixed(2)}</span></span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {status.indicators.ema_short > status.indicators.ema_long
                ? "Bullish trend — fast EMA above slow EMA"
                : "Bearish trend — fast EMA below slow EMA"}
            </div>
          </div>
        )}
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
