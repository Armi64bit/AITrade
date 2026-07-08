import asyncio
import json
import numpy as np
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from config import BINANCE_API_KEY, BINANCE_SECRET_KEY, BINANCE_TESTNET, TRADE_CONFIG, STRATEGY_DEFAULTS
from trader import BinanceTrader
from models import SessionLocal, Trade, StrategyState
from optimizer import run_optimization
import pandas as pd


trader = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global trader
    db = SessionLocal()
    active = db.query(StrategyState).filter(StrategyState.is_active == True).first()
    if not active:
        record = StrategyState(params=STRATEGY_DEFAULTS, sharpe_ratio=None, is_active=True)
        db.add(record)
        db.commit()
    db.close()
    trader = BinanceTrader(BINANCE_API_KEY, BINANCE_SECRET_KEY, testnet=BINANCE_TESTNET)
    asyncio.create_task(trader.load_data())
    yield
    if trader:
        trader.stop()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/status")
async def get_status():
    if not trader:
        return {"error": "Trader not initialized"}
    status = await trader.get_status()
    indicators = trader.get_indicators()
    return {**status, "indicators": indicators}


@app.post("/api/start")
async def start_bot():
    if trader and not trader.running:
        await trader.start()
        return {"status": "started"}
    return {"status": "already_running" if trader and trader.running else "error"}


@app.post("/api/stop")
async def stop_bot():
    if trader:
        trader.stop()
        return {"status": "stopped"}
    return {"status": "error"}


@app.get("/api/trades")
async def get_trades(limit: int = 50):
    db = SessionLocal()
    trades = db.query(Trade).order_by(Trade.id.desc()).limit(limit).all()
    db.close()
    return [
        {
            "id": t.id,
            "symbol": t.symbol,
            "side": t.side,
            "entry_price": t.entry_price,
            "exit_price": t.exit_price,
            "quantity": t.quantity,
            "pnl": t.pnl,
            "pnl_pct": t.pnl_pct,
            "entry_time": t.entry_time.isoformat() if t.entry_time else None,
            "exit_time": t.exit_time.isoformat() if t.exit_time else None,
            "status": t.status,
        }
        for t in trades
    ]


@app.get("/api/strategy")
async def get_strategy():
    db = SessionLocal()
    state = db.query(StrategyState).filter(StrategyState.is_active == True).order_by(StrategyState.id.desc()).first()
    db.close()
    if state:
        return {"params": state.params, "sharpe_ratio": state.sharpe_ratio, "total_trades": state.total_trades, "wins": state.wins, "losses": state.losses}
    return {"params": STRATEGY_DEFAULTS, "sharpe_ratio": None}


class OptimizeRequest(BaseModel):
    n_trials: int = 100


@app.post("/api/optimize")
async def optimize(req: OptimizeRequest):
    if not trader:
        return {"error": "Trader not initialized"}
    df = trader.df
    if len(df) < 50:
        return {"error": "Not enough data. Need at least 50 candles."}
    trader.stop()
    await asyncio.sleep(1)
    try:
        params, sharpe = run_optimization(df, n_trials=req.n_trials)
        return {"params": params, "sharpe_ratio": sharpe}
    finally:
        await trader.start()


class PerformanceResponse(BaseModel):
    total_trades: int
    wins: int
    losses: int
    win_rate: float
    total_pnl: float
    current_balance: float


@app.get("/api/performance", response_model=PerformanceResponse)
async def get_performance():
    db = SessionLocal()
    trades = db.query(Trade).filter(Trade.status == "closed").all()
    db.close()

    wins = sum(1 for t in trades if t.pnl and t.pnl > 0)
    losses = sum(1 for t in trades if t.pnl and t.pnl <= 0)
    total_pnl = sum(t.pnl for t in trades if t.pnl) if trades else 0

    if trader:
        s = await trader.get_status()
        balance = s.get("balance_usdt", 0)

    return PerformanceResponse(
        total_trades=len(trades),
        wins=wins,
        losses=losses,
        win_rate=wins / len(trades) if trades else 0,
        total_pnl=total_pnl,
        current_balance=balance,
    )


@app.get("/api/candles")
async def get_candles():
    if not trader:
        return []
    df = trader.df
    if len(df) == 0:
        return []
    return [
        {"time": int(row["time"]), "open": float(row["open"]), "high": float(row["high"]),
         "low": float(row["low"]), "close": float(row["close"]), "volume": float(row["volume"])}
        for _, row in df.iterrows()
    ]


SYMBOLS = ["BTC/USDT", "ETH/USDT", "BNB/USDT", "SOL/USDT", "XRP/USDT",
           "ADA/USDT", "DOGE/USDT", "AVAX/USDT", "DOT/USDT", "LINK/USDT",
           "MATIC/USDT", "UNI/USDT", "ATOM/USDT", "LTC/USDT", "BCH/USDT"]


@app.get("/api/symbols")
async def get_symbols():
    return SYMBOLS


class SymbolRequest(BaseModel):
    symbol: str


@app.post("/api/symbol")
async def set_symbol(req: SymbolRequest):
    global trader
    if not trader:
        return {"error": "Trader not initialized"}
    symbol = req.symbol.upper()
    if "/" not in symbol:
        symbol = symbol + "/USDT"
    if symbol not in SYMBOLS:
        return {"error": f"Unsupported symbol: {symbol}"}
    if trader.running:
        trader.stop()
        await asyncio.sleep(1)
    await trader.set_symbol(symbol)
    if trader.running:
        asyncio.create_task(trader.start())
    return {"symbol": symbol}


@app.get("/api/ai-insights")
async def ai_insights():
    if not trader:
        return {"messages": [], "recommended_pair": "BTC/USDT", "suggest_optimize": False}
    status = await trader.get_status()
    indicators = trader.get_indicators()
    df = trader.df

    db = SessionLocal()
    recent = db.query(Trade).order_by(Trade.id.desc()).limit(10).all()
    db.close()

    messages = []
    rsi = indicators.get("rsi")
    ema_s = indicators.get("ema_short")
    ema_l = indicators.get("ema_long")
    price = status.get("last_price")
    running = status.get("running", False)
    consec_losses = status.get("consecutive_losses", 0)
    position = status.get("position")

    # Market trend
    if ema_s is not None and ema_l is not None:
        if ema_s > ema_l:
            diff_pct = ((ema_s - ema_l) / ema_l) * 100
            if diff_pct > 2:
                messages.append(f"Strong bullish trend — fast EMA is {diff_pct:.1f}% above slow EMA.")
            else:
                messages.append(f"Bullish trend — fast EMA is {diff_pct:.1f}% above slow EMA.")
        else:
            diff_pct = ((ema_l - ema_s) / ema_l) * 100
            if diff_pct > 2:
                messages.append(f"Strong bearish trend — fast EMA is {diff_pct:.1f}% below slow EMA.")
            else:
                messages.append(f"Bearish trend — fast EMA is {diff_pct:.1f}% below slow EMA.")

    # RSI
    if rsi is not None:
        if rsi >= 70:
            messages.append(f"RSI at {rsi:.1f} — market is overbought. Possible price drop ahead.")
        elif rsi <= 30:
            messages.append(f"RSI at {rsi:.1f} — market is oversold. Possible price bounce ahead.")
        elif rsi > 60:
            messages.append(f"RSI at {rsi:.1f} — moderate bullish momentum.")
        elif rsi < 40:
            messages.append(f"RSI at {rsi:.1f} — moderate bearish momentum.")
        else:
            messages.append(f"RSI at {rsi:.1f} — neutral range, no strong direction.")

    # Position
    if position:
        side = position["side"]
        entry = position["entry_price"]
        pnl = ((price - entry) / entry) * 100
        if side == "sell":
            pnl = -pnl
        direction = "profit" if pnl >= 0 else "loss"
        messages.append(f"Currently in a {side.upper()} position entered at ${entry:.2f}. "
                        f"Unrealized P&L: {pnl:+.2f}% ({direction}).")
    else:
        if running:
            messages.append("No open position — waiting for a good entry signal.")

    # Recent trades summary
    closed = [t for t in recent if t.status == "closed"]
    if closed:
        wins = sum(1 for t in closed if t.pnl and t.pnl > 0)
        losses = sum(1 for t in closed if t.pnl and t.pnl <= 0)
        if wins > 0 or losses > 0:
            total = wins + losses
            rate = (wins / total) * 100
            messages.append(f"Recent {total} trades: {wins} wins, {losses} losses ({rate:.0f}% win rate).")

    # Consecutive losses → suggest optimize
    suggest_optimize = consec_losses >= 2
    if suggest_optimize:
        messages.append(f"⚠️ {consec_losses} consecutive losses detected. Consider clicking Auto-Optimize to adjust strategy.")

    # Next action
    if running:
        if position:
            messages.append("Monitoring position for exit signals (stop-loss, take-profit, or trend reversal).")
        else:
            messages.append("Scanning for entry signals based on EMA crossover and RSI conditions.")
    else:
        messages.append("Bot is stopped. Click Start to begin trading.")

    # Pair recommendation based on recent volatility
    recommended_pair = "SOL/USDT"
    if len(df) > 20:
        closes = df["close"].values[-20:]
        volatility = np.std(closes[-20:] / closes[-21:-1] - 1) if len(closes) >= 21 else 0
        volatile_pairs = ["SOL/USDT", "DOGE/USDT", "AVAX/USDT", "ETH/USDT", "BTC/USDT"]
        if volatility > 0.02:
            recommended_pair = volatile_pairs[0]
        elif volatility > 0.015:
            recommended_pair = volatile_pairs[1]
        else:
            recommended_pair = volatile_pairs[3]

    return {
        "messages": messages,
        "recommended_pair": recommended_pair,
        "suggest_optimize": suggest_optimize,
    }


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            if trader:
                status = await trader.get_status()
                indicators = trader.get_indicators()
                await websocket.send_json({**status, "indicators": indicators})
            await asyncio.sleep(2)
    except WebSocketDisconnect:
        pass
