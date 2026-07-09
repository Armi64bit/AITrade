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
    sl = params.get("stop_loss_pct", 0.025)
    tp = params.get("take_profit_pct", 0.05)

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
    entry_idx = 0
    returns = []
    max_dd = 0
    peak = 1.0
    equity = 1.0

    for i in range(long + 5, len(df)):
        current_signal = df["signal"].iloc[i]
        prev_signal = df["signal"].iloc[i - 1]

        if position == 0:
            if current_signal == 1 and prev_signal != 1:
                position = 1
                entry_price = df["close"].iloc[i]
                entry_idx = i
        else:
            price = df["close"].iloc[i]
            ret = (price - entry_price) / entry_price
            exit_now = False
            if ret <= -sl:
                exit_now = True
            elif ret >= tp:
                exit_now = True
            elif current_signal == -1 and prev_signal != -1:
                exit_now = True
            elif i - entry_idx > 48:
                exit_now = True
            if exit_now:
                returns.append(ret)
                equity *= (1 + ret)
                peak = max(peak, equity)
                dd = (peak - equity) / peak
                max_dd = max(max_dd, dd)
                position = 0

    if len(returns) < 3:
        return -999

    mean_ret = np.mean(returns)
    std_ret = np.std(returns)
    if std_ret == 0:
        return -999

    sharpe = mean_ret / std_ret * np.sqrt(365)

    if max_dd > 0.3:
        sharpe *= (1 - max_dd)

    return sharpe


def run_optimization(df, n_trials=500):
    study = optuna.create_study(
        direction="maximize",
        sampler=optuna.samplers.TPESampler(seed=42),
        pruner=optuna.pruners.MedianPruner(n_startup_trials=10, n_warmup_steps=5),
    )

    def objective(trial):
        params = {
            "ema_short": trial.suggest_int("ema_short", 3, 20),
            "ema_long": trial.suggest_int("ema_long", 20, 100),
            "rsi_period": trial.suggest_int("rsi_period", 5, 30),
            "rsi_overbought": trial.suggest_int("rsi_overbought", 60, 85),
            "rsi_oversold": trial.suggest_int("rsi_oversold", 15, 40),
            "stop_loss_pct": trial.suggest_float("stop_loss_pct", 0.01, 0.06),
            "take_profit_pct": trial.suggest_float("take_profit_pct", 0.015, 0.12),
        }
        result = backtest_strategy(df, params)
        if result <= -999:
            raise optuna.TrialPruned()
        return result

    study.optimize(objective, n_trials=n_trials, timeout=120)

    if len(study.trials) == 0 or study.best_value <= -999:
        from config import STRATEGY_DEFAULTS
        return STRATEGY_DEFAULTS, 0.0

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
