from typing import NamedTuple
from collections import deque
import numpy as np
from .ema_crossover import EmaCrossover
from .rsi_reversal import RsiReversal
from .bb_squeeze import BbSqueeze
from .momentum import Momentum


class StrategyVote(NamedTuple):
    name: str
    signal: int
    confidence: float
    weight: float


class Ensemble:
    def __init__(self):
        self.strategies = [
            EmaCrossover(),
            RsiReversal(),
            BbSqueeze(),
            Momentum(),
        ]
        self.weights = {s.name: 1.0 for s in self.strategies}
        self._tracking = {s.name: {"wins": 0, "losses": 0, "trades": 0, "total_pnl": 0.0, "pnls": []} for s in self.strategies}
        self._last_votes: list[StrategyVote] = []
        self._strategy_params = {}
        self._consecutive_losses = 0
        self._recent_pnls = deque(maxlen=20)
        self._avg_threshold = 0.25
        self._regime = 0  # -1 downtrend, 0 neutral, 1 uptrend

    def default_weights(self) -> dict:
        return {s.name: 1.0 for s in self.strategies}

    def set_weights(self, w: dict):
        for k in self.weights:
            self.weights[k] = w.get(k, 1.0)

    def update_strategy_params(self, params: dict):
        self._strategy_params = params
        for s in self.strategies:
            if hasattr(s, 'update_params'):
                s.update_params(params)

    def get_signals(self, df) -> list[StrategyVote]:
        votes: list[StrategyVote] = []
        for s in self.strategies:
            try:
                params = self._strategy_params if self._strategy_params else s.default_params()
                sig, conf = s.compute(df, params)
            except Exception:
                sig, conf = 0, 0.0
            votes.append(StrategyVote(s.name, sig, conf, self.weights.get(s.name, 1.0)))
        self._last_votes = votes
        return votes

    def set_regime(self, regime: int):
        self._regime = regime

    def _get_dynamic_threshold(self) -> float:
        base = self._avg_threshold
        if self._consecutive_losses >= 3:
            base += 0.10
        elif self._consecutive_losses >= 5:
            base += 0.20
        if self._regime == 0:
            base += 0.08
        return min(base, 0.55)

    def aggregate(self, df, threshold: float | None = None) -> tuple[int, float]:
        votes = self.get_signals(df)
        total = 0.0
        weight_sum = 0.0
        details = []
        for v in votes:
            if v.confidence > 0:
                contribution = v.signal * v.confidence * v.weight
                total += contribution
                weight_sum += v.weight
                details.append(f"{v.name}: {v.signal:+d} (c:{v.confidence:.2f} w:{v.weight:.2f})")

        if weight_sum == 0:
            return 0, 0.0

        score = total / weight_sum
        effective_threshold = self._get_dynamic_threshold() if threshold is None else threshold

        if score > effective_threshold:
            return 1, score
        if score < -effective_threshold:
            return -1, abs(score)
        return 0, abs(score)

    def record_trade(self, pnl_pct: float):
        self._recent_pnls.append(pnl_pct)
        if pnl_pct < 0:
            self._consecutive_losses += 1
        else:
            self._consecutive_losses = 0

        for v in self._last_votes:
            track = self._tracking[v.name]
            track["trades"] += 1
            track["total_pnl"] += pnl_pct
            track["pnls"].append(pnl_pct)
            if len(track["pnls"]) > 30:
                track["pnls"] = track["pnls"][-30:]

            if v.signal == 0:
                continue
            if pnl_pct > 0:
                track["wins"] += 1
            elif pnl_pct < 0:
                track["losses"] += 1

            recency_bonus = min(len(track["pnls"]) / 10, 1.0) + 0.5
            win_rate = track["wins"] / max(track["trades"], 1)
            avg_pnl = track["total_pnl"] / max(track["trades"], 1)
            pnl_factor = 1.0 + max(avg_pnl * 10, -0.5)
            self.weights[v.name] = max(0.1, min(2.0, win_rate * pnl_factor * recency_bonus))

    def get_conviction(self) -> float:
        if not self._last_votes:
            return 0.0
        buy_weight = sum(v.weight for v in self._last_votes if v.signal == 1)
        sell_weight = sum(v.weight for v in self._last_votes if v.signal == -1)
        total = buy_weight + sell_weight
        if total == 0:
            return 0.0
        return (buy_weight - sell_weight) / total

    def get_state(self) -> dict:
        return {
            "weights": self.weights,
            "tracking": {
                k: {
                    "wins": v["wins"],
                    "losses": v["losses"],
                    "trades": v["trades"],
                    "total_pnl": v["total_pnl"],
                }
                for k, v in self._tracking.items()
            },
            "consecutive_losses": self._consecutive_losses,
            "avg_threshold": self._avg_threshold,
        }

    def set_state(self, state: dict):
        if "weights" in state:
            for k in self.weights:
                self.weights[k] = state["weights"].get(k, 1.0)
        if "tracking" in state:
            for k in self._tracking:
                saved = state["tracking"].get(k, {})
                self._tracking[k] = {
                    "wins": saved.get("wins", 0),
                    "losses": saved.get("losses", 0),
                    "trades": saved.get("trades", 0),
                    "total_pnl": saved.get("total_pnl", 0.0),
                    "pnls": [],
                }
        if "consecutive_losses" in state:
            self._consecutive_losses = state.get("consecutive_losses", 0)
        if "avg_threshold" in state:
            self._avg_threshold = state.get("avg_threshold", 0.25)

    def get_tracking(self) -> dict:
        return self._tracking

    def get_last_votes(self) -> list[StrategyVote]:
        return self._last_votes
