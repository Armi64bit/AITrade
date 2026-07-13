import json
import re
import urllib.request
from config import OPENROUTER_API_KEY, SYMBOLS

client = None
MODEL = "openrouter/free"

if OPENROUTER_API_KEY:
    try:
        from openai import OpenAI
        client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=OPENROUTER_API_KEY,
        )
    except Exception:
        client = None

SYSTEM_PROMPT = """You are a crypto trading signal generator. Analyze the market data and output ONLY a JSON object with these exact fields. No other text, no thinking, no markdown.

{"signal":"BUY or SELL or HOLD or WAIT","entry":"entry price or range","stop_loss":"stop loss price","take_profit":"take profit target","confidence":0-100,"reasoning":"1-2 sentence setup explanation"}"""


def build_prompt(data: dict) -> str:
    position = data.get("position")
    rsi = data.get("rsi")
    ema_s = data.get("ema_short")
    ema_l = data.get("ema_long")
    price = data.get("price")
    win_rate = data.get("win_rate")
    recent_pnl = data.get("recent_pnl")
    consec_losses = data.get("consecutive_losses", 0)
    balance = data.get("balance")
    total_trades = data.get("total_trades", 0)
    news = data.get("news", "")

    lines = [
        f"Current price: ${price:,.2f}" if price else "",
        f"RSI (14): {rsi:.1f}" if rsi is not None else "",
        f"Fast EMA: {ema_s:.2f}, Slow EMA: {ema_l:.2f}" if ema_s and ema_l else "",
        f"Balance: ${balance:,.2f}" if balance else "",
    ]
    if position:
        pnl = position.get("unrealized_pnl")
        lines.append(f"In a {position['side'].upper()} position, entered at ${position['entry_price']:,.2f}")
        if pnl is not None:
            lines.append(f"Unrealized P&L: {pnl:+.2f}%")
    else:
        lines.append("No open position")

    if total_trades > 0:
        lines.append(f"Total trades: {total_trades}, Win rate: {win_rate*100:.0f}%")
    if consec_losses >= 2:
        lines.append(f"Warning: {consec_losses} consecutive losses")
    if recent_pnl is not None:
        lines.append(f"Recent trade P&L: {recent_pnl:+.2f}%")
    if news:
        lines.append(f"\n--- Market News ---\n{news}")

    lines.append("\nWhat is your trading signal? Output JSON only.")

    return "\n".join(line for line in lines if line)


async def fetch_pair_data(symbol: str) -> dict:
    """Fetch current market data for a pair from Binance"""
    try:
        sym = symbol.replace("/", "")
        url = f"https://api.binance.com/api/v3/ticker/24hr?symbol={sym}"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode())
        
        # Also get klines for indicators
        url2 = f"https://api.binance.com/api/v3/klines?symbol={sym}&interval=1h&limit=200"
        req2 = urllib.request.Request(url2, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req2, timeout=5) as resp2:
            klines = json.loads(resp2.read().decode())
        
        closes = [float(k[4]) for k in klines]
        volumes = [float(k[5]) for k in klines]
        highs = [float(k[2]) for k in klines]
        lows = [float(k[3]) for k in klines]
        
        # Calculate basic indicators
        import numpy as np
        import pandas as pd
        df = pd.DataFrame({"close": closes, "high": highs, "low": lows, "volume": volumes})
        
        ema_s = df["close"].ewm(span=7, adjust=False).mean().iloc[-1]
        ema_l = df["close"].ewm(span=25, adjust=False).mean().iloc[-1]
        
        delta = df["close"].diff()
        gain = delta.where(delta > 0, 0)
        loss = -delta.where(delta < 0, 0)
        avg_g = gain.rolling(14).mean()
        avg_l = loss.rolling(14).mean()
        rs = avg_g / avg_l.replace(0, np.nan)
        rsi = 100 - (100 / (1 + rs))
        
        price_change_pct = float(data["priceChangePercent"])
        volume = float(data["volume"])
        
        return {
            "symbol": symbol,
            "price": float(data["lastPrice"]),
            "price_change_24h": price_change_pct,
            "volume_24h": volume,
            "rsi": float(rsi.iloc[-1]) if len(rsi) > 0 else 50,
            "ema_short": float(ema_s),
            "ema_long": float(ema_l),
            "trend": "up" if closes[-1] > ema_s > ema_l else "down" if closes[-1] < ema_s < ema_l else "neutral",
        }
    except Exception as e:
        print(f"Error fetching {symbol}: {e}")
        return None


async def recommend_best_pair(current_symbol: str, trader_performance: dict) -> str:
    """Use AI to recommend the best pair to trade based on market conditions and performance"""
    if not client:
        return "SOL/USDT"  # default fallback
    
    # Fetch data for top pairs
    pairs_data = []
    for sym in SYMBOLS[:8]:  # Limit to top 8 to save API calls
        if sym == current_symbol:
            continue
        data = await fetch_pair_data(sym)
        if data:
            pairs_data.append(data)
    
    if not pairs_data:
        return current_symbol
    
    # Build prompt for AI
    prompt = f"""Current pair: {current_symbol}
Current performance: Win rate {trader_performance.get('win_rate', 0)*100:.0f}%, 
Recent P&L: {trader_performance.get('recent_pnl', 0):+.2f}%, 
Consecutive losses: {trader_performance.get('consecutive_losses', 0)}

Available pairs with market data:
"""
    for p in pairs_data:
        prompt += f"- {p['symbol']}: Price ${p['price']:,.2f} ({p['price_change_24h']:+.2f}%), RSI {p['rsi']:.0f}, Trend: {p['trend']}\n"
    
    prompt += """
Which pair should we trade for the BEST opportunity right now? Consider:
1. Strong trending pairs (up for longs)
2. Not overbought (RSI < 70) 
3. Good volume
4. Different from current if current is losing

Respond with ONLY the pair symbol (e.g., "ETH/USDT")"""
    
    try:
        resp = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": "You are a crypto pair selector. Output ONLY the pair symbol."},
                {"role": "user", "content": prompt},
            ],
            max_tokens=20,
            temperature=0.3,
            timeout=15,
        )
        if resp.choices and resp.choices[0].message.content:
            suggested = resp.choices[0].message.content.strip().upper()
            if "/" in suggested and suggested in SYMBOLS:
                return suggested
    except Exception as e:
        print(f"AI pair recommendation error: {e}")
    
    # Fallback: pick best trending pair with RSI < 70
    for p in pairs_data:
        if p["trend"] == "up" and p["rsi"] < 70:
            return p["symbol"]
    
    return current_symbol


_analysis_cache = {"data_hash": None, "result": None}

DEFAULT_SIGNAL = {
    "signal": "WAIT",
    "entry": "—",
    "stop_loss": "—",
    "take_profit": "—",
    "confidence": 0,
    "reasoning": "No signal available.",
}


def _hash(data: dict) -> str:
    pos = data.get("position")
    pos_str = f"{pos['side']}_{pos['entry_price']:.2f}_{(pos.get('unrealized_pnl') or 0):.2f}" if pos else "none"
    return f"{(data.get('price') or 0):.0f}_{(data.get('rsi') or 0):.0f}_{pos_str}"


def _parse_signal(text: str) -> dict:
    # Try to extract JSON from the response
    try:
        # Find JSON block - between { and }
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            data = json.loads(match.group())
            return {
                "signal": str(data.get("signal", "WAIT")).upper(),
                "entry": str(data.get("entry", "—")),
                "stop_loss": str(data.get("stop_loss", "—")),
                "take_profit": str(data.get("take_profit", "—")),
                "confidence": min(max(int(data.get("confidence", 0)), 0), 100),
                "reasoning": str(data.get("reasoning", "")),
            }
    except Exception:
        pass
    # Fallback: try to parse labeled lines
    result = dict(DEFAULT_SIGNAL)
    for line in text.split("\n"):
        line = line.strip()
        for key in ("signal", "entry", "stop_loss", "take_profit", "confidence", "reasoning"):
            if line.lower().startswith(key.lower().replace("_", "")) or line.lower().startswith(key.lower()):
                val = line.split(":", 1)[-1].strip() if ":" in line else line.split(" ", 1)[-1].strip()
                if key == "signal":
                    for s in ("BUY", "SELL", "HOLD", "WAIT"):
                        if s in val.upper():
                            result[key] = s
                            break
                elif key == "confidence":
                    match = re.search(r"\d+", val)
                    if match:
                        result[key] = min(max(int(match.group()), 0), 100)
                else:
                    result[key] = val
    if result != DEFAULT_SIGNAL:
        return result
    # Last resort: use raw text as reasoning
    return {**DEFAULT_SIGNAL, "reasoning": text[:200]}


async def generate_analysis(market_data: dict) -> dict:
    if not client:
        return {**DEFAULT_SIGNAL, "reasoning": "⚠️ OpenRouter API key not configured."}

    h = _hash(market_data)
    if _analysis_cache["data_hash"] == h and _analysis_cache["result"]:
        return _analysis_cache["result"]

    try:
        prompt = build_prompt(market_data)
        resp = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            max_tokens=300,
            temperature=0.7,
            timeout=30,
        )
        if not resp.choices:
            return {**DEFAULT_SIGNAL, "reasoning": "⚠️ AI returned no choices."}
        choice = resp.choices[0]
        if not choice.message:
            return {**DEFAULT_SIGNAL, "reasoning": "⚠️ AI returned empty message."}
        content = choice.message.content
        if not content:
            return {**DEFAULT_SIGNAL, "reasoning": "⚠️ AI returned empty content."}
        text = content.strip()
        signal = _parse_signal(text)
        _analysis_cache["data_hash"] = h
        _analysis_cache["result"] = signal
        return signal
    except Exception as e:
        print(f"OpenRouter error: {e}")
        return {**DEFAULT_SIGNAL, "reasoning": f"⚠️ AI error: {e}"}
