import optuna
import numpy as np
from models import SessionLocal, StrategyState
from config import STRATEGY_DEFAULTS


def backtest_strategy(df, params):
    """Backtest the EMA crossover strategy with RSI filter"""
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


def backtest_rsi_reversal(df, params):
    """Backtest RSI Reversal strategy"""
    period = int(params.get("rsi_period", 14))
    oversold = params.get("oversold", 30)
    overbought = params.get("overbought", 70)
    sl = params.get("stop_loss_pct", 0.025)
    tp = params.get("take_profit_pct", 0.05)

    df = df.copy()
    delta = df["close"].diff()
    gain = delta.where(delta > 0, 0)
    loss = -delta.where(delta < 0, 0)
    avg_g = gain.rolling(period).mean()
    avg_l = loss.rolling(period).mean()
    rs = avg_g / avg_l.replace(0, np.nan)
    df["rsi"] = 100 - (100 / (1 + rs))

    df["signal"] = 0
    df.loc[df["rsi"] < oversold, "signal"] = 1
    df.loc[df["rsi"] > overbought, "signal"] = -1

    position = 0
    entry_price = 0
    entry_idx = 0
    returns = []
    max_dd = 0
    peak = 1.0
    equity = 1.0

    for i in range(period + 5, len(df)):
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


def backtest_bb_squeeze(df, params):
    """Backtest Bollinger Band Squeeze strategy"""
    period = int(params.get("bb_period", 20))
    std = params.get("bb_std", 2.0)
    squeeze_thresh = params.get("squeeze_threshold", 0.8)
    sl = params.get("stop_loss_pct", 0.025)
    tp = params.get("take_profit_pct", 0.05)

    df = df.copy()
    sma = df["close"].rolling(period).mean()
    sd = df["close"].rolling(period).std()
    upper = sma + std * sd
    lower = sma - std * sd
    bandwidth = (upper - lower) / sma
    df["bandwidth"] = bandwidth
    df["upper"] = upper
    df["lower"] = lower
    df["mid"] = sma

    df["signal"] = 0
    for i in range(period + 50, len(df)):
        bw = df["bandwidth"].iloc[i]
        avg_bw = df["bandwidth"].iloc[i-50:i].mean()
        squeezing = bw < avg_bw * squeeze_thresh
        
        close = df["close"].iloc[i]
        up = df["upper"].iloc[i]
        low = df["lower"].iloc[i]
        mid = df["mid"].iloc[i]
        
        if squeezing:
            if close > up:
                df.loc[df.index[i], "signal"] = 1
            elif close < low:
                df.loc[df.index[i], "signal"] = -1
        else:
            if close >= up:
                df.loc[df.index[i], "signal"] = -1
            elif close <= low:
                df.loc[df.index[i], "signal"] = 1

    position = 0
    entry_price = 0
    entry_idx = 0
    returns = []
    max_dd = 0
    peak = 1.0
    equity = 1.0

    for i in range(period + 50, len(df)):
        current_signal = df["signal"].iloc[i]
        prev_signal = df["signal"].iloc[i - 1]

        if position == 0:
            if current_signal == 1 and prev_signal != 1:
                position = 1
                entry_price = df["close"].iloc[i]
                entry_idx = i
            elif current_signal == -1 and prev_signal != -1:
                position = -1
                entry_price = df["close"].iloc[i]
                entry_idx = i
        else:
            price = df["close"].iloc[i]
            if position == 1:
                ret = (price - entry_price) / entry_price
            else:
                ret = (entry_price - price) / entry_price
            exit_now = False
            if ret <= -sl:
                exit_now = True
            elif ret >= tp:
                exit_now = True
            elif current_signal == -position and prev_signal != -position:
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


def backtest_momentum(df, params):
    """Backtest Momentum strategy"""
    period = int(params.get("momentum_period", 10))
    threshold = params.get("momentum_threshold", 0.02)
    vol_period = int(params.get("volume_ma_period", 20))
    sl = params.get("stop_loss_pct", 0.025)
    tp = params.get("take_profit_pct", 0.05)

    df = df.copy()
    df["roc"] = df["close"].pct_change(period)
    df["prev_roc"] = df["roc"].shift(1)
    df["recent_high"] = df["close"].rolling(period).max()
    df["recent_low"] = df["close"].rolling(period).min()
    df["price_pos"] = (df["close"] - df["recent_low"]) / (df["recent_high"] - df["recent_low"])
    df["avg_vol"] = df["volume"].rolling(vol_period).mean()
    df["vol_surge"] = df["volume"] > df["avg_vol"] * 1.3

    df["signal"] = 0
    df.loc[(df["roc"] > threshold) & (df["prev_roc"] <= threshold) & (df["price_pos"] > 0.5), "signal"] = 1
    df.loc[(df["roc"] < -threshold) & (df["prev_roc"] >= -threshold) & (df["price_pos"] < 0.5), "signal"] = -1

    position = 0
    entry_price = 0
    entry_idx = 0
    returns = []
    max_dd = 0
    peak = 1.0
    equity = 1.0

    for i in range(period + 5, len(df)):
        current_signal = df["signal"].iloc[i]
        prev_signal = df["signal"].iloc[i - 1]

        if position == 0:
            if current_signal == 1 and prev_signal != 1:
                position = 1
                entry_price = df["close"].iloc[i]
                entry_idx = i
            elif current_signal == -1 and prev_signal != -1:
                position = -1
                entry_price = df["close"].iloc[i]
                entry_idx = i
        else:
            price = df["close"].iloc[i]
            if position == 1:
                ret = (price - entry_price) / entry_price
            else:
                ret = (entry_price - price) / entry_price
            exit_now = False
            if ret <= -sl:
                exit_now = True
            elif ret >= tp:
                exit_now = True
            elif current_signal == -position and prev_signal != -position:
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
    """Run optimization for all 4 strategies and pick the best"""
    strategies = {
        "ema_crossover": {
            "params": {
                "ema_short": (3, 20),
                "ema_long": (20, 100),
                "rsi_period": (5, 30),
                "rsi_overbought": (60, 85),
                "rsi_oversold": (15, 40),
                "stop_loss_pct": (0.02, 0.08),
                "take_profit_pct": (0.03, 0.15),
                "risk_pct": (0.01, 0.03),
                "atr_mult": (1.5, 3.0),
            },
            "backtest": backtest_strategy,
        },
        "rsi_reversal": {
            "params": {
                "rsi_period": (5, 30),
                "oversold": (10, 35),
                "overbought": (65, 90),
                "stop_loss_pct": (0.02, 0.08),
                "take_profit_pct": (0.03, 0.15),
                "risk_pct": (0.01, 0.03),
                "atr_mult": (1.5, 3.0),
            },
            "backtest": backtest_rsi_reversal,
        },
        "bb_squeeze": {
            "params": {
                "bb_period": (10, 50),
                "bb_std": (1.5, 3.0),
                "squeeze_threshold": (0.5, 0.95),
                "stop_loss_pct": (0.02, 0.08),
                "take_profit_pct": (0.03, 0.15),
                "risk_pct": (0.01, 0.03),
                "atr_mult": (1.5, 3.0),
            },
            "backtest": backtest_bb_squeeze,
        },
        "momentum": {
            "params": {
                "momentum_period": (5, 30),
                "momentum_threshold": (0.005, 0.05),
                "volume_ma_period": (10, 50),
                "stop_loss_pct": (0.02, 0.08),
                "take_profit_pct": (0.03, 0.15),
                "risk_pct": (0.01, 0.03),
                "atr_mult": (1.5, 3.0),
            },
            "backtest": backtest_momentum,
        },
    }

    best_overall_sharpe = -999
    best_overall_params = None
    best_strategy_name = None

    for strategy_name, config in strategies.items():
        study = optuna.create_study(
            direction="maximize",
            sampler=optuna.samplers.TPESampler(seed=42),
            pruner=optuna.pruners.MedianPruner(n_startup_trials=10, n_warmup_steps=5),
        )

        def make_objective(backtest_fn):
            def objective(trial):
                params = {}
                for param_name, (low, high) in config["params"].items():
                    if isinstance(low, int):
                        params[param_name] = trial.suggest_int(param_name, low, high)
                    else:
                        params[param_name] = trial.suggest_float(param_name, low, high)
                result = backtest_fn(df, params)
                if result <= -999:
                    raise optuna.TrialPruned()
                return result
            return objective

        objective_fn = make_objective(config["backtest"])
        study.optimize(objective_fn, n_trials=n_trials // 4, timeout=60)

        if len(study.trials) > 0 and study.best_value > best_overall_sharpe:
            best_overall_sharpe = study.best_value
            best_overall_params = study.best_params
            best_strategy_name = strategy_name
            best_overall_params["strategy"] = strategy_name

    if best_overall_sharpe <= -999:
        from config import STRATEGY_DEFAULTS
        return STRATEGY_DEFAULTS, 0.0

    db = SessionLocal()
    record = StrategyState(
        params=best_overall_params,
        sharpe_ratio=best_overall_sharpe,
        is_active=True,
    )
    db.add(record)
    old_active = db.query(StrategyState).filter(StrategyState.is_active == True, StrategyState.id != record.id).all()
    for o in old_active:
        o.is_active = False
    db.commit()
    db.close()

    return best_overall_params, best_overall_sharpe
