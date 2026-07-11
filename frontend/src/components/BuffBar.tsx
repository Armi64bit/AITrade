export interface TrainingBuffs {
  accuracy: { value: number; change: number };
  winRate: { value: number; change: number };
  balance: { value: number; change: number };
  trainedAt: number;
}

const BUFF_ICONS: Record<string, string> = {
  accuracy: "🎯",
  winRate: "📈",
  balance: "💰",
};

function Buff({ label, icon, value, change }: { label: string; icon: string; value: string; change: string; positive: boolean }) {
  const isPositive = change.startsWith("+");
  return (
    <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-700/50 rounded-lg px-2 py-1 shadow-[0_0_10px_rgba(0,0,0,0.3)]">
      <span className="text-xs">{icon}</span>
      <div className="flex flex-col leading-tight">
        <span className="text-[10px] text-slate-500 uppercase tracking-wider">{label}</span>
        <div className="flex items-center gap-1">
          <span className="text-xs font-bold text-slate-100">{value}</span>
          <span className={`text-[10px] font-bold ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
            {change}
          </span>
        </div>
      </div>
    </div>
  );
}

export function BuffBar({ buffs }: { buffs: TrainingBuffs | null }) {
  if (!buffs) return null;

  const accPos = buffs.accuracy.change >= 0;
  const wrPos = buffs.winRate.change >= 0;
  const balPos = buffs.balance.change >= 0;

  return (
    <div className="flex flex-wrap gap-1.5 mt-1.5">
      <Buff
        label="Accuracy"
        icon={BUFF_ICONS.accuracy}
        value={`${(buffs.accuracy.value * 100).toFixed(1)}%`}
        change={`${accPos ? "+" : ""}${(buffs.accuracy.change * 100).toFixed(1)}%`}
        positive={accPos}
      />
      <Buff
        label="Win Rate"
        icon={BUFF_ICONS.winRate}
        value={`${(buffs.winRate.value * 100).toFixed(1)}%`}
        change={`${wrPos ? "+" : ""}${(buffs.winRate.change * 100).toFixed(1)}%`}
        positive={wrPos}
      />
      <Buff
        label="Balance"
        icon={BUFF_ICONS.balance}
        value={`$${buffs.balance.value.toFixed(2)}`}
        change={`${balPos ? "+" : ""}$${buffs.balance.change.toFixed(2)}`}
        positive={balPos}
      />
    </div>
  );
}