const COLORS: Record<string, string> = {
  BTC: "#f7931a",
  ETH: "#627eea",
  BNB: "#f3ba2f",
  SOL: "#9945ff",
  XRP: "#00aae4",
  ADA: "#0033ad",
  DOGE: "#c2a633",
  DOT: "#e6007a",
  MATIC: "#8247e5",
  AVAX: "#e84142",
  LINK: "#2a5ada",
  UNI: "#ff007a",
  ATOM: "#2e3148",
  LTC: "#345d9d",
  FIL: "#0090ff",
};

const FALLBACK_BG = "#6366f1";

export function CryptoIcon({ symbol, size = 28 }: { symbol: string; size?: number }) {
  const base = symbol.replace("/USDT", "").replace("USDT", "");
  const color = COLORS[base] ?? FALLBACK_BG;
  const initial = base[0] ?? "?";

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontWeight: 700,
        fontSize: size * 0.45,
        color: "#fff",
        textShadow: "0 1px 2px rgba(0,0,0,0.3)",
        flexShrink: 0,
      }}
      title={base}
    >
      {initial}
    </div>
  );
}
