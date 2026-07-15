import os
from dotenv import load_dotenv

os.environ.setdefault("AIODNS_NO_RESOLVE", "1")

load_dotenv()

BINANCE_API_KEY = os.getenv("BINANCE_API_KEY")
BINANCE_SECRET_KEY = os.getenv("BINANCE_SECRET_KEY")
BINANCE_TESTNET = os.getenv("BINANCE_TESTNET", "true").lower() == "true"
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
BETTERSTACK_TOKEN = os.getenv("BETTERSTACK_TOKEN", "")
BETTERSTACK_HOST = os.getenv("BETTERSTACK_HOST", "")

SYMBOL = "BTC/USDT"
STABLE_COIN = "USDT"
INITIAL_BALANCE = 100.0

TRADE_CONFIG = {
    "position_size_pct": 0.15,
    "max_positions": 1,
    "stop_loss_pct": 0.05,    # 5% stop loss for 1h timeframe
    "take_profit_pct": 0.10,  # 10% take profit for 1h timeframe
    "max_drawdown_pct": 0.10,
    "retrain_interval_trades": 50,
    "risk_pct": 0.02,         # 2% risk per trade for ATR sizing
    "atr_mult": 2.0,          # 2x ATR for stop distance
}

SYMBOLS = ["BTC/USDT", "ETH/USDT", "BNB/USDT", "SOL/USDT", "XRP/USDT",
           "ADA/USDT", "DOGE/USDT", "AVAX/USDT", "DOT/USDT", "LINK/USDT",
           "MATIC/USDT", "UNI/USDT", "ATOM/USDT", "LTC/USDT", "BCH/USDT"]

STRATEGY_DEFAULTS = {
    "ema_short": 7,
    "ema_long": 25,
    "rsi_period": 14,
    "rsi_overbought": 70,
    "rsi_oversold": 30,
    "bb_period": 20,
    "bb_std": 2.0,
    "squeeze_threshold": 0.8,
    "momentum_period": 10,
    "momentum_threshold": 0.02,
    "volume_ma_period": 20,
    "stop_loss_pct": 0.05,
    "take_profit_pct": 0.10,
    "risk_pct": 0.02,
    "atr_mult": 2.0,
}
