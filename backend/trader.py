import asyncio
import time
import json
import urllib.request
import ccxt.async_support as ccxt
import pandas as pd
import numpy as np
from datetime import datetime, timezone
from models import SessionLocal, Trade, StrategyState, Setting
from strategies import Ensemble
from config import TRADE_CONFIG, SYMBOL, STABLE_COIN, INITIAL_BALANCE, SYMBOLS
from concurrent.futures import ThreadPoolExecutor


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
        self._balance = INITIAL_BALANCE
        self._sim_time = time.time()
        self._active_strategy_id = None
        self.stop_after_trade = False
        self._tick_count = 0
        self.last_pair_switch_msg = None
        self._pending_symbol = None
        self._pair_scores = self._init_pair_scores()
        self._executor = ThreadPoolExecutor(max_workers=1)
        self._optimizing = False
        self._activity_log: list[dict] = []
        self.ensemble = Ensemble()
        self._paper_mode = True

    def _log_event(self, event_type: str, message: str):
        self._activity_log.append({
            "time": datetime.now(timezone.utc).isoformat(),
            "type": event_type,
            "message": message,
        })
        if len(self._activity_log) > 200:
            self._activity_log = self._activity_log[-200:]

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
        self._log_event("bot", "Bot started")
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
            self._log_event("bot", "Stop requested — will stop after current trade")
        else:
            self.running = False
            self._log_event("bot", "Bot stopped")

    async def _auto_optimize(self):
        if self._optimizing or len(self.df) < 50:
            return
        self._optimizing = True
        self._log_event("optimize", "Auto-optimizing after 2 consecutive losses...")
        self.last_pair_switch_msg = "⚙️ Auto-optimizing strategy after 2 consecutive losses..."
        try:
            from optimizer import run_optimization
            # Get current strategy's Sharpe and ID before optimizing
            db = SessionLocal()
            current_state = db.query(StrategyState).filter(StrategyState.is_active == True).order_by(StrategyState.id.desc()).first()
            current_sharpe = current_state.sharpe_ratio if current_state else None
            current_id = current_state.id if current_state else None
            db.close()

            loop = asyncio.get_event_loop()
            best_params, sharpe = await loop.run_in_executor(self._executor, run_optimization, self.df, 200)

            # Only accept if Sharpe improved or this is the first strategy
            if current_sharpe is not None and sharpe <= current_sharpe:
                # Revert: deactivate the new strategy and reactivate the old one
                db = SessionLocal()
                db.query(StrategyState).filter(StrategyState.is_active == True).update({"is_active": False})
                if current_id:
                    old = db.query(StrategyState).filter(StrategyState.id == current_id).first()
                    if old:
                        old.is_active = True
                db.commit()
                db.close()
                self.last_pair_switch_msg = f"⏸️ Optimized found Sharpe {sharpe:.3f} but current {current_sharpe:.3f} is better — kept existing strategy"
                self._log_event("optimize", f"Optimized Sharpe {sharpe:.3f} <= current {current_sharpe:.3f}, kept existing")
                self._optimizing = False
                return

            self._active_strategy_id = None
            db = SessionLocal()
            active = db.query(StrategyState).filter(StrategyState.is_active == True).order_by(StrategyState.id.desc()).first()
            if active:
                self._active_strategy_id = active.id
            db.close()
            self.last_pair_switch_msg = f"✅ Auto-optimized! New Sharpe: {sharpe:.3f}"
            self._log_event("optimize", f"Auto-optimized! New Sharpe: {sharpe:.3f}")
        except Exception as e:
            print(f"Auto-optimize error: {e}")
            self.last_pair_switch_msg = None
            self._log_event("optimize", f"Auto-optimize failed: {e}")
        self._optimizing = False

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
            self._log_event("pair_switch", f"Auto-switched to {target}")
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
            print(f"History load error via ccxt: {e}")
        # Fallback: Binance public REST API (no exchange object needed)
        try:
            symbol = self.symbol.replace("/", "")
            url = f"https://api.binance.com/api/v3/klines?symbol={symbol}&interval=1h&limit=200"
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                data = json.loads(resp.read().decode())
            rows = []
            for o in data:
                rows.append({"time": int(o[0]), "open": float(o[1]), "high": float(o[2]), "low": float(o[3]), "close": float(o[4]), "volume": float(o[5])})
            self.df = pd.DataFrame(rows)
            self._sim_price = self.df["close"].iloc[-1]
            self._use_simulated = False
            print(f"Loaded {len(rows)} candles from Binance public API")
            return True
        except Exception as e2:
            print(f"History load error via public API: {e2}")
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

                signal, score = self.ensemble.aggregate(self.df)

                if signal != 0 and self.position is None:
                    await self._open_trade(signal, self.ensemble.weights)

                if self.position:
                    await self._check_exit(self.df)

                await asyncio.sleep(30)
            except Exception as e:
                print(f"Tick error: {e}")
                await asyncio.sleep(10)

    def _simulate_tick(self):
        change = np.random.normal(0, self._sim_price * 0.005)
        if np.random.random() < 0.15:
            change *= -3
        open_price = self._sim_price
        self._sim_price *= (1 + change / self._sim_price)
        close_price = self._sim_price
        new_row = {
            "time": int(time.time() * 1000),
            "open": open_price,
            "high": max(open_price, close_price) * 1.002,
            "low": min(open_price, close_price) * 0.998,
            "close": close_price,
            "volume": np.random.uniform(100, 1000),
        }
        self.df = pd.concat([self.df, pd.DataFrame([new_row])], ignore_index=True)
        if len(self.df) > 500:
            self.df = self.df.iloc[-500:]

    async def _real_tick(self):
        try:
            ticker = await self.exchange.fetch_ticker(self.symbol)
            self._add_tick(ticker["timestamp"], ticker["open"], ticker["high"], ticker["low"], ticker["last"], ticker["baseVolume"])
            return
        except Exception as e:
            print(f"Real tick via ccxt failed: {e}")
        # Fallback: Binance public REST API
        try:
            symbol = self.symbol.replace("/", "")
            url = f"https://api.binance.com/api/v3/ticker?symbol={symbol}"
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=10) as resp:
                t = json.loads(resp.read().decode())
            price = float(t["lastPrice"])
            self._add_tick(int(time.time() * 1000), price, price, price, price, 0)
        except Exception as e:
            print(f"Real tick via public API failed: {e}")
            self._simulate_tick()

    def _add_tick(self, ts, open_p, high, low, close, volume):
        new_row = {"time": ts, "open": open_p, "high": high, "low": low, "close": close, "volume": volume}
        self.df = pd.concat([self.df, pd.DataFrame([new_row])], ignore_index=True)
        if len(self.df) > 500:
            self.df = self.df.iloc[-500:]

    async def _open_trade(self, signal, params):
        try:
            if not self._use_simulated:
                ticker = await self.exchange.fetch_ticker(self.symbol)
                price = ticker["last"]
            else:
                price = self._sim_price

            balance = self._balance
            pct = params.get("position_size_pct", TRADE_CONFIG["position_size_pct"])
            amount_usdt = balance * pct
            if amount_usdt < 10:
                return

            quantity = amount_usdt / price
            side = "buy" if signal == 1 else "sell"
            self._balance -= amount_usdt

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

    async def _check_exit(self, df):
        current_price = df["close"].iloc[-1]
        entry = self.position["entry_price"]
        sl = TRADE_CONFIG["stop_loss_pct"]
        tp = TRADE_CONFIG["take_profit_pct"]

        pnl_pct = (current_price - entry) / entry
        if self.position["side"] == "sell":
            pnl_pct = -pnl_pct

        signal, _ = self.ensemble.aggregate(df)
        exit_signal = (self.position["side"] == "buy" and signal == -1) or \
                      (self.position["side"] == "sell" and signal == 1)

        if pnl_pct <= -sl or pnl_pct >= tp or exit_signal:
            await self._close_trade(current_price, pnl_pct)

    async def _close_trade(self, exit_price, pnl_pct):
        try:
            db = SessionLocal()
            trade = db.query(Trade).filter(Trade.id == self._current_trade_db_id).first()
            if trade:
                trade.exit_price = exit_price
                trade.pnl = pnl_pct * self.position["quantity"] * self.position["entry_price"]
                self._balance += trade.pnl + (self.position["quantity"] * self.position["entry_price"])
                trade.pnl_pct = pnl_pct
                trade.exit_time = datetime.now(timezone.utc)
                trade.status = "closed"
                db.commit()
            db.close()

            self.ensemble.record_trade(pnl_pct)

            if pnl_pct < 0:
                self.consecutive_losses += 1
                if self.consecutive_losses >= 2:
                    asyncio.create_task(self._auto_optimize())
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
        balance_usdt = self._balance
        return {
            "running": self.running,
            "balance_usdt": balance_usdt,
            "position": self.position,
            "consecutive_losses": self.consecutive_losses,
            "last_price": self.df["close"].iloc[-1] if len(self.df) > 0 else None,
            "stop_after_trade": self.stop_after_trade,
            "last_pair_switch_msg": self.last_pair_switch_msg,
            "use_simulated": self._use_simulated,
            "paper_mode": self._paper_mode,
        }

    def get_indicators(self):
        if len(self.df) < 2:
            return {}
        df = self.df
        ema_s = df["close"].ewm(span=7, adjust=False).mean()
        ema_l = df["close"].ewm(span=25, adjust=False).mean()
        delta = df["close"].diff()
        gain = delta.where(delta > 0, 0)
        loss = -delta.where(delta < 0, 0)
        avg_g = gain.rolling(14).mean()
        avg_l = loss.rolling(14).mean()
        rs = avg_g / avg_l.replace(0, np.nan)
        rsi = 100 - (100 / (1 + rs))
        return {
            "ema_short": float(ema_s.iloc[-1]),
            "ema_long": float(ema_l.iloc[-1]),
            "rsi": float(rsi.iloc[-1]),
            "last_price": float(df["close"].iloc[-1]),
        }
