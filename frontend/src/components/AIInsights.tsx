import { useEffect, useState } from "react";
import { api } from "../api/client";

interface AIResponse {
  messages: string[];
  recommended_pair: string;
  suggest_optimize: boolean;
}

export function AIInsights({ onOptimize }: { onOptimize: () => void }) {
  const [data, setData] = useState<AIResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      try {
        const d = await api.getAIInsights();
        setData(d);
      } catch {}
      setLoading(false);
    };
    fetch();
    const id = setInterval(fetch, 8000);
    return () => clearInterval(id);
  }, []);

  if (loading && !data) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold text-slate-200 mb-3">AI Analysis</h3>
        <div className="text-slate-500 text-sm animate-pulse">Analyzing market...</div>
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold">
            AI
          </div>
          <h3 className="text-lg font-semibold text-slate-200">AI Analysis</h3>
        </div>
      </div>

      <div className="space-y-2 mb-3">
        {data.messages.map((msg, i) => {
          const isWarning = msg.includes("⚠️") || msg.includes("consecutive losses");
          const isAction = msg.includes("waiting") || msg.includes("Monitoring") || msg.includes("Scanning") || msg.includes("Click Start");
          return (
            <div
              key={i}
              className={`text-sm px-3 py-2 rounded-lg ${
                isWarning ? "bg-yellow-500/10 border border-yellow-500/20 text-yellow-300" :
                isAction ? "bg-blue-500/10 border border-blue-500/20 text-blue-300" :
                "bg-slate-800/50 text-slate-300"
              }`}
            >
              {msg}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-700">
        <div className="text-xs text-slate-500">
          Recommended: <span className="text-emerald-400 font-semibold">{data.recommended_pair}</span>
        </div>
        {data.suggest_optimize && (
          <button
            onClick={onOptimize}
            className="ml-auto px-3 py-1 text-xs bg-purple-600 hover:bg-purple-500 rounded-lg transition-colors cursor-pointer"
          >
            Auto-Optimize Now
          </button>
        )}
      </div>
    </div>
  );
}
