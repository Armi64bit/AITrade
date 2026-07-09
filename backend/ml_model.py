import json
import os
import pickle
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from models import SessionLocal, Trade

MODEL_PATH = os.getenv("MODEL_PATH", "/app/data/ml_model.pkl")


class MLModel:
    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self._features_mean = None
        self._last_train_time = None
        self._last_train_trades = 0
        self._last_accuracy = 0.0
        self._last_improvement = 0.0
        self._training = False
        self._load()

    def _load(self):
        if os.path.exists(MODEL_PATH):
            try:
                with open(MODEL_PATH, "rb") as f:
                    data = pickle.load(f)
                self.model = data.get("model")
                self.scaler = data.get("scaler", StandardScaler())
                self._features_mean = data.get("features_mean")
                self._last_train_time = data.get("last_train_time")
                self._last_train_trades = data.get("last_train_trades", 0)
                self._last_accuracy = data.get("last_accuracy", 0.0)
            except Exception:
                self.model = None

    def _save(self):
        os.makedirs(os.path.dirname(MODEL_PATH) or ".", exist_ok=True)
        with open(MODEL_PATH, "wb") as f:
            pickle.dump({
                "model": self.model,
                "scaler": self.scaler,
                "features_mean": self._features_mean,
                "last_train_time": self._last_train_time,
                "last_train_trades": self._last_train_trades,
                "last_accuracy": self._last_accuracy,
            }, f)

    def _extract_features(self, df, idx=None):
        if idx is None:
            idx = len(df) - 1
        close = df["close"].values
        ema_s = df["close"].ewm(span=7, adjust=False).mean().values
        ema_l = df["close"].ewm(span=25, adjust=False).mean().values
        rsi = self._compute_rsi(df["close"].values, 14)
        features = [
            float(close[idx]),
            float(ema_s[idx] / ema_l[idx] - 1) if ema_l[idx] != 0 else 0,
            float(rsi[idx] / 100) if idx < len(rsi) else 0.5,
            float(np.std(close[max(0, idx-20):idx+1]) / close[idx]) if close[idx] != 0 else 0,
            float(close[idx] / close[max(0, idx-5)] - 1) if idx >= 5 else 0,
        ]
        return features

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

    def _build_training_data(self, df):
        db = SessionLocal()
        trades = db.query(Trade).filter(Trade.status == "closed").order_by(Trade.id.asc()).all()
        db.close()
        if len(trades) < 5:
            return None, None

        close_vals = df["close"].values if len(df) > 0 else np.array([])

        X, y = [], []
        for t in trades:
            if not t.entry_price or t.pnl is None:
                continue
            features = [
                float(t.entry_price),
                0.0,
                0.5,
                0.0,
                0.0,
            ]
            if len(close_vals) > 20:
                idx = len(close_vals) - 1
                std = float(np.std(close_vals[max(0, idx-20):idx+1]) / close_vals[idx]) if close_vals[idx] != 0 else 0
                features[3] = std
                features[4] = float(close_vals[idx] / close_vals[max(0, idx-5)] - 1) if idx >= 5 else 0
            X.append(features)
            y.append(1 if t.pnl > 0 else 0)

        if len(X) < 5:
            return None, None
        return np.array(X), np.array(y)

    def train(self, df):
        self._training = True
        try:
            X, y = self._build_training_data(df)
            if X is None or len(X) < 5:
                self._training = False
                return {"status": "error", "message": f"Need at least 5 closed trades, got {len(X) if X is not None else 0}"}

            old_accuracy = self._last_accuracy
            old_trades = self._last_train_trades

            self.scaler = StandardScaler()
            X_scaled = self.scaler.fit_transform(X)

            self.model = LogisticRegression(max_iter=1000, random_state=42)
            self.model.fit(X_scaled, y)

            acc = self.model.score(X_scaled, y)
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
            }
        except Exception as e:
            self._training = False
            return {"status": "error", "message": str(e)}

    def predict(self, df):
        if self.model is None or len(df) < 26:
            return 0, 0.0
        features = self._extract_features(df)
        try:
            X = np.array([features])
            X_scaled = self.scaler.transform(X)
            prob = self.model.predict_proba(X_scaled)[0]
            if len(prob) < 2:
                return 0, 0.0
            if prob[1] > 0.55:
                return 1, round(float(prob[1]), 2)
            if prob[0] > 0.55:
                return -1, round(float(prob[0]), 2)
            return 0, round(float(max(prob)), 2)
        except Exception:
            return 0, 0.0

    def get_info(self):
        return {
            "trained": self._last_train_time is not None,
            "last_train_time": self._last_train_time,
            "trades_used": self._last_train_trades,
            "accuracy": round(self._last_accuracy, 3) if self._last_accuracy else 0,
            "improvement": round(self._last_improvement, 3),
            "training": self._training,
        }


ml_model = MLModel()