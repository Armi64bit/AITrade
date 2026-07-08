import { useEffect, useState, useCallback } from "react";
import { api } from "../api/client";

interface LogEntry {
  time: string;
  type: string;
  message: string;
}

const TYPE_COLORS: Record<string, string> = {
  optimize: "text-purple-400",
  pair_switch: "text-cyan-400",
  strategy: "text-emerald-400",
  bot: "text-slate-400",
};

const TYPE_ICONS: Record<string, string> = {
  optimize: "⚡",
  pair_switch: "🔄",
  strategy: "📊",
  bot: "🤖",
};

export function ActivityLog() {
  const [log, setLog] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLog = useCallback(async () => {
    try {
      const data = await api.getActivityLog();
      setLog(data);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLog();
    const id = setInterval(fetchLog, 10000);
    return () => clearInterval(id);
  }, [fetchLog]);

  if (loading) return null;

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-slate-200 mb-3">Activity Log</h3>
      {log.length === 0 ? (
        <div className="text-center text-slate-500 text-xs py-4">No activity yet.</div>
      ) : (
        <div className="space-y-1 text-xs max-h-96 overflow-y-auto">
          {log.map((entry, i) => (
            <div key={i} className="flex items-start gap-2 px-2 py-1.5 rounded hover:bg-slate-800/30">
              <span className="text-slate-600 shrink-0 w-16 text-right font-mono">{entry.time.slice(11, 19)}</span>
              <span className="shrink-0">{TYPE_ICONS[entry.type] ?? "📝"}</span>
              <span className={`${TYPE_COLORS[entry.type] ?? "text-slate-300"}`}>{entry.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
