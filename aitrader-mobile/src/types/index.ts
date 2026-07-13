export interface BotStatus {
  running: boolean;
  symbol: string;
  balance_usdt: number;
  position: Position | null;
  total_trades: number;
  consecutive_losses: number;
  last_price: number | null;
  stop_after_trade: boolean;
  last_pair_switch_msg: string | null;
  use_simulated: boolean;
  paper_mode: boolean;
  indicators: Indicators;
  ml_model?: MLModelInfo;
}

export interface Position {
  side: 'buy' | 'sell';
  entry_price: number;
  quantity: number;
  entry_time: string;
  strategy_params: Record<string, number>;
  stop_loss_pct: number;
  take_profit_pct: number;
  market_conditions: Record<string, any>;
}

export interface Indicators {
  ema_short: number | null;
  ema_long: number | null;
  rsi: number | null;
  last_price: number;
}

export interface MLModelInfo {
  trained: boolean;
  last_train_time: number | null;
  trades_used: number;
  trades_available: number;
  trades_since_last: number;
  accuracy: number;
  improvement: number;
  training: boolean;
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
  strategy_id: number | null;
}

export interface StrategyInfo {
  params: Record<string, number>;
  sharpe_ratio: number | null;
  total_trades: number;
  wins: number;
  losses: number;
}

export interface Performance {
  total_trades: number;
  wins: number;
  losses: number;
  win_rate: number;
  total_pnl: number;
  current_balance: number;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface AIInsights {
  messages: string[];
  recommended_pair: string;
  suggest_optimize: boolean;
  position_status: string;
  expected_next_trade: number | null;
  expected_profit_24h: number | null;
  current_pnl: number | null;
}

export interface DeepAnalysis {
  signal: string;
  entry: string;
  stop_loss: string;
  take_profit: string;
  confidence: number;
  reasoning: string;
}

export interface StrategyHistoryItem {
  id: number;
  params: Record<string, number>;
  sharpe_ratio: number | null;
  is_active: boolean;
  created_at: string | null;
  total_trades: number;
  wins: number;
  losses: number;
}

export interface StrategyVote {
  name: string;
  signal: number;
  confidence: number;
  weight: number;
}

export interface StrategyVotes {
  votes: StrategyVote[];
  tracking: Record<string, { wins: number; losses: number; trades: number }>;
}

export interface ModelStatus {
  trained: boolean;
  last_train_time: number | null;
  trades_used: number;
  trades_available: number;
  trades_since_last: number;
  accuracy: number;
  improvement: number;
  training: boolean;
  coefficients: number[] | null;
}

export interface ModelPredictLive {
  signal: number;
  confidence: number;
  prediction: {
    features: number[];
    feature_names: string[];
    prob_win: number;
    prob_loss: number;
  } | null;
  coefficients: number[] | null;
}

export interface SymbolsResponse {
  symbols: string[];
}