import type { BotStatus, StrategyInfo } from "../api/client";
import { Controls } from "./Controls";
import { StrategyPanel } from "./StrategyPanel";

export function RightSidebar({
  status, symbol, onStart, onStop,
  strategy, onOptimize, optimizing,
}: {
  status: BotStatus | null;
  symbol: string;
  onStart: () => void;
  onStop: () => void;
  strategy: StrategyInfo | null;
  onOptimize: () => void;
  optimizing: boolean;
}) {
  return (
    <div className="space-y-4">
      <Controls status={status} onStart={onStart} onStop={onStop} symbol={symbol} />
      <StrategyPanel strategy={strategy} onOptimize={onOptimize} optimizing={optimizing} />
    </div>
  );
}
