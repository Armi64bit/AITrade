export function StopDialog({ onStopNow, onStopAfterTrade, onCancel, pendingOptimize }: {
  onStopNow: () => void;
  onStopAfterTrade: () => void;
  onCancel: () => void;
  pendingOptimize?: boolean;
}) {
  const title = pendingOptimize ? "⚠️ Optimize with Active Trade?" : "⚠️ Active Trade in Progress";
  const subtitle = pendingOptimize
    ? "There is an open position. The bot will stop, optimize, then restart. How would you like to proceed?"
    : "There is currently an open position. How would you like to stop the bot?";
  const stopLabel = pendingOptimize ? "Stop Now — Close & Optimize" : "Stop Now — Close Trade Immediately";
  const afterTradeLabel = pendingOptimize ? "Stop After Trade — Then Optimize" : "Stop After This Trade Ends";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-800 border border-slate-600 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
        <h3 className="text-lg font-semibold text-slate-100 mb-2">{title}</h3>
        <p className="text-sm text-slate-400 mb-6">{subtitle}</p>
        <div className="flex flex-col gap-3">
          <button
            onClick={onStopNow}
            className="w-full px-4 py-3 bg-red-600 hover:bg-red-500 rounded-xl font-medium text-white transition-colors cursor-pointer"
          >
            {stopLabel}
          </button>
          <button
            onClick={onStopAfterTrade}
            className="w-full px-4 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-medium text-slate-200 transition-colors cursor-pointer"
          >
            {afterTradeLabel}
          </button>
          <button
            onClick={onCancel}
            className="w-full px-4 py-2 text-sm text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
