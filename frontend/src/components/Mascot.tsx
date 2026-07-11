import type { Performance } from "../api/client";
import { money } from "../utils/currency";
import { ModelViz } from "./ModelViz";

export type MascotMood = "happy" | "sad" | "thinking" | "stressed" | "neutral";

interface MascotProps {
  mood: MascotMood;
  description?: string;
  perf?: Performance | null;
  mlModel?: { trained: boolean; accuracy: number; trades_used: number; trades_available: number; trades_since_last: number; last_train_time: number | null; improvement: number; training: boolean } | null;
  onTrain?: () => void;
  training?: boolean;
}

const moodConfig: Record<MascotMood, { gifUrl: string; title: string; label: string; tone: string }> = {
  happy: {
    gifUrl: "https://media1.tenor.com/m/ndrGxEeXsGkAAAAC/pepe-spin.gif",
    title: "Feeling great!",
    label: "Money is coming in",
    tone: "from-emerald-500 to-teal-500"
  },
  sad: {
    gifUrl: "https://media1.tenor.com/m/EWjkTznLqcAAAAAC/reaction-meme.gif",
    title: "Feeling low",
    label: "Losses are hurting",
    tone: "from-slate-600 to-slate-800"
  },
  thinking: {
    gifUrl: "https://media.tenor.com/YAUMFOCgUu4AAAAi/think.gif",
    title: "Thinking hard",
    label: "Searching for the next trade",
    tone: "from-sky-500 to-indigo-500"
  },
  stressed: {
    gifUrl: "https://media1.tenor.com/m/jM88jRsqnL8AAAAC/peppo-pepe.gif",
    title: "Feeling stressed",
    label: "Pressure is rising",
    tone: "from-orange-500 to-rose-500"
  },
  neutral: {
    gifUrl: "https://media1.tenor.com/m/B_qG3L3fpc8AAAAC/pepe.gif",
    title: "Standing by",
    label: "Watching the market",
    tone: "from-slate-500 to-slate-700"
  }
};

export function Mascot({ mood, description, perf, mlModel, onTrain, training }: MascotProps) {
  const config = moodConfig[mood];
  const isGreen = perf?.total_pnl !== undefined && perf?.total_pnl >= 0;

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-slate-950/90 p-3 shadow-[0_18px_55px_rgba(0,0,0,0.25)] flex flex-col h-full relative">
      {mlModel && <ModelViz mlModel={mlModel} />}
      <div className="flex gap-3 flex-1">
        <div className="flex flex-col flex-shrink-0">
          <div className={`inline-flex items-center justify-center rounded-2xl bg-gradient-to-br ${config.tone} p-2 shadow-[0_10px_40px_rgba(0,0,0,0.2)] overflow-hidden w-24 h-24`}>
            <img 
              src={config.gifUrl} 
              alt={config.title}
              className="w-full h-full object-cover rounded-lg"
            />
          </div>
          <div className="mt-2 space-y-1 flex-1 flex flex-col">
            <h3 className="text-xs uppercase tracking-[0.16em] text-slate-400">Mascot</h3>
            <p className="text-xs font-semibold text-slate-100 line-clamp-1">{config.title}</p>
            <p className="text-xs text-slate-400 line-clamp-1">{description ?? config.label}</p>
          </div>
        </div>

        {mlModel?.trained ? (
          <div className="flex-1 flex flex-col justify-between min-w-0">
            <div className="grid grid-cols-2 gap-1">
              <div className="bg-slate-900/50 rounded-lg p-1.5">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Acc</p>
                <p className="text-xs font-bold text-emerald-400">{(mlModel.accuracy * 100).toFixed(1)}%</p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-1.5">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Improve</p>
                <p className={`text-xs font-bold ${mlModel.improvement >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {mlModel.improvement >= 0 ? "+" : ""}{(mlModel.improvement * 100).toFixed(1)}%
                </p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-1.5">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Trades</p>
                <p className="text-xs font-bold text-blue-400">{mlModel.trades_used}/{mlModel.trades_available}</p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-1.5">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Since Train</p>
                <p className="text-xs font-bold text-orange-400">{mlModel.trades_since_last}</p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-1.5 col-span-2">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider">Last Train</p>
                <p className="text-xs font-bold text-slate-200">
                  {mlModel.last_train_time ? new Date(mlModel.last_train_time * 1000).toLocaleString() : "Never"}
                </p>
              </div>
            </div>
            {onTrain && (
              <button onClick={onTrain} disabled={training}
                className="mt-1.5 w-full text-xs font-medium py-1 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white cursor-pointer transition-colors">
                {training ? "Training..." : "Train Model"}
              </button>
            )}
          </div>
        ) : perf ? (
          <div className="flex-1 flex flex-col justify-between min-w-0">
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-900/50 rounded-lg p-2">
                <p className="text-xs text-slate-500 uppercase tracking-wider">Balance</p>
                <p className={`text-sm font-bold ${isGreen ? "text-emerald-400" : "text-red-400"}`}>
                  {money(perf.current_balance).split(" ")[0]}
                </p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-2">
                <p className="text-xs text-slate-500 uppercase tracking-wider">P&L</p>
                <p className={`text-sm font-bold ${isGreen ? "text-emerald-400" : "text-red-400"}`}>
                  {perf.total_pnl >= 0 ? "+" : ""}{money(perf.total_pnl).split(" ")[0]}
                </p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-2">
                <p className="text-xs text-slate-500 uppercase tracking-wider">Win Rate</p>
                <p className="text-sm font-bold text-blue-400">
                  {(perf.win_rate * 100).toFixed(1)}%
                </p>
              </div>
              <div className="bg-slate-900/50 rounded-lg p-2">
                <p className="text-xs text-slate-500 uppercase tracking-wider">Trades</p>
                <p className="text-sm font-bold text-purple-400">
                  {perf.wins}W / {perf.losses}L
                </p>
              </div>
            </div>
            {onTrain && (
              <button onClick={onTrain} disabled={training}
                className="mt-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white cursor-pointer transition-colors">
                {training ? "Training..." : "Train Model"}
              </button>
            )}
          </div>
        ) : null}
      </div>

      <div className="mt-3 h-1 overflow-hidden rounded-full bg-slate-800">
        <div className={`h-full rounded-full bg-gradient-to-r ${config.tone} animate-pulse`} />
      </div>
    </div>
  );
}
