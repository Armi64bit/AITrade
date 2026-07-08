import pandas as pd
import numpy as np


def compute_indicators(df, params):
    short = params.get("ema_short", 7)
    long = params.get("ema_long", 25)
    rsi_period = params.get("rsi_period", 14)

    df["ema_short"] = df["close"].ewm(span=short, adjust=False).mean()
    df["ema_long"] = df["close"].ewm(span=long, adjust=False).mean()

    delta = df["close"].diff()
    gain = delta.where(delta > 0, 0)
    loss = -delta.where(delta < 0, 0)
    avg_gain = gain.rolling(rsi_period).mean()
    avg_loss = loss.rolling(rsi_period).mean()
    rs = avg_gain / avg_loss.replace(0, np.nan)
    df["rsi"] = 100 - (100 / (1 + rs))

    df["signal"] = 0
    df.loc[(df["ema_short"] > df["ema_long"]) & (df["rsi"] < params.get("rsi_overbought", 70)), "signal"] = 1
    df.loc[(df["ema_short"] < df["ema_long"]) & (df["rsi"] > params.get("rsi_oversold", 30)), "signal"] = -1
    return df


def should_enter(df, params):
    if len(df) < max(params.get("ema_long", 25), params.get("rsi_period", 14)) + 5:
        return 0
    last = df.iloc[-1]
    prev = df.iloc[-2]
    if last["signal"] == 1 and prev["signal"] == 0:
        return 1
    if last["signal"] == -1 and prev["signal"] == 0:
        return -1
    return 0
