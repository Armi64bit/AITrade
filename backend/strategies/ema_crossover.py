import numpy as np
from .base import BaseStrategy


class EmaCrossover(BaseStrategy):
    name = "EMA Crossover"

    def default_params(self) -> dict:
        return {"ema_short": 7, "ema_long": 25, "rsi_period": 14, "rsi_overbought": 70, "rsi_oversold": 30}

    def compute(self, df, params: dict):
        short = int(params.get("ema_short", 7))
        long = int(params.get("ema_long", 25))
        rsi_period = int(params.get("rsi_period", 14))
        ob = params.get("rsi_overbought", 70)
        os = params.get("rsi_oversold", 30)

        ema_s = df["close"].ewm(span=short, adjust=False).mean()
        ema_l = df["close"].ewm(span=long, adjust=False).mean()

        delta = df["close"].diff()
        gain = delta.where(delta > 0, 0)
        loss = -delta.where(delta < 0, 0)
        avg_g = gain.rolling(rsi_period).mean()
        avg_l = loss.rolling(rsi_period).mean()
        rs = avg_g / avg_l.replace(0, np.nan)
        rsi = 100 - (100 / (1 + rs))

        last_ema_s = ema_s.iloc[-1]
        last_ema_l = ema_l.iloc[-1]
        last_rsi = rsi.iloc[-1]
        prev_ema_s = ema_s.iloc[-2] if len(ema_s) > 1 else last_ema_s
        prev_ema_l = ema_l.iloc[-2] if len(ema_l) > 1 else last_ema_l

        bull_cross = prev_ema_s <= prev_ema_l and last_ema_s > last_ema_l
        bear_cross = prev_ema_s >= prev_ema_l and last_ema_s < last_ema_l

        if bull_cross and last_rsi < ob:
            confidence = min(abs(last_rsi - 50) / 50 + 0.3, 1.0)
            return 1, round(confidence, 2)
        if bear_cross and last_rsi > os:
            confidence = min(abs(last_rsi - 50) / 50 + 0.3, 1.0)
            return -1, round(confidence, 2)

        return 0, 0.0
