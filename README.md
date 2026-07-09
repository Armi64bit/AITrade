# AiTrader

Self-improving AI crypto trading bot with real Binance market data, ensemble strategy voting, paper trading, and a React dashboard.

![CI/CD](https://github.com/Armi64bit/AITrade/actions/workflows/ci.yml/badge.svg)
[![Frontend](https://img.shields.io/badge/frontend-Vercel-000?logo=vercel)](https://ai-trade-lilac.vercel.app)
[![Backend](https://img.shields.io/badge/backend-Railway-7c3aed?logo=railway)](https://aitrade-production-ecba.up.railway.app)

## Architecture

```
frontend/          React + TypeScript + Vite + Tailwind CSS + shadcn/ui + React Bits
backend/           FastAPI + CCXT + SQLAlchemy + Optuna + Prometheus
monitoring/        Prometheus + Grafana dashboards
```

### Key Features

- **AI Trading Signals** — OpenRouter-powered structured BUY/SELL/HOLD/WAIT signals with entry, stop-loss, take-profit, and reasoning
- **Ensemble Strategy Voting** — 4 independent strategies (EMA Crossover, RSI Reversal, Bollinger Squeeze, Momentum) with weighted voting, dynamic weight adjustment based on per-strategy win rate
- **Auto-Optimize** — Self-triggering hyperparameter optimization (Optuna) when win rate drops below 35%, avg P&L negative, or ensemble confidence too low
- **Paper Trading** — Virtual balance tracking, real Binance market data via public REST API (CCXT fallback), no real orders
- **15 Trading Pairs** — BTC, ETH, SOL, DOGE, PEPE, and more
- **Animated UI** — React Bits Aurora background, LiquidChrome loading, SpotlightCard, StarBorder, PixelCard effects

## Local Development

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env  # add your keys
uvicorn main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## DevOps

### CI/CD Pipeline (GitHub Actions)
- **Lint** — Ruff (Python), TypeScript type checking, Vite build
- **Deploy** — Backend (Railway) + Frontend (Vercel) on main branch pushes

### Monitoring (Better Stack)
- `/metrics` endpoint exposes all bot metrics in Prometheus format
- Metrics push every 60s to **Better Stack** (free hosted Prometheus-compatible platform)
- GitHub login for team access — dashboards accessible anywhere
- See `monitoring/betterstack-setup.md` for setup instructions

Available metrics: balance, bot state, win rate, consecutive losses, ensemble confidence, trade P&L, HTTP request rates.

## Environment Variables
| Variable | Description |
|---|---|
| `BINANCE_API_KEY` | Binance API key |
| `BINANCE_SECRET_KEY` | Binance secret key |
| `BINANCE_TESTNET` | `true` or `false` |
| `OPENROUTER_API_KEY` | OpenRouter key for AI signals |
| `BETTERSTACK_TOKEN` | Better Stack Telemetry source token |

## Tech Stack
- **Frontend:** React 19, TypeScript 6, Vite 8, Tailwind CSS v4, shadcn/ui, React Bits, Lightweight Charts
- **Backend**: FastAPI, CCXT, SQLAlchemy, Optuna, Prometheus client
- **Deployment**: Railway (backend), Vercel (frontend)
- **Monitoring**: Better Stack (hosted Prometheus)