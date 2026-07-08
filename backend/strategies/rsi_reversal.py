import numpy as np
from .base import BaseStrategy


class RsiReversal(BaseStrategy):
    name = "RSI Reversal"

    def default_params(self) -> dict:
        return {"rsi_period": 14, "oversold": 30, "overbought": 70}

    def compute(self, df, params: dict):
        period = int(params.get("rsi_period", 14))
        oversold = params.get("oversold", 30)
        overbought = params.get("overbought", 70)

        delta = df["close"].diff()
        gain = delta.where(delta > 0, 0)
        loss = -delta.where(delta < 0, 0)
        avg_g = gain.rolling(period).mean()
        avg_l = loss.rolling(period).mean()
        rs = avg_g / avg_l.replace(0, np.nan)
        rsi = 100 - (100 / (1 + rs))
        last_rsi = rsi.iloc[-1]

        # Strong reversal signal at extremes
        if last_rsi < oversold:
            confidence = min((oversold - last_rsi) / oversold + 0.3, 1.0)
            return 1, round(confidence, 2)
        if last_rsi > overbought:
            confidence = min((last_rsi - overbought) / (100 - overbought) + 0.3, 1.0)
            return -1, round(confidence, 2)

        # Weak lean: approaching oversold -> lean buy, approaching overbought -> lean sell
        if last_rsi < 40:
            confidence = (40 - last_rsi) / 40 * 0.5
            return 1, round(confidence, 2)
        if last_rsi > 60:
            confidence = (last_rsi - 60) / 40 * 0.5
            return -1, round(confidence, 2)

        return 0, 0.0
