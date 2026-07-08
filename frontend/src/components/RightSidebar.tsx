import { useState } from "react";
import type { BotStatus, StrategyInfo } from "../api/client";
import { Controls } from "./Controls";
import { StrategyPanel } from "./StrategyPanel";
import { StrategyHistory } from "./StrategyHistory";

const LS_TAB = "aitrader_sidebar_tab";

type Tab = "controls" | "strategy" | "history";

export function RightSidebar({
  status, symbol, onStart, onStop,
  strategy, onOptimize, optimizing, onActivateStrategy,
}: {
  status: BotStatus | null;
  symbol: string;
  onStart: () => void;
  onStop: () => void;
  strategy: StrategyInfo | null;
  onOptimize: () => void;
  optimizing: boolean;
  onActivateStrategy: (params: Record<string, number>, sharpe: number | null) => void;
}) {
  const [tab, setTab] = useState<Tab>(() => {
    const saved = localStorage.getItem(LS_TAB);
    if (saved === "controls" || saved === "strategy" || saved === "history") return saved;
    return "controls";
  });

  const switchTab = (t: Tab) => {
    setTab(t);
    localStorage.setItem(LS_TAB, t);
  };

  const tabs: { key: Tab; label: string }[] = [
    { key: "controls", label: "Bot" },
    { key: "strategy", label: "Strategy" },
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

      {tab === "controls" && (
        <Controls status={status} onStart={onStart} onStop={onStop} symbol={symbol} />
      )}
      {tab === "strategy" && (
        <StrategyPanel strategy={strategy} onOptimize={onOptimize} optimizing={optimizing} />
      )}
      {tab === "history" && (
        <StrategyHistory onActivate={onActivateStrategy} />
      )}
    </div>
  );
}
