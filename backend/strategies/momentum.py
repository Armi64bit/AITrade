import numpy as np
from .base import BaseStrategy


class Momentum(BaseStrategy):
    name = "Momentum"

    def default_params(self) -> dict:
        return {"momentum_period": 10, "momentum_threshold": 0.02, "volume_ma_period": 20}

    def update_params(self, params: dict):
        self._params = params

    def compute(self, df, params: dict):
        if hasattr(self, '_params') and self._params:
            params = self._params
        period = int(params.get("momentum_period", 10))
        threshold = params.get("momentum_threshold", 0.02)
        vol_period = int(params.get("volume_ma_period", 20))

        if len(df) < period + 2:
            return 0, 0.0

        # Rate of change
        roc = (df["close"].iloc[-1] - df["close"].iloc[-period]) / df["close"].iloc[-period]
        prev_roc = (df["close"].iloc[-2] - df["close"].iloc[-period - 1]) / df["close"].iloc[-period - 1]

        sqrt_vol = np.sqrt(df["close"].diff().pow(2).rolling(period).mean())

        if len(df) > vol_period:
            avg_vol = df["volume"].rolling(vol_period).mean().iloc[-1]
            last_vol = df["volume"].iloc[-1]
            vol_surge = last_vol > avg_vol * 1.3 if avg_vol > 0 else False
        else:
            vol_surge = False

        recent_high = df["close"].iloc[-period:].max()
        recent_low = df["close"].iloc[-period:].min()
        price_pos = (df["close"].iloc[-1] - recent_low) / (recent_high - recent_low) if recent_high > recent_low else 0.5

        if roc > threshold and prev_roc <= threshold and price_pos > 0.5:
            conf = min(abs(roc) / (threshold * 3) + (0.5 if vol_surge else 0), 1.0)
            return 1, round(conf, 2)
        if roc < -threshold and prev_roc >= -threshold and price_pos < 0.5:
            conf = min(abs(roc) / (threshold * 3) + (0.5 if vol_surge else 0), 1.0)
            return -1, round(conf, 2)

        return 0, 0.0
