import type { StrategyInfo } from "../api/client";

export function StrategyPanel({ strategy, onOptimize, optimizing }: {
  strategy: StrategyInfo | null;
  onOptimize: () => void;
  optimizing: boolean;
}) {
  const params = strategy?.params ?? {};

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
        <div className="text-sm text-slate-400 mb-3">
          Sharpe: <span className="text-blue-400 font-mono">{strategy.sharpe_ratio.toFixed(3)}</span>
          {strategy.wins !== undefined && (
            <span className="ml-4">
              W: <span className="text-emerald-400">{strategy.wins}</span> /
              L: <span className="text-red-400">{strategy.losses}</span>
            </span>
          )}
        </div>
      )}
      <div className="grid grid-cols-2 gap-2 text-sm">
        {Object.entries(params).map(([k, v]) => (
          <div key={k} className="flex justify-between bg-slate-800/50 px-3 py-1.5 rounded">
            <span className="text-slate-400">{k}</span>
            <span className="text-slate-200 font-mono">{typeof v === "number" ? v.toFixed(v < 1 ? 3 : 0) : v}</span>
          </div>
        ))}
        {Object.keys(params).length === 0 && (
          <div className="col-span-2 text-center text-slate-500 py-2">Default params active</div>
        )}
      </div>
    </div>
  );
}
