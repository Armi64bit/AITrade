import asyncio
import ccxt.async_support as ccxt
import pandas as pd
import numpy as np
from datetime import datetime, timezone
from models import SessionLocal, Trade, StrategyState
from strategy import compute_indicators, should_enter
from config import TRADE_CONFIG, SYMBOL, STABLE_COIN


class BinanceTrader:
    def __init__(self, api_key, secret_key, testnet=True):
        self.exchange = ccxt.binance({
            "apiKey": api_key,
            "secret": secret_key,
            "enableRateLimit": True,
            "options": {"defaultType": "spot"},
        })
        if testnet:
            self.exchange.set_sandbox_mode(True)
        self.symbol = SYMBOL
        self.running = False
        self.df = pd.DataFrame(columns=["time", "open", "high", "low", "close", "volume"])
        self.position = None
        self.consecutive_losses = 0

    async def start(self):
        self.running = True
        await self._load_history()
        asyncio.create_task(self._tick_loop())

    def stop(self):
        self.running = False

    async def _load_history(self):
        try:
            ohlcv = await self.exchange.fetch_ohlcv(self.symbol, "1h", limit=200)
            rows = []
            for o in ohlcv:
                rows.append({"time": o[0], "open": o[1], "high": o[2], "low": o[3], "close": o[4], "volume": o[5]})
            self.df = pd.DataFrame(rows)
        except Exception as e:
            print(f"History load error: {e}")

    async def _tick_loop(self):
        while self.running:
            try:
                ticker = await self.exchange.fetch_ticker(self.symbol)
                new_row = {
                    "time": ticker["timestamp"],
                    "open": ticker["open"],
                    "high": ticker["high"],
                    "low": ticker["low"],
                    "close": ticker["last"],
                    "volume": ticker["baseVolume"],
                }
                self.df = pd.concat([self.df, pd.DataFrame([new_row])], ignore_index=True)
                if len(self.df) > 500:
                    self.df = self.df.iloc[-500:]

                params = await self._get_active_params()
                df = compute_indicators(self.df, params)
                signal = should_enter(df, params)

                if signal != 0 and self.position is None:
                    await self._open_trade(signal, params)

                if self.position:
                    await self._check_exit(df, params)

                await asyncio.sleep(60)
            except Exception as e:
                print(f"Tick error: {e}")
                await asyncio.sleep(10)
        await self.exchange.close()

    async def _open_trade(self, signal, params):
        try:
            balance = await self.exchange.fetch_balance()
            usdt = balance.get(STABLE_COIN, {}).get("free", 0)
            pct = params.get("position_size_pct", TRADE_CONFIG["position_size_pct"])
            amount_usdt = usdt * pct
            if amount_usdt < 10:
                return

            ticker = await self.exchange.fetch_ticker(self.symbol)
            price = ticker["last"]
            quantity = amount_usdt / price

            side = "buy" if signal == 1 else "sell"
            order = await self.exchange.create_order(
                self.symbol, "market", side, quantity
            )

            self.position = {
                "order": order,
                "side": side,
                "entry_price": price,
                "quantity": quantity,
                "entry_time": datetime.now(timezone.utc),
                "strategy_params": params,
                "market_conditions": {"rsi": None, "ema_short": None, "ema_long": None},
            }

            db = SessionLocal()
            trade = Trade(
                symbol=self.symbol,
                side=side,
                entry_price=price,
                quantity=quantity,
                status="open",
                strategy_params=params,
            )
            db.add(trade)
            db.commit()
            self._current_trade_db_id = trade.id
            db.close()
        except Exception as e:
            print(f"Open trade error: {e}")

    async def _check_exit(self, df, params):
        current_price = df["close"].iloc[-1]
        entry = self.position["entry_price"]
        sl = params.get("stop_loss_pct", TRADE_CONFIG["stop_loss_pct"])
        tp = params.get("take_profit_pct", TRADE_CONFIG["take_profit_pct"])

        pnl_pct = (current_price - entry) / entry
        if self.position["side"] == "sell":
            pnl_pct = -pnl_pct

        signal = should_enter(df, params)
        exit_signal = (self.position["side"] == "buy" and signal == -1) or \
                      (self.position["side"] == "sell" and signal == 1)

        if pnl_pct <= -sl or pnl_pct >= tp or exit_signal:
            await self._close_trade(current_price, pnl_pct)

    async def _close_trade(self, exit_price, pnl_pct):
        try:
            side = "sell" if self.position["side"] == "buy" else "buy"
            await self.exchange.create_order(
                self.symbol, "market", side, self.position["quantity"]
            )

            db = SessionLocal()
            trade = db.query(Trade).filter(Trade.id == self._current_trade_db_id).first()
            if trade:
                trade.exit_price = exit_price
                trade.pnl = pnl_pct * self.position["quantity"] * self.position["entry_price"]
                trade.pnl_pct = pnl_pct
                trade.exit_time = datetime.now(timezone.utc)
                trade.status = "closed"
                db.commit()

            db.close()

            if pnl_pct < 0:
                self.consecutive_losses += 1
            else:
                self.consecutive_losses = 0

            self.position = None
            self._current_trade_db_id = None
        except Exception as e:
            print(f"Close trade error: {e}")

    async def _get_active_params(self):
        db = SessionLocal()
        state = db.query(StrategyState).filter(StrategyState.is_active == True).order_by(StrategyState.id.desc()).first()
        db.close()
        if state:
            return state.params
        from config import STRATEGY_DEFAULTS
        return STRATEGY_DEFAULTS

    async def get_status(self):
        balance_usdt = 0
        try:
            balance = await self.exchange.fetch_balance()
            balance_usdt = balance.get(STABLE_COIN, {}).get("total", 0)
        except Exception:
            pass
        return {
            "running": self.running,
            "balance_usdt": balance_usdt,
            "position": self.position,
            "consecutive_losses": self.consecutive_losses,
            "last_price": self.df["close"].iloc[-1] if len(self.df) > 0 else None,
        }

    def get_indicators(self):
        if len(self.df) < 2:
            return {}
        return {
            "ema_short": float(self.df["ema_short"].iloc[-1]) if "ema_short" in self.df else None,
            "ema_long": float(self.df["ema_long"].iloc[-1]) if "ema_long" in self.df else None,
            "rsi": float(self.df["rsi"].iloc[-1]) if "rsi" in self.df else None,
            "last_price": float(self.df["close"].iloc[-1]),
        }
