const SYMBOLS = [
  "BTC/USDT", "ETH/USDT", "BNB/USDT", "SOL/USDT", "XRP/USDT",
  "ADA/USDT", "DOGE/USDT", "AVAX/USDT", "DOT/USDT", "LINK/USDT",
  "MATIC/USDT", "UNI/USDT", "ATOM/USDT", "LTC/USDT", "BCH/USDT",
];

export function SymbolSelector({ value, onChange, disabled }: {
  value: string;
  onChange: (s: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-sm text-slate-400">Pair:</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="bg-slate-800 border border-slate-600 rounded-lg px-3 py-1.5 text-sm text-slate-200 disabled:opacity-50 cursor-pointer"
      >
        {SYMBOLS.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
    </div>
  );
}
