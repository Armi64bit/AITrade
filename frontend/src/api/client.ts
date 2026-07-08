const BASE = "https://aitrade-production-ecba.up.railway.app/api";

export interface BotStatus {
  running: boolean;
  balance_usdt: number;
  position: any;
  consecutive_losses: number;
  last_price: number | null;
  stop_after_trade: boolean;
  last_pair_switch_msg: string | null;
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

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export const api = {
  getStatus: () => get<BotStatus>("/status"),
  startBot: () => post<{ status: string }>("/start"),
  stopBot: (mode = "now") => post<{ status: string }>(`/stop?mode=${mode}`),
  getTrades: (limit = 50) => get<Trade[]>(`/trades?limit=${limit}`),
  getStrategy: () => get<StrategyInfo>("/strategy"),
  optimize: (nTrials = 500) => post<{ params: Record<string, number>; sharpe_ratio: number }>("/optimize", { n_trials: nTrials }),
  getPerformance: () => get<Performance>("/performance"),
  getCandles: () => get<Candle[]>("/candles"),
  getSymbols: () => get<string[]>("/symbols"),
  setSymbol: (symbol: string) => post<{ symbol: string }>("/symbol", { symbol }),
  getAIInsights: () => get<{ messages: string[]; recommended_pair: string; suggest_optimize: boolean; position_status: string; expected_next_trade: number | null; expected_profit_24h: number | null; current_pnl: number | null }>("/ai-insights"),
  getDeepAnalysis: () => get<{ analysis: string | null }>("/ai-deep-analysis"),
  getStrategyHistory: () => get<{ id: number; params: Record<string, number>; sharpe_ratio: number | null; is_active: boolean; created_at: string | null; total_trades: number; wins: number; losses: number }[]>("/strategy-history"),
  activateStrategy: (id: number) => post<{ status: string; params: Record<string, number>; sharpe_ratio: number | null }>("/strategy/activate", { strategy_id: id }),
  getTndRate: () => get<{ rate: number }>("/tnd-rate"),
  getActivityLog: () => get<{ time: string; type: string; message: string }[]>("/activity-log"),
  getNews: () => get<{ news: { title: string; source: string; url: string; published_at: number; summary: string }[] }>("/news"),
};
