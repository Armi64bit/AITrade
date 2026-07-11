import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";
import { api } from "../api/client";

const INPUT_NEURONS = 5;
const HIDDEN_NEURONS = 8;
const OUTPUT_NEURONS = 2;
const FEATURE_NAMES = ["price", "ema_gap", "rsi", "volatility", "momentum"];

interface ModelVizProps {
  mlModel: {
    trained: boolean;
    accuracy: number;
    trades_used: number;
    trades_available: number;
    trades_since_last: number;
    last_train_time: number | null;
    improvement: number;
    training: boolean;
  };
}

interface LivePrediction {
  signal: number;
  confidence: number;
  coefficients: number[] | null;
  prediction: {
    features: number[];
    feature_names: string[];
    prob_win: number;
    prob_loss: number;
  } | null;
}

function Neuron({ cx, cy, label, active, idx }: { cx: number; cy: number; label?: string; active?: boolean; idx?: number }) {
  const delay = idx != null ? idx * 0.15 : 0;
  return (
    <g>
      <circle cx={cx} cy={cy} r={8} fill={active ? "#6366f1" : "#1e293b"} stroke={active ? "#a78bfa" : "#334155"} strokeWidth={1.5}>
        <animate attributeName="fill" values={active ? "#6366f1;#818cf8;#6366f1" : "#1e293b;#1a1a3e;#1e293b"} dur={active ? "1s" : "3s"} begin={`${delay}s`} repeatCount="indefinite" />
      </circle>
      <circle cx={cx} cy={cy} r={8} fill="none" stroke="#6366f1" strokeWidth={0.4}>
        <animate attributeName="r" values="8;14;8" dur="2s" begin={`${delay}s`} repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" begin={`${delay}s`} repeatCount="indefinite" />
      </circle>
      {label && <text x={cx} y={cy + 20} textAnchor="middle" fill="#94a3b8" fontSize={8}>{label}</text>}
    </g>
  );
}

export function ModelViz({ mlModel }: ModelVizProps) {
  const [open, setOpen] = useState(false);
  const [live, setLive] = useState<LivePrediction | null>(null);

  const fetchLive = useCallback(async () => {
    try {
      const data = await api.getModelPredictLive();
      setLive(data);
    } catch {}
  }, []);

  useEffect(() => {
    if (!open) return;
    fetchLive();
    const id = setInterval(fetchLive, 5000);
    return () => clearInterval(id);
  }, [open, fetchLive]);

  const W = 500;
  const H = 340;
  const xIn = 50;
  const xHid = 210;
  const xOut = 370;
  const inGap = H / (INPUT_NEURONS + 1);
  const hidGap = H / (HIDDEN_NEURONS + 1);
  const outGap = H / (OUTPUT_NEURONS + 1);

  const coefs = live?.coefficients ?? [];
  const featVals = live?.prediction?.features ?? [];
  const probWin = live?.prediction?.prob_win ?? 0.5;
  const probLoss = live?.prediction?.prob_loss ?? 0.5;
  const signal = live?.signal ?? 0;
  const signalLabel = signal === 1 ? "BUY" : signal === -1 ? "SELL" : "HOLD";
  const hasLive = live?.prediction != null;
  const hasModel = mlModel.trained;
  const isLive = hasLive && hasModel;

  const conns = [];
  for (let i = 0; i < INPUT_NEURONS; i++) {
    for (let j = 0; j < HIDDEN_NEURONS; j++) {
      const raw = coefs[i] || 0.3;
      const w = Math.max(0.3, Math.abs(raw) * 2);
      conns.push({ x1: xIn, y1: inGap * (i + 1), x2: xHid, y2: hidGap * (j + 1), w, strong: Math.abs(raw) > 0.3 });
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="absolute top-1 right-1 z-10 w-5 h-5 flex items-center justify-center rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer text-[10px] font-bold"
        title="Model visualization"
      >
        i
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="!max-w-[900px] bg-slate-950 border-slate-800 text-slate-100 overflow-y-auto max-h-[90vh]">
          <DialogTitle className="text-lg font-semibold text-slate-100">Neural Network Model</DialogTitle>
          <div className="flex items-center gap-2 mt-1 mb-2">
            <span className="text-xs text-slate-500">Signal:</span>
            <span className={`text-sm font-bold ${signal === 1 ? "text-emerald-400" : signal === -1 ? "text-red-400" : "text-slate-400"}`}>
              {signalLabel}
            </span>
            <span className="text-xs text-slate-500 ml-2">Confidence:</span>
            <span className="text-xs font-bold text-purple-400">{(live?.confidence ?? 0).toFixed(2)}</span>
            {isLive && <span className="text-xs text-green-400/80 ml-auto font-mono animate-pulse">Live</span>}
            {!hasModel && <span className="text-xs text-amber-400/80 ml-auto font-mono">Not trained</span>}
            {hasModel && !hasLive && <span className="text-xs text-slate-500 ml-auto font-mono">Waiting...</span>}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_220px] gap-4">
            <div className="bg-slate-900/60 rounded-xl p-2 flex items-center justify-center">
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-h-[400px]">
                <defs>
                  <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.05} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                {conns.map((c, i) => (
                  <line key={`c-${i}`} x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2} stroke={c.strong ? "#818cf8" : "url(#lineGrad)"} strokeWidth={c.w} strokeDasharray="3 3" opacity={0.4 + c.w * 0.3}>
                    <animate attributeName="stroke-dashoffset" values="0;-6" dur="2s" repeatCount="indefinite" />
                  </line>
                ))}
                <g>
                  {Array.from({ length: INPUT_NEURONS }).map((_, i) => {
                    const val = featVals[i] ?? 0;
                    return <Neuron key={`in-${i}`} cx={xIn} cy={inGap * (i + 1)} label={FEATURE_NAMES[i]} active={isLive && Math.abs(val) > 0.1} idx={i} />;
                  })}
                </g>
                <g>
                  {Array.from({ length: HIDDEN_NEURONS }).map((_, i) => (
                    <Neuron key={`hid-${i}`} cx={xHid} cy={hidGap * (i + 1)} active={isLive} idx={i} />
                  ))}
                </g>
                <g>
                  <Neuron cx={xOut} cy={outGap * 1} label="Loss" idx={0} />
                  <Neuron cx={xOut} cy={outGap * 2} label="Win" active={isLive} idx={1} />
                  <text x={xOut + 30} y={outGap * 1 + 4} fill={isLive && probLoss > 0.55 ? "#ef4444" : "#64748b"} fontSize={10} fontWeight="bold">
                    {hasLive ? `${(probLoss * 100).toFixed(0)}%` : "---"}
                  </text>
                  <text x={xOut + 30} y={outGap * 2 + 4} fill={isLive && probWin > 0.55 ? "#22c55e" : "#64748b"} fontSize={10} fontWeight="bold">
                    {hasLive ? `${(probWin * 100).toFixed(0)}%` : "---"}
                  </text>
                </g>
                <text x={xIn} y={H - 6} textAnchor="middle" fill="#64748b" fontSize={8}>Input (5)</text>
                <text x={xHid} y={H - 6} textAnchor="middle" fill="#64748b" fontSize={8}>Hidden (8)</text>
                <text x={xOut} y={H - 6} textAnchor="middle" fill="#64748b" fontSize={8}>Output (2)</text>
              </svg>
            </div>

            <div className="space-y-2">
              {!hasModel ? (
                <div className="bg-slate-900/60 rounded-xl p-4 text-center space-y-2">
                  <p className="text-xs text-amber-400 font-medium">Model not trained yet</p>
                  <p className="text-[10px] text-slate-500">Train the model from the mascot card to see live predictions and feature importance.</p>
                </div>
              ) : !hasLive ? (
                <div className="bg-slate-900/60 rounded-xl p-4 text-center space-y-2">
                  <p className="text-xs text-slate-400 font-medium animate-pulse">Waiting for data...</p>
                  <p className="text-[10px] text-slate-500">Model is loaded. Predictions will appear once the bot evaluates the next candle.</p>
                </div>
              ) : (
                <>
                  <div className="bg-slate-900/60 rounded-xl p-3 space-y-1.5">
                    <h4 className="text-xs uppercase tracking-wider text-slate-500 mb-1.5">Live Feature Values</h4>
                    {FEATURE_NAMES.map((name, i) => {
                      const val = featVals[i] ?? 0;
                      const coef = coefs[i] ?? 0;
                      return (
                        <div key={name} className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 capitalize">{name}</span>
                          <div className="flex items-center gap-2">
                            <span className={`font-mono ${Math.abs(val) > 0.1 ? "text-emerald-300" : "text-slate-500"}`}>{val.toFixed(4)}</span>
                            <span className="text-[10px] text-indigo-400 w-8 text-right font-mono">{(coef * 100).toFixed(0)}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="bg-slate-900/60 rounded-xl p-3 space-y-1.5">
                    <h4 className="text-xs uppercase tracking-wider text-slate-500">Probabilities</h4>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">Win</span>
                        <span className="text-emerald-400 font-semibold">{(probWin * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500" style={{ width: `${probWin * 100}%` }} />
                      </div>
                      <div className="flex justify-between text-xs mt-1">
                        <span className="text-slate-400">Loss</span>
                        <span className="text-red-400 font-semibold">{(probLoss * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all duration-500" style={{ width: `${probLoss * 100}%` }} />
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900/60 rounded-xl p-3">
                    <h4 className="text-xs uppercase tracking-wider text-slate-500 mb-1.5">Connection Weights</h4>
                    <div className="flex flex-wrap gap-1">
                      {FEATURE_NAMES.map((name, i) => {
                        const strength = Math.abs(coefs[i] ?? 0);
                        return (
                          <div key={name} className="flex items-center gap-1 bg-slate-800/60 rounded px-1.5 py-0.5">
                            <span className="text-[9px] text-slate-400">{name.slice(0, 4)}</span>
                            <div className="w-8 h-1 rounded-full bg-slate-700 overflow-hidden">
                              <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${Math.min(100, strength * 100)}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
              <div className="bg-slate-900/60 rounded-xl p-3">
                <h4 className="text-xs uppercase tracking-wider text-slate-500 mb-1.5">Architecture</h4>
                <div className="space-y-0.5 text-[10px] text-slate-400">
                  <p>Logistic Regression</p>
                  <p>5 features → 2 classes</p>
                  {hasModel && <p className="text-emerald-400">Model loaded</p>}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}