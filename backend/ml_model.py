import json
import os
import pickle
import numpy as np
import pandas as pd
from datetime import datetime, timezone
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import brier_score_loss, mean_absolute_error
from models import SessionLocal, Trade

MODEL_PATH = os.getenv("MODEL_PATH", "/app/data/ml_model.pkl")


class MLModel:
    def __init__(self):
        self.logistic = None
        self.rf_clf = None
        self.gb_reg = None
        self.scaler = StandardScaler()
        self._features_mean = None
        self._last_train_time = None
        self._last_train_trades = 0
        self._last_accuracy = 0.0
        self._last_improvement = 0.0
        self._training = False
        self._calibration_error = 0.5
        self._recent_predictions = []
        self._adaptive_threshold = 0.55
        self._feature_names = [
            "price", "ema_gap", "rsi", "volatility", "momentum",
            "volume_ratio", "atr_ratio", "bb_position", "support_dist", "resistance_dist",
            "higher_tf_trend", "regime",
            "ma_20_slope", "ma_50_slope", "close_ma20_diff", "close_ma50_diff",
            "ma_spread", "ma_spread_slope",
        ]
        self._oos_score = 0.0
        self._train_score = 0.0
        self._load()

    def _load(self):
        if os.path.exists(MODEL_PATH):
            try:
                with open(MODEL_PATH, "rb") as f:
                    data = pickle.load(f)
                self.logistic = data.get("logistic")
                self.rf_clf = data.get("rf_clf")
                self.gb_reg = data.get("gb_reg")
                self.scaler = data.get("scaler", StandardScaler())
                self._features_mean = data.get("features_mean")
                self._last_train_time = data.get("last_train_time")
                self._last_train_trades = data.get("last_train_trades", 0)
                self._last_accuracy = data.get("last_accuracy", 0.0)
                self._calibration_error = data.get("calibration_error", 0.5)
                self._recent_predictions = data.get("recent_predictions", [])
                self._adaptive_threshold = data.get("adaptive_threshold", 0.55)
                self._oos_score = data.get("oos_score", 0.0)
                self._train_score = data.get("train_score", 0.0)
            except Exception:
                self.logistic = None

    def _save(self):
        os.makedirs(os.path.dirname(MODEL_PATH) or ".", exist_ok=True)
        with open(MODEL_PATH, "wb") as f:
            pickle.dump({
                "logistic": self.logistic,
                "rf_clf": self.rf_clf,
                "gb_reg": self.gb_reg,
                "scaler": self.scaler,
                "features_mean": self._features_mean,
                "last_train_time": self._last_train_time,
                "last_train_trades": self._last_train_trades,
                "last_accuracy": self._last_accuracy,
                "calibration_error": self._calibration_error,
                "recent_predictions": self._recent_predictions,
                "adaptive_threshold": self._adaptive_threshold,
                "oos_score": self._oos_score,
                "train_score": self._train_score,
            }, f)

    def _compute_rsi(self, prices, period=14):
        deltas = np.diff(prices)
        gains = np.maximum(deltas, 0)
        losses = -np.minimum(deltas, 0)
        avg_gain = np.convolve(gains, np.ones(period) / period, mode="valid")
        avg_loss = np.convolve(losses, np.ones(period) / period, mode="valid")
        rs = avg_gain / np.maximum(avg_loss, 1e-10)
        rsi = 100 - (100 / (1 + rs))
        pad = np.full(period, 50.0)
        return np.concatenate([pad, rsi])

    def _compute_support_resistance(self, df, idx):
        close = df["close"].values
        high = df["high"].values
        low = df["low"].values
        window = min(40, idx)
        if window < 10:
            return 0.0, 0.0
        recent_highs = high[idx - window:idx + 1]
        recent_lows = low[idx - window:idx + 1]
        current = close[idx]
        nearest_support = np.min(recent_lows)
        nearest_resistance = np.max(recent_highs)
        support_dist = (current - nearest_support) / current if current != 0 else 0
        resistance_dist = (nearest_resistance - current) / current if current != 0 else 0
        return float(support_dist), float(resistance_dist)

    def _compute_higher_tf_trend(self, df, idx):
        close = df["close"].values
        window = min(100, idx)
        if window < 30:
            return 0.0
        ema_50 = np.mean(close[idx - min(50, idx):idx + 1])
        ema_200 = np.mean(close[idx - min(200, idx):idx + 1])
        price = close[idx]
        if price > ema_50 * 1.01 and ema_50 > ema_200:
            return 1.0
        elif price < ema_50 * 0.99 and ema_50 < ema_200:
            return -1.0
        return 0.0

    def _compute_regime(self, df, idx):
        close = df["close"].values
        window = min(30, idx)
        if window < 10:
            return 0.0
        returns = np.diff(close[idx - window:idx + 1]) / close[idx - window:idx]
        avg_return = np.mean(returns)
        std_return = np.std(returns)
        if std_return == 0:
            return 0.0
        if abs(avg_return / std_return) > 0.5:
            return 1.0 if avg_return > 0 else -1.0
        return 0.0

    def _extract_features_at_idx(self, df, idx, time_in_trade=0, unrealized_pnl=0.0):
        close = df["close"].values
        high = df["high"].values if "high" in df.columns else close
        low = df["low"].values if "low" in df.columns else close
        volume = df["volume"].values if "volume" in df.columns else np.ones_like(close)

        ema_s = pd.Series(close).ewm(span=7, adjust=False).mean().values
        ema_l = pd.Series(close).ewm(span=25, adjust=False).mean().values
        rsi = self._compute_rsi(close, 14)

        support_dist, resistance_dist = self._compute_support_resistance(df, idx)

        atr = float(np.mean(high[max(0, idx-14):idx+1] - low[max(0, idx-14):idx+1])) if idx >= 14 else 0
        avg_vol = float(np.mean(volume[max(0, idx-20):idx+1])) if idx >= 20 else 1
        current_vol = float(volume[idx]) if idx < len(volume) else 1

        bb_mid = float(np.mean(close[max(0, idx-20):idx+1]))
        bb_std = float(np.std(close[max(0, idx-20):idx+1]))
        bb_position = float((close[idx] - bb_mid) / (bb_std * 2)) if bb_std != 0 else 0

        ma_20 = pd.Series(close).rolling(20).mean().values
        ma_50 = pd.Series(close).rolling(50).mean().values if idx >= 50 else np.full_like(close, close[idx])

        ma_20_slope = float((ma_20[idx] - ma_20[max(0, idx-5)]) / ma_20[max(0, idx-5)]) if idx >= 5 and ma_20[max(0, idx-5)] != 0 else 0
        ma_50_slope = float((ma_50[idx] - ma_50[max(0, idx-10)]) / ma_50[max(0, idx-10)]) if idx >= 10 and ma_50[max(0, idx-10)] != 0 else 0

        close_ma20_diff = float((close[idx] - ma_20[idx]) / close[idx]) if close[idx] != 0 and not np.isnan(ma_20[idx]) else 0
        close_ma50_diff = float((close[idx] - ma_50[idx]) / close[idx]) if close[idx] != 0 and not np.isnan(ma_50[idx]) else 0

        ma_spread = float((ma_20[idx] - ma_50[idx]) / close[idx]) if close[idx] != 0 and not np.isnan(ma_20[idx]) and not np.isnan(ma_50[idx]) else 0
        ma_spread_slope = float(ma_spread - ((ma_20[max(0, idx-5)] - ma_50[max(0, idx-5)]) / close[max(0, idx-5)] if close[max(0, idx-5)] != 0 else 0)) if idx >= 5 else 0

        features = [
            float(close[idx]),
            float(ema_s[idx] / ema_l[idx] - 1) if ema_l[idx] != 0 else 0,
            float(rsi[idx] / 100) if idx < len(rsi) else 0.5,
            float(np.std(close[max(0, idx-20):idx+1]) / close[idx]) if close[idx] != 0 else 0,
            float(close[idx] / close[max(0, idx-5)] - 1) if idx >= 5 else 0,
            float(current_vol / avg_vol) if avg_vol > 0 else 1.0,
            float(atr / close[idx]) if close[idx] != 0 else 0,
            bb_position,
            support_dist,
            resistance_dist,
            self._compute_higher_tf_trend(df, idx),
            self._compute_regime(df, idx),
            ma_20_slope,
            ma_50_slope,
            close_ma20_diff,
            close_ma50_diff,
            ma_spread,
            ma_spread_slope,
        ]
        return features

    def _extract_features(self, df, idx=None):
        if idx is None:
            idx = len(df) - 1
        return self._extract_features_at_idx(df, idx)

    def _time_series_split(self, X, y, weights, test_ratio=0.2):
        n = len(X)
        split = int(n * (1 - test_ratio))
        if split < 5 or n - split < 3:
            return X, y, weights, None, None, None
        return (
            X[:split], y[:split], weights[:split],
            X[split:], y[split:], weights[split:],
        )

    def _build_training_data(self, df):
        db = SessionLocal()
        trades = db.query(Trade).filter(Trade.status == "closed").order_by(Trade.id.asc()).all()
        db.close()
        if len(trades) < 5:
            return None, None, None

        X, y_class, y_reg, weights = [], [], [], []
        for i, t in enumerate(trades):
            if not t.entry_price or t.pnl is None or not t.entry_time:
                continue
            entry_ts = int(t.entry_time.timestamp() * 1000) if t.entry_time.tzinfo else int(t.entry_time.replace(tzinfo=timezone.utc).timestamp() * 1000)
            df_times = df["time"].values
            idx = np.searchsorted(df_times, entry_ts, side="right") - 1
            idx = max(0, min(idx, len(df) - 1))

            features = self._extract_features_at_idx(df, idx)
            X.append(features)
            y_class.append(1 if t.pnl > 0 else 0)
            y_reg.append(float(t.pnl_pct or 0))

            recency = 1.0 + (i / max(len(trades), 1)) * 3.0
            magnitude = min(abs(t.pnl or 0) * 15, 5.0) + 1.0
            weights.append(recency * magnitude)

        if len(X) < 5:
            return None, None, None
        return np.array(X), np.array(y_class), np.array(y_reg), np.array(weights)

    def train(self, df):
        self._training = True
        try:
            result = self._build_training_data(df)
            if result[0] is None:
                self._training = False
                return {"status": "error", "message": f"Need at least 5 closed trades"}
            X, y_class, y_reg, weights = result

            old_accuracy = self._last_accuracy

            X_train, y_train, w_train, X_oos, y_oos, w_oos = self._time_series_split(X, y_class, weights)

            self.scaler = StandardScaler()
            X_scaled = self.scaler.fit_transform(X)

            self.logistic = LogisticRegression(max_iter=2000, random_state=42, class_weight="balanced")
            self.logistic.fit(X_scaled, y_class)

            self.rf_clf = RandomForestClassifier(
                n_estimators=120, max_depth=8, random_state=42,
                class_weight="balanced_subsample", min_samples_leaf=2
            )
            self.rf_clf.fit(X_scaled, y_class)

            self.gb_reg = GradientBoostingRegressor(
                n_estimators=80, max_depth=4, learning_rate=0.1,
                random_state=42, min_samples_leaf=3
            )
            self.gb_reg.fit(X_scaled, y_reg)

            logit_proba = self.logistic.predict_proba(X_scaled)[:, 1]
            rf_proba = self.rf_clf.predict_proba(X_scaled)[:, 1]
            ensemble_proba = (logit_proba + rf_proba) / 2
            preds = (ensemble_proba > 0.5).astype(int)

            acc = np.mean(preds == y_class)
            self._calibration_error = brier_score_loss(y_class, ensemble_proba)
            self._adaptive_threshold = max(0.51, min(0.65, 0.5 + self._calibration_error))

            self._train_score = round(acc, 4)

            if X_oos is not None and len(X_oos) >= 3:
                X_oos_scaled = self.scaler.transform(X_oos)
                oos_logit = self.logistic.predict_proba(X_oos_scaled)[:, 1]
                oos_rf = self.rf_clf.predict_proba(X_oos_scaled)[:, 1]
                oos_proba = (oos_logit + oos_rf) / 2
                oos_preds = (oos_proba > 0.5).astype(int)
                oos_acc = np.mean(oos_preds == y_oos)
                self._oos_score = round(oos_acc, 4)
            else:
                self._oos_score = round(acc, 4)

            self._features_mean = np.mean(X, axis=0).tolist()
            self._last_accuracy = acc
            self._last_train_trades = len(X)
            self._last_improvement = acc - old_accuracy
            self._last_train_time = __import__("time").time()

            self._save()
            self._training = False
            return {
                "status": "success",
                "trades_used": len(X),
                "accuracy": round(acc, 3),
                "improvement": round(acc - old_accuracy, 3),
                "old_accuracy": round(old_accuracy, 3),
                "calibration_error": round(self._calibration_error, 4),
                "adaptive_threshold": round(self._adaptive_threshold, 3),
                "oos_accuracy": self._oos_score,
                "train_accuracy": self._train_score,
            }
        except Exception as e:
            self._training = False
            return {"status": "error", "message": str(e)}

    def predict(self, df):
        if (self.logistic is None and self.rf_clf is None) or len(df) < 26:
            return 0, 0.0, None
        features = self._extract_features(df)
        try:
            X = np.array([features])
            X_scaled = self.scaler.transform(X)

            probs = []
            if self.logistic is not None:
                lp = self.logistic.predict_proba(X_scaled)[0]
                probs.append(lp)
            if self.rf_clf is not None:
                rp = self.rf_clf.predict_proba(X_scaled)[0]
                probs.append(rp)

            if len(probs) == 2:
                avg_proba = [(probs[0][i] + probs[1][i]) / 2 for i in range(2)]
            else:
                avg_proba = probs[0]

            prob_win = float(avg_proba[1])
            prob_loss = float(avg_proba[0])

            expected_pnl = 0.0
            if self.gb_reg is not None:
                expected_pnl = float(self.gb_reg.predict(X_scaled)[0])

            direction = 1 if prob_win > prob_loss and prob_win > self._adaptive_threshold else (
                -1 if prob_loss > prob_win and prob_loss > self._adaptive_threshold else 0
            )
            confidence = max(prob_win, prob_loss)

            self._last_prediction = {
                "features": [round(f, 4) for f in features],
                "feature_names": self._feature_names,
                "prob_win": round(float(prob_win), 4),
                "prob_loss": round(float(prob_loss), 4),
                "direction": direction,
                "confidence": round(float(confidence), 4),
                "adaptive_threshold": round(self._adaptive_threshold, 3),
                "expected_pnl_pct": round(float(expected_pnl), 6),
                "model_agreement": (
                    "agree" if (self.logistic is not None and self.rf_clf is not None and
                                (self.logistic.predict(X_scaled)[0] == self.rf_clf.predict(X_scaled)[0]))
                    else "disagree"
                ),
            }

            self._recent_predictions.append({
                "direction": direction,
                "correct": None,
            })
            if len(self._recent_predictions) > 100:
                self._recent_predictions = self._recent_predictions[-100:]

            return direction, round(float(confidence), 2), self._last_prediction
        except Exception:
            self._last_prediction = None
            return 0, 0.0, None

    def record_prediction_outcome(self, was_correct: bool):
        if self._recent_predictions:
            self._recent_predictions[-1]["correct"] = was_correct
            recent_correct = [p for p in self._recent_predictions[-50:] if p["correct"] is not None]
            if recent_correct:
                accuracy = sum(1 for p in recent_correct if p["correct"]) / len(recent_correct)
                self._adaptive_threshold = max(0.51, min(0.65, 0.55 + (0.5 - accuracy) * 0.3))
        self._save()

    def get_coefficients(self):
        if self.logistic is None:
            return None
        coefs = self.logistic.coef_[0]
        max_abs = max(abs(c) for c in coefs) if len(coefs) > 0 else 1
        return [round(float(c / max_abs), 3) for c in coefs]

    def get_feature_importance(self):
        if self.rf_clf is None:
            return None
        importances = self.rf_clf.feature_importances_
        return [
            {"name": self._feature_names[i], "importance": round(float(importances[i]), 4)}
            for i in range(min(len(importances), len(self._feature_names)))
        ]

    def get_last_prediction(self):
        return getattr(self, "_last_prediction", None)

    def get_info(self):
        db = SessionLocal()
        current_trades = db.query(Trade).filter(Trade.status == "closed").count()
        db.close()
        return {
            "trained": self._last_train_time is not None,
            "last_train_time": self._last_train_time,
            "trades_used": self._last_train_trades,
            "trades_available": current_trades,
            "trades_since_last": current_trades - self._last_train_trades,
            "accuracy": round(self._last_accuracy, 3) if self._last_accuracy else 0,
            "improvement": round(self._last_improvement, 3),
            "training": self._training,
            "coefficients": self.get_coefficients(),
            "calibration_error": round(self._calibration_error, 4),
            "adaptive_threshold": round(self._adaptive_threshold, 3),
            "feature_importance": self.get_feature_importance(),
            "oos_accuracy": self._oos_score,
            "train_accuracy": self._train_score,
        }


ml_model = MLModel()
