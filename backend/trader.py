import asyncio
import time
import json
import urllib.request
from collections import deque
import ccxt.async_support as ccxt
import pandas as pd
import numpy as np
from datetime import datetime, timezone
from models import SessionLocal, Trade, StrategyState, Setting
from strategies import Ensemble
from config import TRADE_CONFIG, SYMBOL, STABLE_COIN, INITIAL_BALANCE, SYMBOLS
from concurrent.futures import ThreadPoolExecutor
from ml_model import ml_model


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
        self._recent_pnls = deque(maxlen=30)
        self._signal_confidences = deque(maxlen=20)
        self._data_loaded = False
        self._use_simulated = False
        self._sim_price = 60000.0
        self._balance = INITIAL_BALANCE
        self._sim_time = time.time()
        self._active_strategy_id = None
        self.stop_after_trade = False
        self._pending_pair_switch = False
        self._tick_count = 0
        self.last_pair_switch_msg = None
        self._pending_symbol = None
        self._pair_scores = self._init_pair_scores()
        self._executor = ThreadPoolExecutor(max_workers=1)
        self._optimizing = False
        self._activity_log: list[dict] = []
        self.ensemble = Ensemble()
        self._paper_mode = True
        self._total_trades = 0
        # Restore balance from DB
        saved = self._load_setting("balance", str(INITIAL_BALANCE))
        try:
            self._balance = float(saved)
        except:
            self._balance = INITIAL_BALANCE
        # Restore ensemble state from DB
        ens_state = self._load_setting("ensemble_state", "")
        if ens_state:
            try:
                self.ensemble.set_state(json.loads(ens_state))
            except:
                pass

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

    def _ml_predict(self):
        if ml_model is None or not ml_model.model:
            return 0, 0.0
        return ml_model.predict(self.df)

    async def _auto_optimize(self):
        now = time.time()
        if self._optimizing or len(self.df) < 50:
            return
        if len(self._recent_pnls) < 5:
            return
        if now - self._last_optimize_time < 1800:
            return
        # Composite check: optimize if performance is genuinely poor
        recent = list(self._recent_pnls)
        wins = sum(1 for p in recent if p > 0)
        win_rate = wins / len(recent)
        avg_pnl = sum(recent) / len(recent)
        avg_conf = sum(self._signal_confidences) / len(self._signal_confidences) if self._signal_confidences else 0
        reason = None
        if win_rate < 0.35:
            reason = f"win rate {win_rate:.0%} too low"
        elif avg_pnl < -0.005:
            reason = f"avg P&L {avg_pnl:.2%} negative"
        if not reason and avg_conf < 0.12:
            reason = f"ensemble confidence {avg_conf:.2f} too low"
        if not reason:
            return
        self._optimizing = True
        self._last_optimize_time = time.time()
        self._log_event("optimize", f"Auto-optimizing ({reason})")
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

    async def _auto_train(self):
        self._log_event("model", "Auto-training ML model on 50 trades")
        result = await asyncio.to_thread(ml_model.train, self.df)
        if result.get("status") == "success":
            self._log_event("model", f"ML model trained: accuracy {result['accuracy']}, improvement {result.get('improvement', 0):+.3f}")
        else:
            self._log_event("model", f"ML model training failed: {result.get('message')}")

    def _init_pair_scores(self):
        return {s: {"score": 0.0} for s in SYMBOLS}

    async def _evaluate_best_pair(self):
        if self._pending_symbol:
            target = self._pending_symbol
            self._pending_symbol = None
            if self.position:
                self._pending_pair_switch = True
                self._pending_symbol = target
                return
            await self.set_symbol(target)
            self.last_pair_switch_msg = f"Auto-switched to {target} — best performing pair right now"
            self._log_event("pair_switch", f"Auto-switched to {target}")
            return

        if len(self.df) < 20:
            return

        current_vol = float(self.df["close"].iloc[-20:].std() / self.df["close"].iloc[-1])
        recent_pnls = list(self._recent_pnls)
        recent_win_rate = sum(1 for p in recent_pnls if p > 0) / max(len(recent_pnls), 1) if recent_pnls else 0.5
        performance_factor = recent_win_rate - 0.3  # positive if above 30% win rate
        stat_score = current_vol * (1 - min(performance_factor, 0))

        best = self.symbol
        best_score = stat_score
        self._pair_scores[self.symbol]["score"] = stat_score
        for sym, data in self._pair_scores.items():
            if sym == self.symbol:
                continue
            decay = 0.97
            data["score"] *= decay
            if data["score"] > best_score:
                best_score = data["score"]
                best = sym

        if best != self.symbol and best_score > stat_score * 1.3:
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

                ml_signal, ml_conf = self._ml_predict()
                ensemble_signal, ensemble_score = self.ensemble.aggregate(self.df)
                buy_count = sum(1 for v in self.ensemble.get_last_votes() if v.signal == 1 and v.confidence > 0)
                sell_count = sum(1 for v in self.ensemble.get_last_votes() if v.signal == -1 and v.confidence > 0)
                score = max(ensemble_score, ml_conf) if ml_conf > 0 else ensemble_score
                signal = 1 if buy_count > sell_count and ensemble_signal >= 0 else 0
                if ml_signal == 1 and ml_conf > 0.5:
                    signal = 1
                self._signal_confidences.append(score)

                if signal == 1 and self.position is None:
                    await self._open_trade(1, self.ensemble.weights)

                if self.position:
                    await self._check_exit(self.df)

                await asyncio.sleep(60)
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
            self._balance -= amount_usdt

            self.position = {
                "side": "buy",
                "entry_price": price,
                "quantity": quantity,
                "entry_time": datetime.now(timezone.utc),
                "strategy_params": params,
                "market_conditions": {},
            }

            db = SessionLocal()
            trade = Trade(
                symbol=self.symbol,
                side="buy",
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
        entry_time = self.position.get("entry_time")
        sl = TRADE_CONFIG["stop_loss_pct"]
        tp = TRADE_CONFIG["take_profit_pct"]

        pnl_pct = (current_price - entry) / entry

        ticks_held = 0
        if entry_time:
            ticks_held = int((datetime.now(timezone.utc) - entry_time).total_seconds() / 60)

        if pnl_pct <= -sl:
            await self._close_trade(current_price, pnl_pct)
        elif pnl_pct >= tp:
            await self._close_trade(current_price, pnl_pct)
        elif ticks_held >= 2:
            signal, _ = self.ensemble.aggregate(df)
            if signal == -1:
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
                self._save_setting("balance", f"{self._balance:.2f}")
            db.close()

            self.ensemble.record_trade(pnl_pct)
            self._save_setting("ensemble_state", json.dumps(self.ensemble.get_state()))

            self._recent_pnls.append(pnl_pct)
            self._total_trades += 1
            asyncio.create_task(self._auto_optimize())
            if self._total_trades % 50 == 0 and not ml_model._training:
                asyncio.create_task(self._auto_train())
            self.position = None
            self._current_trade_db_id = None
            if self.stop_after_trade:
                self.running = False
                self.stop_after_trade = False
            elif self._pending_pair_switch and self._pending_symbol:
                target = self._pending_symbol
                self._pending_pair_switch = False
                await self.set_symbol(target)
                self.last_pair_switch_msg = f"Auto-switched to {target} — best performing pair"
                self._log_event("pair_switch", f"Auto-switched to {target}")
                self.running = True
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
            "symbol": self.symbol,
            "balance_usdt": balance_usdt,
            "position": self.position,
            "total_trades": self._total_trades,
            "consecutive_losses": sum(1 for p in self._recent_pnls if p < 0),
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
