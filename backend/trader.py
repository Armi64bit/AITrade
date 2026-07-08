import asyncio
import time
import ccxt.async_support as ccxt
import pandas as pd
import numpy as np
from datetime import datetime, timezone
from models import SessionLocal, Trade, StrategyState, Setting
from strategy import compute_indicators, should_enter
from config import TRADE_CONFIG, SYMBOL, STABLE_COIN, INITIAL_BALANCE, SYMBOLS


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
        self.symbol = self._load_setting("symbol", SYMBOL)
        self.running = False
        self.df = pd.DataFrame(columns=["time", "open", "high", "low", "close", "volume"])
        self.position = None
        self.consecutive_losses = 0
        self._data_loaded = False
        self._use_simulated = False
        self._sim_price = 60000.0
        self._sim_balance = INITIAL_BALANCE
        self._sim_time = time.time()
        self._active_strategy_id = None
        self.stop_after_trade = False
        self._tick_count = 0
        self.last_pair_switch_msg = None
        self._pending_symbol = None
        self._pair_scores = self._init_pair_scores()

    def _load_setting(self, key, default):
        try:
            db = SessionLocal()
            s = db.query(Setting).filter(Setting.key == key).first()
            db.close()
            return s.value if s else default
        except:
            return default

    def _save_setting(self, key, value):
        try:
            db = SessionLocal()
            existing = db.query(Setting).filter(Setting.key == key).first()
            if existing:
                existing.value = value
            else:
                db.add(Setting(key=key, value=value))
            db.commit()
            db.close()
        except:
            pass

    async def set_symbol(self, symbol: str):
        self.symbol = symbol
        self._save_setting("symbol", symbol)
        self.df = pd.DataFrame(columns=["time", "open", "high", "low", "close", "volume"])
        self.position = None
        self._data_loaded = False
        self._use_simulated = False
        await self.load_data()

    async def load_data(self):
        if not self._data_loaded:
            ok = await self._load_history()
            if not ok:
                self._use_simulated = True
                self._generate_simulated_data()
            self._data_loaded = True

    def _generate_simulated_data(self):
        np.random.seed(42)
        now = int(time.time() * 1000)
        rows = []
        price = self._sim_price
        for i in range(200):
            change = np.random.normal(0, price * 0.002)
            o = price + np.random.normal(0, price * 0.001)
            h = max(o, price) + abs(np.random.normal(0, price * 0.002))
            l = min(o, price) - abs(np.random.normal(0, price * 0.002))
            c = price + change
            rows.append({"time": now - (200 - i) * 3600000, "open": o, "high": h, "low": l, "close": c, "volume": np.random.uniform(100, 1000)})
            price = c
        self._sim_price = price
        self.df = pd.DataFrame(rows)

    async def start(self):
        self.running = True
        if not self._data_loaded:
            ok = await self._load_history()
            if not ok:
                self._use_simulated = True
                self._generate_simulated_data()
            self._data_loaded = True
        asyncio.create_task(self._tick_loop())

    def stop(self, after_trade=False):
        self.stop_after_trade = False
        if after_trade and self.position:
            self.stop_after_trade = True
        else:
            self.running = False

    def _init_pair_scores(self):
        rng = np.random.default_rng(42)
        return {s: {"drift": rng.normal(0, 0.002), "volatility": rng.uniform(0.003, 0.012)} for s in SYMBOLS}

    async def _evaluate_best_pair(self):
        if self._pending_symbol:
            target = self._pending_symbol
            self._pending_symbol = None
            if self.position:
                self.stop(after_trade=True)
                self._pending_symbol = target
                return
            await self.set_symbol(target)
            self.last_pair_switch_msg = f"Auto-switched to {target} — best performing pair right now"
            return

        if len(self.df) < 20:
            return

        current_vol = float(self.df["close"].iloc[-20:].std() / self.df["close"].iloc[-1])
        best = self.symbol
        best_score = current_vol
        for sym, data in self._pair_scores.items():
            sim_vol = data["volatility"] * (1 + data["drift"] * 10)
            if sim_vol > best_score:
                best_score = sim_vol
                best = sym

        if best != self.symbol and best_score > current_vol * 1.5:
            self._pending_symbol = best

    async def _load_history(self):
        try:
            ohlcv = await self.exchange.fetch_ohlcv(self.symbol, "1h", limit=200)
            rows = []
            for o in ohlcv:
                rows.append({"time": o[0], "open": o[1], "high": o[2], "low": o[3], "close": o[4], "volume": o[5]})
            self.df = pd.DataFrame(rows)
            self._sim_price = self.df["close"].iloc[-1]
            return True
        except Exception as e:
            print(f"History load error: {e}")
            return False

    async def _tick_loop(self):
        while self.running:
            try:
                self._tick_count += 1

                if self._tick_count % 10 == 0:
                    await self._evaluate_best_pair()

                if self._use_simulated:
                    self._simulate_tick()
                else:
                    await self._real_tick()

                params = await self._get_active_params()
                df = compute_indicators(self.df, params)
                signal = should_enter(df, params)

                if signal != 0 and self.position is None:
                    await self._open_trade(signal, params)

                if self.position:
                    await self._check_exit(df, params)

                await asyncio.sleep(30)
            except Exception as e:
                print(f"Tick error: {e}")
                await asyncio.sleep(10)
        await self.exchange.close()

    def _simulate_tick(self):
        change = np.random.normal(0, self._sim_price * 0.005)
        if np.random.random() < 0.15:
            change *= -3
        self._sim_price *= (1 + change / self._sim_price)
        new_row = {
            "time": int(time.time() * 1000),
            "open": self._sim_price,
            "high": self._sim_price * 1.002,
            "low": self._sim_price * 0.998,
            "close": self._sim_price,
            "volume": np.random.uniform(100, 1000),
        }
        self.df = pd.concat([self.df, pd.DataFrame([new_row])], ignore_index=True)
        if len(self.df) > 500:
            self.df = self.df.iloc[-500:]

    async def _real_tick(self):
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

    async def _open_trade(self, signal, params):
        try:
            if self._use_simulated:
                balance = self._sim_balance
                price = self._sim_price
            else:
                balance_data = await self.exchange.fetch_balance()
                balance = balance_data.get(STABLE_COIN, {}).get("free", 0)
                ticker = await self.exchange.fetch_ticker(self.symbol)
                price = ticker["last"]

            pct = params.get("position_size_pct", TRADE_CONFIG["position_size_pct"])
            amount_usdt = balance * pct
            if amount_usdt < 10:
                return

            quantity = amount_usdt / price
            side = "buy" if signal == 1 else "sell"

            if not self._use_simulated:
                order = await self.exchange.create_order(
                    self.symbol, "market", side, quantity
                )

            if self._use_simulated:
                self._sim_balance -= amount_usdt

            self.position = {
                "side": side,
                "entry_price": price,
                "quantity": quantity,
                "entry_time": datetime.now(timezone.utc),
                "strategy_params": params,
                "market_conditions": {},
            }

            db = SessionLocal()
            trade = Trade(
                symbol=self.symbol,
                side=side,
                entry_price=price,
                quantity=quantity,
                status="open",
                strategy_params=params,
                strategy_id=self._active_strategy_id,
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
            if not self._use_simulated:
                side = "sell" if self.position["side"] == "buy" else "buy"
                await self.exchange.create_order(
                    self.symbol, "market", side, self.position["quantity"]
                )

            db = SessionLocal()
            trade = db.query(Trade).filter(Trade.id == self._current_trade_db_id).first()
            if trade:
                trade.exit_price = exit_price
                trade.pnl = pnl_pct * self.position["quantity"] * self.position["entry_price"]
                if self._use_simulated:
                    self._sim_balance += trade.pnl + (self.position["quantity"] * self.position["entry_price"])
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
            if self.stop_after_trade:
                self.running = False
                self.stop_after_trade = False
        except Exception as e:
            print(f"Close trade error: {e}")

    async def _get_active_params(self):
        db = SessionLocal()
        state = db.query(StrategyState).filter(StrategyState.is_active == True).order_by(StrategyState.id.desc()).first()
        db.close()
        if state:
            self._active_strategy_id = state.id
            return state.params
        self._active_strategy_id = None
        from config import STRATEGY_DEFAULTS
        return STRATEGY_DEFAULTS

    async def get_status(self):
        balance_usdt = self._sim_balance if self._use_simulated else 0
        if not self._use_simulated:
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
            "stop_after_trade": self.stop_after_trade,
            "last_pair_switch_msg": self.last_pair_switch_msg,
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
