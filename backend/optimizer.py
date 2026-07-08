import optuna
import numpy as np
from models import SessionLocal, StrategyState
from config import STRATEGY_DEFAULTS


def backtest_strategy(df, params):
    short = int(params["ema_short"])
    long = int(params["ema_long"])
    rsi_period = int(params["rsi_period"])
    ob = params["rsi_overbought"]
    os = params["rsi_oversold"]

    df = df.copy()
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
    df.loc[(df["ema_short"] > df["ema_long"]) & (df["rsi"] < ob), "signal"] = 1
    df.loc[(df["ema_short"] < df["ema_long"]) & (df["rsi"] > os), "signal"] = -1

    position = 0
    entry_price = 0
    returns = []
    for i in range(1, len(df)):
        if position == 0 and df["signal"].iloc[i] == 1 and df["signal"].iloc[i - 1] == 0:
            position = 1
            entry_price = df["close"].iloc[i]
        elif position == 1 and df["signal"].iloc[i] == -1 and df["signal"].iloc[i - 1] == 0:
            position = 0
            ret = (df["close"].iloc[i] - entry_price) / entry_price
            returns.append(ret)
        elif position == 1:
            ret = (df["close"].iloc[i] - entry_price) / entry_price
            if ret <= -params.get("stop_loss_pct", 0.025):
                returns.append(ret)
                position = 0
            elif ret >= params.get("take_profit_pct", 0.05):
                returns.append(ret)
                position = 0

    if len(returns) < 3:
        return -999

    mean_ret = np.mean(returns)
    std_ret = np.std(returns)
    if std_ret == 0:
        return -999
    sharpe = mean_ret / std_ret * np.sqrt(365)
    return sharpe


def run_optimization(df, n_trials=100):
    study = optuna.create_study(direction="maximize")

    def objective(trial):
        params = {
            "ema_short": trial.suggest_int("ema_short", 3, 20),
            "ema_long": trial.suggest_int("ema_long", 20, 100),
            "rsi_period": trial.suggest_int("rsi_period", 5, 30),
            "rsi_overbought": trial.suggest_int("rsi_overbought", 60, 85),
            "rsi_oversold": trial.suggest_int("rsi_oversold", 15, 40),
            "stop_loss_pct": trial.suggest_float("stop_loss_pct", 0.01, 0.05),
            "take_profit_pct": trial.suggest_float("take_profit_pct", 0.02, 0.10),
        }
        return backtest_strategy(df, params)

    study.optimize(objective, n_trials=n_trials)
    best = study.best_params

    db = SessionLocal()
    record = StrategyState(
        params=best,
        sharpe_ratio=study.best_value,
        is_active=True,
    )
    db.add(record)
    old_active = db.query(StrategyState).filter(StrategyState.is_active == True, StrategyState.id != record.id).all()
    for o in old_active:
        o.is_active = False
    db.commit()
    db.close()

    return best, study.best_value
