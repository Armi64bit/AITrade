import { useState } from "react";
import type { BotStatus, StrategyInfo, Trade } from "../api/client";
import { Controls } from "./Controls";
import { StrategyPanel } from "./StrategyPanel";
import { StrategyHistory } from "./StrategyHistory";
import { DailyPerformance } from "./DailyPerformance";
import { ActivityLog } from "./ActivityLog";

const LS_TAB = "aitrader_sidebar_tab";
const LS_HISTORY_TAB = "aitrader_history_tab";

type Tab = "bot" | "history";
type HistoryTab = "strategies" | "daily" | "log";

export function RightSidebar({
  status, symbol, onStart, onStop,
  strategy, onOptimize, optimizing, onActivateStrategy, trades, onSymbolChange,
}: {
  status: BotStatus | null;
  symbol: string;
  onStart: () => void;
  onStop: () => void;
  strategy: StrategyInfo | null;
  onOptimize: () => void;
  optimizing: boolean;
  onActivateStrategy: (params: Record<string, number>, sharpe: number | null, total_trades?: number, wins?: number, losses?: number) => void;
  trades: Trade[];
  onSymbolChange?: (s: string) => void;
}) {
  const [tab, setTab] = useState<Tab>(() => {
    const saved = localStorage.getItem(LS_TAB);
    if (saved === "bot" || saved === "history") return saved;
    return "bot";
  });
  const [historyTab, setHistoryTab] = useState<HistoryTab>(() => {
    const saved = localStorage.getItem(LS_HISTORY_TAB);
    if (saved === "strategies" || saved === "daily" || saved === "log") return saved;
    return "strategies";
  });

  const switchTab = (t: Tab) => {
    setTab(t);
    localStorage.setItem(LS_TAB, t);
  };

  const switchHistoryTab = (t: HistoryTab) => {
    setHistoryTab(t);
    localStorage.setItem(LS_HISTORY_TAB, t);
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "bot", label: "Bot" },
    { key: "history", label: "History" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex bg-slate-800/60 rounded-xl p-1 gap-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => switchTab(t.key)}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
              tab === t.key
                ? "bg-slate-700 text-slate-100 shadow"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "bot" && (
        <>
          <Controls status={status} onStart={onStart} onStop={onStop} symbol={symbol} onSymbolChange={onSymbolChange} />
          <StrategyPanel strategy={strategy} onOptimize={onOptimize} optimizing={optimizing} />
        </>
      )}
      {tab === "history" && (
        <div className="space-y-3">
          <div className="flex bg-slate-800/40 rounded-lg p-0.5 gap-0.5">
            {([{ key: "strategies" as const, label: "Strategies" }, { key: "daily" as const, label: "Daily" }, { key: "log" as const, label: "Log" }]).map((t) => (
              <button
                key={t.key}
                onClick={() => switchHistoryTab(t.key)}
                className={`flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                  historyTab === t.key
                    ? "bg-slate-700 text-slate-100"
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {historyTab === "strategies" ? (
            <StrategyHistory onActivate={onActivateStrategy} />
          ) : historyTab === "daily" ? (
            <DailyPerformance trades={trades} />
          ) : (
            <ActivityLog />
          )}
        </div>
      )}
    </div>
  );
}
