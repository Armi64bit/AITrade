# Better Stack Monitoring Setup

## 1. Create Account
1. Go to https://betterstack.com and sign up with GitHub
2. Navigate to **Telemetry** section

## 2. Get Source Token
1. In Telemetry, click **"Add source"** → **"Prometheus"**
2. Copy the source token
3. Add it to Railway as env var: `BETTERSTACK_TOKEN`

## 3. View Metrics
Metrics push automatically every 60s from the backend
to `https://telemetry.betterstack.com/api/v1/write`.

Available metrics (prefixed with `aitrader_`):
- `aitrader_balance_usdt` — Virtual balance
- `aitrader_bot_running` — 1 if running, 0 if stopped
- `aitrader_open_position` — 1 if in a position, 0 otherwise
- `aitrader_optimizing` — 1 if optimizer is running
- `aitrader_win_rate` — Win rate over last 30 trades
- `aitrader_consecutive_losses` — Losing streak count
- `aitrader_ensemble_confidence` — Signal confidence (0-1)
- `aitrader_last_price{symbol="BTC/USDT"}` — Last price per pair
- `aitrader_trades_total{side="buy",status="closed"}` — Trade count
- `aitrader_trade_pnl{trade_id="1"}` — P&L per trade
- `aitrader_trade_pnl_pct{trade_id="1"}` — P&L % per trade
- `aitrader_http_requests_total{method="GET",path="/api/status",status="200"}` — Request count

## 4. Build Dashboards (from Better Stack UI)
Create charts for:
- **Bot Health**: bot_running, open_position, optimizing
- **Performance**: balance_usdt, win_rate, consecutive_losses
- **Signals**: ensemble_confidence, last_price
- **Trades**: trades_total, trade_pnl, trade_pnl_pct
- **API**: rate(aitrader_http_requests_total[5m])

## 5. Team Access
- Go to **Team Settings** in Better Stack
- Invite team members via GitHub
- They log in with their own GitHub account