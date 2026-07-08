import type { StrategyInfo } from "../api/client";

const DEFAULTS: Record<string, number> = {
  ema_short: 7,
  ema_long: 25,
  rsi_period: 14,
  rsi_overbought: 70,
  rsi_oversold: 30,
};

const LABELS: Record<string, string> = {
  ema_short: "Fast EMA period",
  ema_long: "Slow EMA period",
  rsi_period: "RSI lookback",
  rsi_overbought: "Overbought threshold",
  rsi_oversold: "Oversold threshold",
};

const DESCRIPTIONS: Record<string, string> = {
  ema_short: "How many recent candles to track for quick trend changes",
  ema_long: "How many candles to track for the overall trend direction",
  rsi_period: "Number of candles used to calculate RSI",
  rsi_overbought: "RSI level above which the market is considered overpriced",
  rsi_oversold: "RSI level below which the market is considered underpriced",
};

function explainChange(key: string, current: number): string | null {
  const def = DEFAULTS[key];
  if (def === undefined) return null;
  const diff = current - def;
  if (Math.abs(diff) < 0.01) return null;

  const direction = diff > 0 ? "increased" : "decreased";
  const absDiff = Math.abs(diff);

  const explanations: Record<string, (d: number) => string> = {
    ema_short: (d) =>
      d > 0
        ? "Reacts slower to price changes — fewer false signals"
        : "Reacts faster to price changes — more sensitive",
    ema_long: (d) =>
      d > 0
        ? "Longer-term trend view — smoother but delayed"
        : "Shorter-term trend view — more responsive",
    rsi_period: (d) =>
      d > 0
        ? "Smoother RSI — less noise but slower to react"
        : "More sensitive RSI — catches moves earlier but more false signals",
    rsi_overbought: (d) =>
      d > 0
        ? "Less sensitive to overbought — avoids premature sells"
        : "More aggressive sell signals on smaller rallies",
    rsi_oversold: (d) =>
      d < 0
        ? "Less sensitive to oversold — avoids premature buys"
        : "More aggressive buy signals on small dips",
  };

  const explain = explanations[key]?.(diff);
  return `${key.replace("_", " ").toUpperCase()}: ${direction} by ${absDiff.toFixed(1)} — ${explain ?? ""}`;
}

export function StrategyPanel({ strategy, onOptimize, optimizing }: {
  strategy: StrategyInfo | null;
  onOptimize: () => void;
  optimizing: boolean;
}) {
  const params = strategy?.params ?? {};
  const hasParams = Object.keys(params).length > 0;
  const changes = hasParams ? Object.entries(params).map(([k, v]) => explainChange(k, v)).filter(Boolean) : [];

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold text-slate-200">Strategy</h3>
        <button
          onClick={onOptimize}
          disabled={optimizing}
          className="px-3 py-1.5 text-xs bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg transition-colors cursor-pointer"
        >
          {optimizing ? "Optimizing..." : "Auto-Optimize"}
        </button>
      </div>

      {strategy?.sharpe_ratio !== null && strategy?.sharpe_ratio !== undefined && (
        <div className="text-sm mb-3 p-3 rounded-lg bg-slate-800/50">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-slate-400">Performance Score:</span>
            <span className={`font-bold ${strategy.sharpe_ratio >= 1 ? "text-emerald-400" : strategy.sharpe_ratio >= 0 ? "text-yellow-400" : "text-red-400"}`}>
              {strategy.sharpe_ratio.toFixed(3)}
            </span>
            <span className="text-xs text-slate-500">
              {strategy.sharpe_ratio >= 1 ? "(Excellent)" : strategy.sharpe_ratio >= 0.5 ? "(Good)" : strategy.sharpe_ratio >= 0 ? "(Poor)" : "(Bad)"}
            </span>
          </div>
          {strategy.wins !== undefined && (
            <div className="flex gap-3 text-xs">
              <span className="text-emerald-400">Wins: {strategy.wins}</span>
              <span className="text-red-400">Losses: {strategy.losses}</span>
              <span className="text-slate-400">
                Win rate: {strategy.total_trades ? ((strategy.wins / strategy.total_trades) * 100).toFixed(1) : "—"}%
              </span>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2 text-sm">
        {hasParams ? (
          <>
            {Object.entries(params).map(([k, v]) => (
              <div key={k} className="bg-slate-800/50 px-3 py-2 rounded">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-xs">{LABELS[k] ?? k}</span>
                  <span className="text-slate-200 font-mono font-semibold text-base">{typeof v === "number" ? v.toFixed(v < 1 ? 3 : 0) : v}</span>
                </div>
                {DESCRIPTIONS[k] && (
                  <div className="text-xs text-slate-500 mt-0.5">{DESCRIPTIONS[k]}</div>
                )}
              </div>
            ))}
            {(changes.length > 0) && (
              <div className="mt-3 pt-3 border-t border-slate-700">
                <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Changes from defaults</div>
                {changes.map((c, i) => (
                  <div key={i} className="text-xs text-slate-400 mb-1">• {c}</div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="text-center text-slate-500 py-4">
            <div className="text-lg mb-1">⚙️</div>
            <div>Default params active</div>
            <div className="text-xs mt-1">Click Auto-Optimize to find better settings</div>
          </div>
        )}
      </div>
    </div>
  );
}
