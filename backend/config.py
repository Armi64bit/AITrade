import os
import sys
from dotenv import load_dotenv

os.environ.setdefault("AIODNS_NO_RESOLVE", "1")

load_dotenv()

BINANCE_API_KEY = os.getenv("BINANCE_API_KEY")
BINANCE_SECRET_KEY = os.getenv("BINANCE_SECRET_KEY")
BINANCE_TESTNET = os.getenv("BINANCE_TESTNET", "true").lower() == "true"

SYMBOL = "BTC/USDT"
STABLE_COIN = "USDT"
INITIAL_BALANCE = 100.0

TRADE_CONFIG = {
    "position_size_pct": 0.03,
    "max_positions": 3,
    "stop_loss_pct": 0.025,
    "take_profit_pct": 0.05,
    "max_drawdown_pct": 0.10,
    "retrain_interval_trades": 50,
}

STRATEGY_DEFAULTS = {
    "ema_short": 7,
    "ema_long": 25,
    "rsi_period": 14,
    "rsi_overbought": 70,
    "rsi_oversold": 30,
}
