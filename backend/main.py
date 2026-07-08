import asyncio
import json
import time
import urllib.request
import numpy as np
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from config import BINANCE_API_KEY, BINANCE_SECRET_KEY, BINANCE_TESTNET, TRADE_CONFIG, STRATEGY_DEFAULTS, SYMBOLS
from trader import BinanceTrader
from models import SessionLocal, Trade, StrategyState, Setting
from optimizer import run_optimization
from ai_analyzer import generate_analysis
import pandas as pd


_tnd_rate = 3.0
_tnd_rate_ts = 0.0


def _fetch_tnd_rate():
    global _tnd_rate, _tnd_rate_ts
    if time.time() - _tnd_rate_ts < 3600:
        return _tnd_rate
    try:
        resp = urllib.request.urlopen("https://open.er-api.com/v6/latest/USD", timeout=5)
        data = json.loads(resp.read())
        rate = data["rates"].get("TND")
        if rate:
            _tnd_rate = rate
            _tnd_rate_ts = time.time()
    except Exception as e:
        print(f"TND rate fetch error: {e}")
    return _tnd_rate


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
async def stop_bot(mode: str = "now"):
    if trader:
        trader.stop(after_trade=(mode == "after_trade"))
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
    if state:
        closed = db.query(Trade).filter(Trade.status == "closed").all()
        wins = sum(1 for t in closed if t.pnl and t.pnl > 0)
        losses = sum(1 for t in closed if t.pnl and t.pnl <= 0)
        db.close()
        return {"params": state.params, "sharpe_ratio": state.sharpe_ratio, "total_trades": len(closed), "wins": wins, "losses": losses}
    db.close()
    return {"params": STRATEGY_DEFAULTS, "sharpe_ratio": None}


@app.get("/api/strategy-history")
async def get_strategy_history():
    db = SessionLocal()
    states = db.query(StrategyState).order_by(StrategyState.id.desc()).limit(50).all()
    closed = db.query(Trade).filter(Trade.status == "closed").all()
    db.close()

    result = []
    for s in states:
        matched = [t for t in closed if t.strategy_id == s.id]
        wins = sum(1 for t in matched if t.pnl and t.pnl > 0)
        losses = sum(1 for t in matched if t.pnl and t.pnl <= 0)
        result.append({
            "id": s.id,
            "params": s.params,
            "sharpe_ratio": s.sharpe_ratio,
            "is_active": s.is_active,
            "created_at": s.created_at.isoformat() if s.created_at else None,
            "total_trades": len(matched),
            "wins": wins,
            "losses": losses,
        })
    return result


class ActivateStrategyRequest(BaseModel):
    strategy_id: int


@app.post("/api/strategy/activate")
async def activate_strategy(req: ActivateStrategyRequest):
    db = SessionLocal()
    target = db.query(StrategyState).filter(StrategyState.id == req.strategy_id).first()
    if not target:
        db.close()
        return {"error": "Strategy not found"}
    old = db.query(StrategyState).filter(StrategyState.is_active == True).all()
    for o in old:
        o.is_active = False
    target.is_active = True
    db.commit()
    db.close()
    if trader:
        trader._active_strategy_id = target.id
    return {"status": "activated", "params": target.params, "sharpe_ratio": target.sharpe_ratio}


class OptimizeRequest(BaseModel):
    n_trials: int = 500


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
        loop = asyncio.get_event_loop()
        params, sharpe = await loop.run_in_executor(None, run_optimization, df, req.n_trials)
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
    try:
        if not trader:
            return {"messages": [], "recommended_pair": "BTC/USDT", "suggest_optimize": False,
                    "position_status": "idle", "expected_next_trade": None, "expected_profit_24h": None, "current_pnl": None}

        status = await trader.get_status()
        indicators = trader.get_indicators()
        df = trader.df

        messages = []
        switch_msg = status.get("last_pair_switch_msg")
        if switch_msg:
            messages.append(f"🔄 {switch_msg}")
            if trader: trader.last_pair_switch_msg = None

        rsi = indicators.get("rsi")
        ema_s = indicators.get("ema_short")
        ema_l = indicators.get("ema_long")
        price = status.get("last_price")
        running = status.get("running", False)
        consec_losses = status.get("consecutive_losses", 0)
        position = status.get("position")

        if ema_s is not None and ema_l is not None:
            diff_pct = abs(ema_s - ema_l) / ema_l * 100
            if ema_s > ema_l:
                if diff_pct > 2:
                    messages.append(f"📈 Price is in a strong uptrend — fast average is {diff_pct:.1f}% above slow average. Good time to look for buys.")
                else:
                    messages.append(f"📈 Price is moving up — fast average is {diff_pct:.1f}% above slow average.")
            else:
                if diff_pct > 2:
                    messages.append(f"📉 Price is in a strong downtrend — fast average is {diff_pct:.1f}% below slow average. Better to wait or sell.")
                else:
                    messages.append(f"📉 Price is moving down — fast average is {diff_pct:.1f}% below slow average.")

        if rsi is not None:
            if rsi >= 70:
                messages.append(f"⚠️ RSI is {rsi:.0f} — the market is overheated. Price might drop soon. Be careful buying.")
            elif rsi <= 30:
                messages.append(f"💡 RSI is {rsi:.0f} — the market is oversold. Price might bounce up soon. Look for buy signals.")
            elif rsi > 60:
                messages.append(f"📊 RSI is {rsi:.0f} — buyers are in control but not extreme. Steady bullish.")
            elif rsi < 40:
                messages.append(f"📊 RSI is {rsi:.0f} — sellers are in control but not extreme. Steady bearish.")
            else:
                messages.append(f"📊 RSI is {rsi:.0f} — neutral market. No clear direction yet.")

        if position:
            side = position["side"]
            entry = position["entry_price"]
            raw_pnl = ((price - entry) / entry) * 100
            if side == "sell":
                raw_pnl = -raw_pnl
            msg = f"🎯 Currently in a {side.upper()} position entered at ${entry:,.2f}. Currently {raw_pnl:+.2f}% ({'profit' if raw_pnl >= 0 else 'loss'})."
            messages.append(msg)
        else:
            if running:
                msg = "🔍 No position open. Waiting for the right moment to enter."
                messages.append(msg)

        if running:
            if position:
                messages.append("⏳ Watching for exit signal — will close when price hits target or trend reverses.")
            else:
                messages.append("⏳ Scanning for entry signal — will buy when conditions are right.")
        else:
            messages.append("⏹️ Bot is stopped. Click Start to begin trading.")

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

        if position:
            pos_side = position["side"].upper()
            entry = position["entry_price"]
            raw_pnl = ((price - entry) / entry) * 100
            if position["side"] == "sell":
                raw_pnl = -raw_pnl
            position_status = f"IN {pos_side}"
        else:
            position_status = "SEARCHING"

        return {
            "messages": messages,
            "recommended_pair": recommended_pair,
            "suggest_optimize": consec_losses >= 2,
            "position_status": position_status,
            "expected_next_trade": None,
            "expected_profit_24h": None,
            "current_pnl": round(raw_pnl, 2) if position else None,
        }
    except Exception as e:
        import traceback
        err = traceback.format_exc()
        print(f"AI insights error:\n{err}")
        return {"messages": [f"Waiting for data... ({type(e).__name__})"], "recommended_pair": "BTC/USDT",
                "suggest_optimize": False, "position_status": "loading",
                "expected_next_trade": None, "expected_profit_24h": None, "current_pnl": None}


@app.get("/api/ai-deep-analysis")
async def ai_deep_analysis():
    try:
        if not trader or len(trader.df) < 2:
            return {"analysis": f"⚠️ Skipped — trader ready: {bool(trader)}, data rows: {len(trader.df) if trader else 0}"}
        status = await trader.get_status()
        indicators = trader.get_indicators()
        db = SessionLocal()
        closed = db.query(Trade).filter(Trade.status == "closed").all()
        db.close()
        wins = sum(1 for t in closed if t.pnl and t.pnl > 0)
        total = len(closed)

        recent_pnl = None
        if closed:
            recent_pnl = closed[-1].pnl_pct

        pos = status.get("position")
        position_data = None
        if pos:
            price = status.get("last_price", 0)
            entry = pos["entry_price"]
            raw_pnl = ((price - entry) / entry) * 100
            if pos["side"] == "sell":
                raw_pnl = -raw_pnl
            position_data = {
                "side": pos["side"],
                "entry_price": pos["entry_price"],
                "unrealized_pnl": round(raw_pnl, 2),
            }

        market_data = {
            "price": status.get("last_price"),
            "rsi": indicators.get("rsi"),
            "ema_short": indicators.get("ema_short"),
            "ema_long": indicators.get("ema_long"),
            "position": position_data,
            "balance": status.get("balance_usdt"),
            "total_trades": total,
            "win_rate": wins / total if total > 0 else 0,
            "recent_pnl": recent_pnl,
            "consecutive_losses": status.get("consecutive_losses", 0),
        }

        analysis = await generate_analysis(market_data)
        return {"analysis": analysis}
    except Exception as e:
        import traceback; traceback.print_exc()
        return {"analysis": f"⚠️ Exception: {e}"}


@app.get("/api/tnd-rate")
async def get_tnd_rate():
    return {"rate": _fetch_tnd_rate()}


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
