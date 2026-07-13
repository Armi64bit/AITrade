import numpy as np
from .base import BaseStrategy


class BbSqueeze(BaseStrategy):
    name = "Bollinger Squeeze"

    def default_params(self) -> dict:
        return {"bb_period": 20, "bb_std": 2.0, "squeeze_threshold": 0.8}

    def update_params(self, params: dict):
        self._params = params

    def compute(self, df, params: dict):
        if hasattr(self, '_params') and self._params:
            params = self._params
        period = int(params.get("bb_period", 20))
        std = params.get("bb_std", 2.0)
        squeeze_thresh = params.get("squeeze_threshold", 0.8)

        sma = df["close"].rolling(period).mean()
        sd = df["close"].rolling(period).std()

        upper = sma + std * sd
        lower = sma - std * sd
        bandwidth = (upper - lower) / sma
        last_bw = bandwidth.iloc[-1]
        prev_bw = bandwidth.iloc[-2] if len(bandwidth) > 1 else last_bw

        last_close = df["close"].iloc[-1]
        last_upper = upper.iloc[-1]
        last_lower = lower.iloc[-1]
        last_mid = sma.iloc[-1]

        # Squeeze: bandwidth contracting -> breakout imminent
        squeezing = last_bw < bandwidth.rolling(50).mean().iloc[-1] * squeeze_thresh if len(bandwidth) > 50 else False

        if squeezing:
            # Breakout detection: price moving above upper band
            if last_close > last_upper:
                confidence = min((last_close - last_upper) / last_upper * 5 + 0.3, 1.0)
                return 1, round(confidence, 2)
            if last_close < last_lower:
                confidence = min((last_lower - last_close) / last_lower * 5 + 0.3, 1.0)
                return -1, round(confidence, 2)
        else:
            # Mean reversion: price touching bands
            if last_close >= last_upper:
                confidence = min((last_close - last_mid) / (last_upper - last_mid) * 0.5, 0.6)
                return -1, round(confidence, 2)
            if last_close <= last_lower:
                confidence = min((last_mid - last_close) / (last_mid - last_lower) * 0.5, 0.6)
                return 1, round(confidence, 2)

        return 0, 0.0
