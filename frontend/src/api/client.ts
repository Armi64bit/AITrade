const BASE = "/api";

export interface BotStatus {
  running: boolean;
  balance_usdt: number;
  position: any;
  consecutive_losses: number;
  last_price: number | null;
  indicators: {
    ema_short: number | null;
    ema_long: number | null;
    rsi: number | null;
    last_price: number;
  };
}

export interface Trade {
  id: number;
  symbol: string;
  side: string;
  entry_price: number;
  exit_price: number | null;
  quantity: number;
  pnl: number | null;
  pnl_pct: number | null;
  entry_time: string;
  exit_time: string | null;
  status: string;
}

export interface StrategyInfo {
  params: Record<string, number>;
  sharpe_ratio: number | null;
  total_trades?: number;
  wins?: number;
  losses?: number;
}

export interface Performance {
  total_trades: number;
  wins: number;
  losses: number;
  win_rate: number;
  total_pnl: number;
  current_balance: number;
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  return res.json();
}

async function post<T>(path: string, body?: any): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

export const api = {
  getStatus: () => get<BotStatus>("/status"),
  startBot: () => post<{ status: string }>("/start"),
  stopBot: () => post<{ status: string }>("/stop"),
  getTrades: (limit = 50) => get<Trade[]>(`/trades?limit=${limit}`),
  getStrategy: () => get<StrategyInfo>("/strategy"),
  optimize: (nTrials = 100) => post<{ params: Record<string, number>; sharpe_ratio: number }>("/optimize", { n_trials: nTrials }),
  getPerformance: () => get<Performance>("/performance"),
};
