import os
import sys
from dotenv import load_dotenv

os.environ.setdefault("AIODNS_NO_RESOLVE", "1")

load_dotenv()

BINANCE_API_KEY = os.getenv("BINANCE_API_KEY")
BINANCE_SECRET_KEY = os.getenv("BINANCE_SECRET_KEY")
BINANCE_TESTNET = os.getenv("BINANCE_TESTNET", "true").lower() == "true"
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

SYMBOL = "BTC/USDT"
STABLE_COIN = "USDT"
INITIAL_BALANCE = 100.0

TRADE_CONFIG = {
    "position_size_pct": 0.15,
    "max_positions": 3,
    "stop_loss_pct": 0.03,
    "take_profit_pct": 0.06,
    "max_drawdown_pct": 0.10,
    "retrain_interval_trades": 5,
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
}
