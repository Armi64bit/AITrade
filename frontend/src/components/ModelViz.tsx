import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";

const INPUT_NEURONS = 5;
const HIDDEN_NEURONS = 8;
const OUTPUT_NEURONS = 2;

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

function Neuron({ cx, cy, label, pulse }: { cx: number; cy: number; label?: string; pulse?: boolean }) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={8} fill="#1e293b" stroke="#6366f1" strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={8} fill="none" stroke="#a78bfa" strokeWidth={0.5}>
        {pulse && <animate attributeName="r" values="8;14;8" dur="1.5s" repeatCount="indefinite" />}
      </circle>
      {pulse && (
        <circle cx={cx} cy={cy} r={8} fill="none" stroke="#c084fc" strokeWidth={0.3}>
          <animate attributeName="r" values="8;20;8" dur="1.5s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="0.6;0;0.6" dur="1.5s" repeatCount="indefinite" />
        </circle>
      )}
      {label && <text x={cx} y={cy + 20} textAnchor="middle" fill="#94a3b8" fontSize={8}>{label}</text>}
    </g>
  );
}

function PulseDot({ x1, y1, x2, y2, delay, color = "#6366f1" }: { x1: number; y1: number; x2: number; y2: number; delay: number; color?: string }) {
  return (
    <circle r={2.5} fill={color}>
      <animateMotion
        dur="2.5s"
        repeatCount="indefinite"
        begin={`${delay}s`}
        path={`M${x1},${y1} L${x2},${y2}`}
      />
      <animate attributeName="opacity" values="1;0.3;1" dur="2.5s" repeatCount="indefinite" begin={`${delay}s`} />
    </circle>
  );
}

export function ModelViz({ mlModel }: ModelVizProps) {
  const [open, setOpen] = useState(false);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (!open) { setPulse(false); return; }
    const t = setTimeout(() => setPulse(true), 300);
    return () => clearTimeout(t);
  }, [open]);

  const W = 420;
  const H = 280;
  const xIn = 50;
  const xHid = 210;
  const xOut = 370;
  const inGap = H / (INPUT_NEURONS + 1);
  const hidGap = H / (HIDDEN_NEURONS + 1);
  const outGap = H / (OUTPUT_NEURONS + 1);

  const inputLabels = ["Price", "EMA Gap", "RSI", "Volatility", "Momentum"];

  const conns = [];
  for (let i = 0; i < INPUT_NEURONS; i++) {
    for (let j = 0; j < HIDDEN_NEURONS; j++) {
      conns.push({ x1: xIn, y1: inGap * (i + 1), x2: xHid, y2: hidGap * (j + 1), delay: (i + j) * 0.08 });
    }
  }
  const conns2 = [];
  for (let i = 0; i < HIDDEN_NEURONS; i++) {
    conns2.push({ x1: xHid, y1: hidGap * (i + 1), x2: xOut, y2: outGap * 1, delay: i * 0.1 });
    conns2.push({ x1: xHid, y1: hidGap * (i + 1), x2: xOut, y2: outGap * 2, delay: i * 0.1 + 0.05 });
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
        <DialogContent className="max-w-[700px] bg-slate-950 border-slate-800 text-slate-100">
          <DialogTitle className="text-lg font-semibold text-slate-100">Neural Network Model</DialogTitle>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_240px] gap-4 mt-2">
            <div className="bg-slate-900/60 rounded-xl p-2 flex items-center justify-center">
              <svg viewBox={`0 0 ${W} ${H}`} className="w-full max-h-[280px]">
                <defs>
                  <linearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity={0.1} />
                    <stop offset="100%" stopColor="#6366f1" stopOpacity={0.3} />
                  </linearGradient>
                </defs>
                {conns.map((c, i) => (
                  <line key={`c1-${i}`} x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2} stroke="url(#lineGrad)" strokeWidth={0.6} />
                ))}
                {conns2.map((c, i) => (
                  <line key={`c2-${i}`} x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2} stroke="url(#lineGrad)" strokeWidth={0.6} />
                ))}
                {pulse && conns.map((c, i) => (
                  <PulseDot key={`p1-${i}`} x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2} delay={c.delay} />
                ))}
                {pulse && conns2.map((c, i) => (
                  <PulseDot key={`p2-${i}`} x1={c.x1} y1={c.y1} x2={c.x2} y2={c.y2} delay={c.delay} color="#a78bfa" />
                ))}
                <g>
                  {Array.from({ length: INPUT_NEURONS }).map((_, i) => (
                    <Neuron key={`in-${i}`} cx={xIn} cy={inGap * (i + 1)} label={inputLabels[i]} pulse={pulse} />
                  ))}
                </g>
                <g>
                  {Array.from({ length: HIDDEN_NEURONS }).map((_, i) => (
                    <Neuron key={`hid-${i}`} cx={xHid} cy={hidGap * (i + 1)} pulse={pulse} />
                  ))}
                </g>
                <g>
                  {Array.from({ length: OUTPUT_NEURONS }).map((_, i) => (
                    <Neuron key={`out-${i}`} cx={xOut} cy={outGap * (i + 1)} label={i === 0 ? "Loss" : "Win"} pulse={pulse} />
                  ))}
                </g>
                <text x={xIn} y={H - 6} textAnchor="middle" fill="#64748b" fontSize={8}>Input (5)</text>
                <text x={xHid} y={H - 6} textAnchor="middle" fill="#64748b" fontSize={8}>Hidden (8)</text>
                <text x={xOut} y={H - 6} textAnchor="middle" fill="#64748b" fontSize={8}>Output (2)</text>
              </svg>
            </div>

            <div className="space-y-3">
              <div className="bg-slate-900/60 rounded-xl p-3 space-y-2">
                <h4 className="text-xs uppercase tracking-wider text-slate-500">Model Stats</h4>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Accuracy</span>
                    <span className="text-emerald-400 font-semibold">{(mlModel.accuracy * 100).toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Improvement</span>
                    <span className={`font-semibold ${mlModel.improvement >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                      {mlModel.improvement >= 0 ? "+" : ""}{(mlModel.improvement * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Training Trades</span>
                    <span className="text-blue-400 font-semibold">{mlModel.trades_used}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Available Trades</span>
                    <span className="text-blue-400 font-semibold">{mlModel.trades_available}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Since Last Train</span>
                    <span className="text-orange-400 font-semibold">{mlModel.trades_since_last}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Last Trained</span>
                    <span className="text-slate-200 font-semibold">
                      {mlModel.last_train_time ? new Date(mlModel.last_train_time * 1000).toLocaleString() : "Never"}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Status</span>
                    <span className="text-purple-400 font-semibold">{mlModel.training ? "Training..." : "Ready"}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/60 rounded-xl p-3">
                <h4 className="text-xs uppercase tracking-wider text-slate-500 mb-2">Architecture</h4>
                <div className="space-y-1 text-xs text-slate-400">
                  <p>Logistic Regression</p>
                  <p>5 features → 2 classes</p>
                  <p>L2 regularization</p>
                  {mlModel.trained && <p className="text-emerald-400">Model loaded</p>}
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}