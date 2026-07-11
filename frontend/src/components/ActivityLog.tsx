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
  const [page, setPage] = useState(0);
  const perPage = 50;

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

  useEffect(() => { setPage(0); }, [log.length]);

  const handleDownloadCsv = () => {
    const a = document.createElement("a");
    a.href = api.downloadDailyCsv();
    a.download = `aitrader_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  };

  if (loading) return null;

  const pages = Math.ceil(log.length / perPage);
  const pageLog = log.slice(page * perPage, (page + 1) * perPage);

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-wider text-slate-500">Session Events</span>
        <button onClick={handleDownloadCsv}
          className="text-[10px] text-cyan-400/70 hover:text-cyan-300 bg-cyan-400/5 hover:bg-cyan-400/10 px-2 py-0.5 rounded transition-colors cursor-pointer"
        >
          ↓ CSV
        </button>
      </div>
      {log.length === 0 ? (
        <div className="text-center text-slate-500 text-xs py-4">No activity yet.</div>
      ) : (
        <div className="space-y-1 text-xs">
          {pageLog.map((entry, i) => (
            <div key={i} className="flex items-start gap-2 px-2 py-1.5 rounded hover:bg-slate-800/30">
              <span className="text-slate-600 shrink-0 w-16 text-right font-mono">{entry.time.slice(11, 19)}</span>
              <span className="shrink-0">{TYPE_ICONS[entry.type] ?? "📝"}</span>
              <span className={`${TYPE_COLORS[entry.type] ?? "text-slate-300"}`}>{entry.message}</span>
            </div>
          ))}
        </div>
      )}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-3">
          <button
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 rounded cursor-pointer disabled:cursor-default"
          >
            Prev
          </button>
          <span className="text-xs text-slate-500">{page + 1} / {pages}</span>
          <button
            onClick={() => setPage(p => Math.min(pages - 1, p + 1))}
            disabled={page >= pages - 1}
            className="px-2 py-1 text-xs bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800 disabled:text-slate-600 rounded cursor-pointer disabled:cursor-default"
          >
            Next
          </button>
        </div>
      )}
    </>
  );
}
