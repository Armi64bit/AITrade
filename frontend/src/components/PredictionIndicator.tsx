import { useEffect, useState, useRef } from "react";
import { api } from "../api/client";

interface Prediction {
  signal: number;
  direction: "buy" | "sell" | "hold";
  confidence: number;
  prob_win: number;
  prob_loss: number;
  adaptive_threshold: number;
  model_agreement: string;
  model_ready: boolean;
  ensemble_conviction: number;
  trend: number;
  feature_importance: { name: string; importance: number }[] | null;
  expected_pnl_pct?: number;
}

export function PredictionIndicator() {
  const [pred, setPred] = useState<Prediction | null>(null);
  const prevDirection = useRef<string | null>(null);
  const flash = useRef(false);

  useEffect(() => {
    const fetchPrediction = async () => {
      try {
        const p = await api.getModelPredictSignal();
        if (p.direction !== prevDirection.current) {
          flash.current = true;
          prevDirection.current = p.direction;
          setTimeout(() => { flash.current = false; }, 600);
        }
        setPred(p);
      } catch {}
    };
    fetchPrediction();
    const id = setInterval(fetchPrediction, 5000);
    return () => clearInterval(id);
  }, []);

  if (!pred || !pred.model_ready) {
    return (
      <div className="rounded-2xl border border-slate-800/80 bg-slate-950/90 p-4 shadow-[0_18px_55px_rgba(0,0,0,0.25)]">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-500 mb-2">AI Prediction</p>
        <p className="text-sm text-slate-500">Waiting for model...</p>
      </div>
    );
  }

  const isBuy = pred.direction === "buy";
  const isSell = pred.direction === "sell";

  const arrowColor = isBuy ? "text-emerald-400" : isSell ? "text-red-400" : "text-slate-400";
  const arrowSymbol = isBuy ? "▲" : isSell ? "▼" : "◆";
  const label = isBuy ? "BUY" : isSell ? "SELL" : "HOLD";
  const confidencePct = (pred.confidence * 100).toFixed(0);
  const probWinPct = (pred.prob_win * 100).toFixed(0);
  const probLossPct = (pred.prob_loss * 100).toFixed(0);
  const barColor = isBuy ? "bg-emerald-500" : isSell ? "bg-red-500" : "bg-slate-500";
  const bgFlash = flash.current ? (isBuy ? "bg-emerald-500/10" : isSell ? "bg-red-500/10" : "bg-slate-500/10") : "";

  const trendLabel = pred.trend === 1 ? "Uptrend" : pred.trend === -1 ? "Downtrend" : "Neutral";
  const trendColor = pred.trend === 1 ? "text-emerald-400" : pred.trend === -1 ? "text-red-400" : "text-yellow-400";

  const agreementColor = pred.model_agreement === "agree" ? "text-emerald-400" : "text-amber-400";

  return (
    <div className={`rounded-2xl border border-slate-800/80 bg-slate-950/90 p-4 shadow-[0_18px_55px_rgba(0,0,0,0.25)] transition-colors duration-300 ${bgFlash}`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">AI Prediction</p>
        <span className={`text-xs ${agreementColor}`}>{pred.model_agreement === "agree" ? "Models Agree" : "Models Diverge"}</span>
      </div>

      <div className="flex items-center gap-3 mb-3">
        <span className={`text-2xl font-bold ${arrowColor} transition-all duration-300`}>
          {arrowSymbol}
        </span>
        <div>
          <span className={`text-lg font-bold ${arrowColor}`}>{label}</span>
          <span className="text-sm text-slate-400 ml-2">{confidencePct}% confidence</span>
        </div>
      </div>

      <div className="w-full bg-slate-800 rounded-full h-2 mb-3 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pred.confidence * 100}%` }}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-slate-900/60 rounded-lg p-2">
          <span className="text-slate-500">Win Probability</span>
          <p className={`font-semibold ${isBuy ? "text-emerald-400" : "text-slate-300"}`}>{probWinPct}%</p>
        </div>
        <div className="bg-slate-900/60 rounded-lg p-2">
          <span className="text-slate-500">Loss Probability</span>
          <p className={`font-semibold ${isSell ? "text-red-400" : "text-slate-300"}`}>{probLossPct}%</p>
        </div>
        <div className="bg-slate-900/60 rounded-lg p-2">
          <span className="text-slate-500">Market Trend</span>
          <p className={`font-semibold ${trendColor}`}>{trendLabel}</p>
        </div>
        <div className="bg-slate-900/60 rounded-lg p-2">
          <span className="text-slate-500">Ensemble Conviction</span>
          <p className="font-semibold text-slate-300">{(pred.ensemble_conviction * 100).toFixed(0)}%</p>
        </div>
      </div>

      {(pred.expected_pnl_pct != null) && (
        <div className="mt-2 bg-slate-900/60 rounded-lg p-2 text-xs">
          <span className="text-slate-500">Expected P&L</span>
          <p className={`font-semibold ${pred.expected_pnl_pct > 0 ? "text-emerald-400" : "text-red-400"}`}>
            {(pred.expected_pnl_pct * 100).toFixed(3)}%
          </p>
        </div>
      )}
      <div className="mt-2 pt-2 border-t border-slate-800/60">
        <p className="text-xs text-slate-500">
          Threshold: {(pred.adaptive_threshold * 100).toFixed(0)}% |
          Signal: {pred.signal > 0 ? "Long" : pred.signal < 0 ? "Short" : "Neutral"}
        </p>
      </div>
    </div>
  );
}
