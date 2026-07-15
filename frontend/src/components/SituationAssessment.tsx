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
      assessment = "Recovery mode — high loss streak";
      assessmentColor = "text-red-400";
      detailLines.push(`Extended cooldown active (3h between trades)`);
    } else if (consecLosses >= 3) {
      assessment = "Caution — losing streak";
      assessmentColor = "text-amber-400";
      detailLines.push(`Tighter entry thresholds active`);
    } else if (pnlPct > 2) {
      assessment = "Profitable — good momentum";
      assessmentColor = "text-emerald-400";
    } else if (pnlPct > 0) {
      assessment = "Slightly positive — holding steady";
      assessmentColor = "text-green-400";
    } else if (pnlPct > -2) {
      assessment = "Slight drawdown — within normal range";
      assessmentColor = "text-yellow-400";
    } else {
      assessment = "In drawdown — below initial balance";
      assessmentColor = "text-red-400";
      detailLines.push(`Consider running optimizer to adapt`);
    }

    if (winRate > 0.55) {
      outlook = "Win rate is healthy — likely to recover";
      outlookColor = "text-emerald-400";
    } else if (consecLosses >= 5) {
      outlook = "Waiting for high-conviction setups before next entry";
      outlookColor = "text-amber-400";
    } else if (predDirection === "buy" && predConf > 0.55) {
      outlook = `ML predicts UP — ${(predConf * 100).toFixed(0)}% confidence`;
      outlookColor = "text-emerald-400";
    } else if (predDirection === "sell" && predConf > 0.55) {
      outlook = `ML predicts DOWN — ${(predConf * 100).toFixed(0)}% confidence`;
      outlookColor = "text-red-400";
    } else if (conviction > 0.3) {
      outlook = "Ensemble leaning bullish — watching for entry";
      outlookColor = "text-emerald-400";
    } else if (conviction < -0.3) {
      outlook = "Ensemble leaning bearish — staying out";
      outlookColor = "text-red-400";
    } else if (trend === 1) {
      outlook = "Market uptrend — looking for long entries";
      outlookColor = "text-emerald-400";
    } else if (trend === -1) {
      outlook = "Market downtrend — no long entries";
      outlookColor = "text-slate-400";
    } else {
      outlook = "Market neutral — waiting for clear signal";
      outlookColor = "text-slate-400";
    }

    if (inPosition) {
      detailLines.push(`In ${position.side?.toUpperCase() ?? "?"} position — monitoring exit`);
    } else if (running) {
      detailLines.push(`Scanning for next entry`);
    }

    if (expPnl != null && predDirection !== "hold") {
      detailLines.push(`Expected P&L on next trade: ${(expPnl * 100).toFixed(3)}%`);
    }
  }

  return (
    <div className="rounded-3xl border border-slate-800/80 bg-slate-950/90 p-6 shadow-[0_18px_55px_rgba(0,0,0,0.25)] h-full flex flex-col justify-between">
      <div className="space-y-3 flex-1">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Situation Assessment</p>
          <p className={`mt-2 text-xl font-semibold tracking-tight ${assessmentColor}`}>{assessment}</p>
        </div>

        {latestTradeClosed && (
          <div className="space-y-1">
            <p className="text-xs text-slate-500 uppercase tracking-[0.2em]">Last trade</p>
            <p className={`text-sm font-medium ${latestTradeWon ? "text-emerald-400" : "text-red-400"}`}>
              {latestTradeLabel} — {latestTradeResult}
            </p>
            <p className="text-xs text-slate-500">{latestTradeTime}</p>
          </div>
        )}

        <div className="space-y-1">
          <p className={`text-sm font-medium ${outlookColor}`}>{outlook}</p>
          {detailLines.map((line, i) => (
            <p key={i} className="text-xs text-slate-400">{line}</p>
          ))}
        </div>

        {totalTrades > 0 && (
          <div className="grid grid-cols-3 gap-2 pt-1">
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
              <p className="text-xs text-slate-500">Losers</p>
              <p className={`text-sm font-semibold ${consecLosses >= 3 ? "text-red-400" : "text-slate-300"}`}>
                {consecLosses} in a row
              </p>
            </div>
          </div>
        )}

        {predDirection !== "hold" && predConf > 0.5 && (
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden mt-1">
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
