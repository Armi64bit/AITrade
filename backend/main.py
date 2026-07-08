import asyncio
import json
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from config import BINANCE_API_KEY, BINANCE_SECRET_KEY, BINANCE_TESTNET, TRADE_CONFIG
from trader import BinanceTrader
from models import SessionLocal, Trade, StrategyState
from optimizer import run_optimization
import pandas as pd


trader = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global trader
    trader = BinanceTrader(BINANCE_API_KEY, BINANCE_SECRET_KEY, testnet=BINANCE_TESTNET)
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
    return {"params": {}, "sharpe_ratio": None}


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

    balance = 0
    if trader:
        b = await trader.exchange.fetch_balance()
        balance = b.get("USDT", {}).get("total", 0) if trader else 0

    return PerformanceResponse(
        total_trades=len(trades),
        wins=wins,
        losses=losses,
        win_rate=wins / len(trades) if trades else 0,
        total_pnl=total_pnl,
        current_balance=balance,
    )


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
