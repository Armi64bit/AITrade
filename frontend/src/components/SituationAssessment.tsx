import { useEffect, useState } from "react";
import { api, type BotStatus, type Performance } from "../api/client";

interface Props {
  status: BotStatus | null;
  perf: Performance | null;
  latestTradeLabel: string | null;
  latestTradeResult: string | null;
  latestTradeTime: string | null;
  latestTradeWon: boolean | undefined;
  latestTradeClosed: boolean | undefined;
}

interface PredictionSignal {
  signal: number;
  direction: string;
  confidence: number;
  prob_win: number;
  prob_loss: number;
  trend: number;
  ensemble_conviction: number;
  expected_pnl_pct?: number;
  model_ready?: boolean;
}

export function SituationAssessment({ status, perf, latestTradeLabel, latestTradeResult, latestTradeTime, latestTradeWon, latestTradeClosed }: Props) {
  const [prediction, setPrediction] = useState<PredictionSignal | null>(null);

  useEffect(() => {
    const fetch = async () => {
      try { setPrediction(await api.getModelPredictSignal()); } catch {}
    };
    fetch();
    const id = setInterval(fetch, 5000);
    return () => clearInterval(id);
  }, []);

  const running = status?.running ?? false;
  const position = status?.position;
  const inPosition = position != null;
  const consecLosses = status?.consecutive_losses ?? 0;
  const winRate = perf?.win_rate ?? 0;
  const totalTrades = perf?.total_trades ?? 0;
  const balance = perf?.current_balance ?? 0;
  const startBalance = 10000;
  const pnl = balance - startBalance;
  const pnlPct = (pnl / startBalance) * 100;

  const predDirection = prediction?.direction ?? "hold";
  const predConf = prediction?.confidence ?? 0;
  const trend = prediction?.trend ?? 0;
  const conviction = prediction?.ensemble_conviction ?? 0;
  const expPnl = prediction?.expected_pnl_pct;

  const modelReady = prediction?.model_ready ?? false;

  const trendSymbol = trend === 1 ? "\u2191" : trend === -1 ? "\u2193" : "\u2192";
  const trendLabel = trend === 1 ? "Uptrend" : trend === -1 ? "Downtrend" : "Neutral";

  let stateLabel: string;
  let stateColor: string;
  let stateIcon: string;

  if (!running) {
    stateLabel = "OFFLINE";
    stateColor = "text-slate-500 bg-slate-800/50";
    stateIcon = "\u25CB";
  } else if (inPosition) {
    const side = position?.side?.toUpperCase() ?? "?";
    stateLabel = `IN ${side}`;
    stateColor = side === "BUY" ? "text-emerald-400 bg-emerald-500/10" : "text-red-400 bg-red-500/10";
    stateIcon = side === "BUY" ? "\u25B2" : "\u25BC";
  } else if (predDirection === "buy" && predConf > 0.5) {
    stateLabel = "PLANNING BUY";
    stateColor = "text-emerald-400 bg-emerald-500/10";
    stateIcon = "\u2197";
  } else if (predDirection === "sell" && predConf > 0.5) {
    stateLabel = "PLANNING SELL";
    stateColor = "text-red-400 bg-red-500/10";
    stateIcon = "\u2198";
  } else if (conviction > 0.2) {
    stateLabel = "LEANING BULLISH";
    stateColor = "text-emerald-400 bg-emerald-500/10";
    stateIcon = "\u2191";
  } else if (conviction < -0.2) {
    stateLabel = "LEANING BEARISH";
    stateColor = "text-red-400 bg-red-500/10";
    stateIcon = "\u2193";
  } else if (modelReady) {
    stateLabel = "HOLDING";
    stateColor = "text-yellow-400 bg-yellow-500/10";
    stateIcon = "\u25C9";
  } else {
    stateLabel = "SEARCHING";
    stateColor = "text-blue-400 bg-blue-500/10";
    stateIcon = "\u25CB";
  }

  let assessment: string;
  let assessmentColor: string;
  let outlook: string;
  let outlookColor: string;
  let detailLines: string[] = [];

  if (!running) {
    assessment = "Bot is stopped";
    assessmentColor = "text-slate-400";
    outlook = "Start the bot to begin trading";
    outlookColor = "text-slate-500";
  } else if (totalTrades === 0) {
    assessment = "Just getting started";
    assessmentColor = "text-blue-400";
    outlook = "Waiting for first trade signal";
    outlookColor = "text-slate-400";
  } else {
    if (consecLosses >= 5) {
      assessment = "Recovery mode \u2014 high loss streak";
      assessmentColor = "text-red-400";
      detailLines.push("Extended cooldown active (3h between trades)");
      detailLines.push("Position sizing reduced to preserve capital");
    } else if (consecLosses >= 3) {
      assessment = "Caution \u2014 losing streak";
      assessmentColor = "text-amber-400";
      detailLines.push("Tighter entry thresholds active");
      detailLines.push("Only high-conviction signals will be accepted");
    } else if (pnlPct > 2) {
      assessment = "Profitable \u2014 good momentum";
      assessmentColor = "text-emerald-400";
    } else if (pnlPct > 0) {
      assessment = "Slightly positive \u2014 holding steady";
      assessmentColor = "text-green-400";
    } else if (pnlPct > -2) {
      assessment = "Slight drawdown \u2014 within normal range";
      assessmentColor = "text-yellow-400";
    } else {
      assessment = "In drawdown \u2014 below initial balance";
      assessmentColor = "text-red-400";
      detailLines.push("Consider running optimizer to adapt");
    }

    if (inPosition) {
      const side = position?.side?.toUpperCase() ?? "";
      const entry = position?.entry_price;
      const sl = position?.stop_loss_pct;
      const tp = position?.take_profit_pct;
      outlook = `${side} position at $${entry?.toFixed(2) ?? "?"} | SL: ${sl != null ? (sl * 100).toFixed(1) : "?"}% | TP: ${tp != null ? (tp * 100).toFixed(1) : "?"}%`;
      outlookColor = "text-slate-300";
    } else if (consecLosses >= 5) {
      outlook = "Waiting for high-conviction setups before next entry";
      outlookColor = "text-amber-400";
    } else if (predDirection === "buy" && predConf > 0.55) {
      outlook = `ML predicts UP \u2014 ${(predConf * 100).toFixed(0)}% confidence`;
      outlookColor = "text-emerald-400";
    } else if (predDirection === "sell" && predConf > 0.55) {
      outlook = `ML predicts DOWN \u2014 ${(predConf * 100).toFixed(0)}% confidence`;
      outlookColor = "text-red-400";
    } else if (conviction > 0.3) {
      outlook = "Ensemble leaning bullish \u2014 watching for entry";
      outlookColor = "text-emerald-400";
    } else if (conviction < -0.3) {
      outlook = "Ensemble leaning bearish \u2014 staying out";
      outlookColor = "text-red-400";
    } else if (trend === 1) {
      outlook = "Market uptrend \u2014 looking for long entries";
      outlookColor = "text-emerald-400";
    } else if (trend === -1) {
      outlook = "Market downtrend \u2014 no long entries";
      outlookColor = "text-slate-400";
    } else {
      outlook = "Market neutral \u2014 waiting for clear signal";
      outlookColor = "text-slate-400";
    }

    if (!inPosition && running) {
      detailLines.push("Scanning for next entry signal");
    }

    if (expPnl != null && predDirection !== "hold") {
      const sign = expPnl > 0 ? "+" : "";
      detailLines.push(`Expected P&L on next trade: ${sign}${(expPnl * 100).toFixed(3)}%`);
    }

    if (modelReady && predConf > 0) {
      detailLines.push(`ML confidence: ${(predConf * 100).toFixed(0)}% | Conviction: ${(conviction * 100).toFixed(0)}%`);
    }
  }

  const totalWins = perf?.wins ?? 0;
  const totalLosses = perf?.losses ?? 0;

  return (
    <div className="rounded-3xl border border-slate-800/80 bg-slate-950/90 p-6 shadow-[0_18px_55px_rgba(0,0,0,0.25)] h-full flex flex-col justify-between">
      <div className="space-y-3 flex-1">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Situation Assessment</p>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${stateColor}`}>
            {stateIcon} {stateLabel}
          </span>
        </div>

        <p className={`text-xl font-semibold tracking-tight ${assessmentColor}`}>{assessment}</p>

        {latestTradeClosed && (
          <div className="space-y-0.5">
            <p className="text-xs text-slate-500 uppercase tracking-[0.2em]">Last trade</p>
            <p className={`text-sm font-medium ${latestTradeWon ? "text-emerald-400" : "text-red-400"}`}>
              {latestTradeLabel} \u2014 {latestTradeResult}
            </p>
            <p className="text-xs text-slate-500">{latestTradeTime}</p>
          </div>
        )}

        {running && (
          <div className="flex items-center gap-3 text-xs bg-slate-900/60 rounded-lg p-2.5">
            <span className="text-slate-500">Trend: <span className={`font-semibold ${trend === 1 ? "text-emerald-400" : trend === -1 ? "text-red-400" : "text-yellow-400"}`}>{trendSymbol} {trendLabel}</span></span>
            <span className="text-slate-500">Model: <span className={`font-semibold ${modelReady ? "text-emerald-400" : "text-slate-400"}`}>{modelReady ? "Trained" : "Waiting"}</span></span>
            <span className="text-slate-500">Conviction: <span className={`font-semibold ${conviction > 0 ? "text-emerald-400" : conviction < 0 ? "text-red-400" : "text-slate-300"}`}>{(conviction * 100).toFixed(0)}%</span></span>
          </div>
        )}

        <div className="space-y-1">
          <p className={`text-sm font-medium ${outlookColor}`}>{outlook}</p>
          {detailLines.map((line, i) => (
            <p key={i} className="text-xs text-slate-400">{line}</p>
          ))}
        </div>

        {totalTrades > 0 && (
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-slate-900/60 rounded-lg p-2 text-center">
              <p className="text-xs text-slate-500">Trades</p>
              <p className="text-sm font-semibold text-slate-200">{totalTrades}</p>
            </div>
            <div className="bg-slate-900/60 rounded-lg p-2 text-center">
              <p className="text-xs text-slate-500">Win Rate</p>
              <p className={`text-sm font-semibold ${winRate > 0.5 ? "text-emerald-400" : "text-red-400"}`}>
                {(winRate * 100).toFixed(0)}%
              </p>
            </div>
            <div className="bg-slate-900/60 rounded-lg p-2 text-center">
              <p className="text-xs text-slate-500">P&L</p>
              <p className={`text-sm font-semibold ${pnl >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                {pnlPct > 0 ? "+" : ""}{pnlPct.toFixed(1)}%
              </p>
            </div>
            <div className="bg-slate-900/60 rounded-lg p-2 text-center">
              <p className="text-xs text-slate-500">Streak</p>
              <p className={`text-sm font-semibold ${consecLosses >= 3 ? "text-red-400" : "text-slate-300"}`}>
                {consecLosses}L
              </p>
            </div>
          </div>
        )}

        {predDirection !== "hold" && predConf > 0.5 && (
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${predDirection === "buy" ? "bg-emerald-500" : "bg-red-500"}`}
              style={{ width: `${predConf * 100}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
