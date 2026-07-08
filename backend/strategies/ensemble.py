from typing import NamedTuple
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
        # Weights: last 0 is bias
        self.weights = {s.name: 1.0 for s in self.strategies}
        self._tracking = {s.name: {"wins": 0, "losses": 0, "trades": 0} for s in self.strategies}
        self._last_votes: list[StrategyVote] = []

    def default_weights(self) -> dict:
        return {s.name: 1.0 for s in self.strategies}

    def set_weights(self, w: dict):
        for k in self.weights:
            self.weights[k] = w.get(k, 1.0)

    def get_signals(self, df) -> list[StrategyVote]:
        votes: list[StrategyVote] = []
        for s in self.strategies:
            try:
                sig, conf = s.compute(df, s.default_params())
            except Exception:
                sig, conf = 0, 0.0
            votes.append(StrategyVote(s.name, sig, conf, self.weights.get(s.name, 1.0)))
        self._last_votes = votes
        return votes

    def aggregate(self, df, threshold: float = 0.1) -> tuple[int, float]:
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
        if score > threshold:
            return 1, score
        if score < -threshold:
            return -1, abs(score)
        return 0, abs(score)

    def record_trade(self, pnl_pct: float):
        """After a trade closes, reward/punish strategies based on whether their last vote was correct."""
        for v in self._last_votes:
            track = self._tracking[v.name]
            track["trades"] += 1
            if v.signal == 0:
                continue
            # The trade was profitable: strategies that voted in the right direction get rewarded
            correct = (pnl_pct > 0 and v.signal == 1) or (pnl_pct < 0 and v.signal == -1) or (pnl_pct == 0)
            # Actually for short trades (signal=-1), profit comes from price going down
            # We don't track trade direction here, just the profit result
            if pnl_pct > 0:
                track["wins"] += 1
            elif pnl_pct < 0:
                track["losses"] += 1
            # Adjust weight dynamically
            win_rate = track["wins"] / max(track["trades"], 1)
            self.weights[v.name] = max(0.1, min(2.0, win_rate * 2))

    def get_tracking(self) -> dict:
        return self._tracking

    def get_last_votes(self) -> list[StrategyVote]:
        return self._last_votes
