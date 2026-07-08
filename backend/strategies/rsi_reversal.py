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

        # Buy when oversold (expecting reversal up)
        if last_rsi < oversold:
            confidence = min((oversold - last_rsi) / oversold + 0.2, 1.0)
            return 1, round(confidence, 2)
        # Sell when overbought (expecting reversal down)
        if last_rsi > overbought:
            confidence = min((last_rsi - overbought) / (100 - overbought) + 0.2, 1.0)
            return -1, round(confidence, 2)

        return 0, 0.0
