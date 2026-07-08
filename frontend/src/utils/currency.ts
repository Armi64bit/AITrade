import { api } from "../api/client";

let _rate = 3.0;
let _ratePromise: Promise<number> | null = null;

export async function fetchTndRate(): Promise<number> {
  if (_ratePromise) return _ratePromise;
  _ratePromise = api.getTndRate().then(r => { _rate = r.rate; return r.rate; }).catch(() => _rate);
  return _ratePromise;
}

function fmt(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function usd(v: number): string {
  return `$${fmt(v)}`;
}

export function tnd(v: number): string {
  return `${fmt(v * _rate)} TND`;
}

export function money(v: number): string {
  return `${usd(v)} (${tnd(v)})`;
}

export function pct(v: number): string {
  return `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;
}
