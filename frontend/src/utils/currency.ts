const TND_RATE = 3.0;

export function usd(v: number): string {
  return `$${v.toFixed(2)}`;
}

export function tnd(v: number): string {
  const val = v * TND_RATE;
  return `${val.toFixed(2)} TND`;
}

export function money(v: number): string {
  return `${usd(v)} (${tnd(v)})`;
}

export function pct(v: number): string {
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}
