const TND_RATE = 3.0;

function fmt(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function usd(v: number): string {
  return `$${fmt(v)}`;
}

export function tnd(v: number): string {
  return `${fmt(v * TND_RATE)} TND`;
}

export function money(v: number): string {
  return `${usd(v)} (${tnd(v)})`;
}

export function pct(v: number): string {
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}
