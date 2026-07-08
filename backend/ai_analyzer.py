from config import OPENROUTER_API_KEY

client = None
MODEL = "mistralai/mistral-7b-instruct:free"

if OPENROUTER_API_KEY:
    try:
        from openai import OpenAI
        client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=OPENROUTER_API_KEY,
        )
    except Exception:
        client = None

SYSTEM_PROMPT = """You are a crypto trading assistant analyzing live market data. 
Explain what's happening in simple language a beginner can understand. Be direct and practical.
Keep your response to 3-4 short sentences. No markdown. No jargon."""


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

    lines.append("\nWhat is the market doing? Give me a short plain-English summary and what to expect next.")

    return "\n".join(line for line in lines if line)


_analysis_cache = {"data_hash": None, "result": None}


def _hash(data: dict) -> str:
    pos = data.get("position")
    pos_str = f"{pos['side']}_{pos['entry_price']:.2f}_{pos.get('unrealized_pnl', 0):.2f}" if pos else "none"
    return f"{data.get('price', 0):.0f}_{data.get('rsi', 0):.0f}_{pos_str}"


async def generate_analysis(market_data: dict) -> str | None:
    if not client:
        return "⚠️ OpenRouter API key not configured. Set OPENROUTER_API_KEY in Railway env vars."

    h = _hash(market_data)
    if _analysis_cache["data_hash"] == h and _analysis_cache["result"]:
        return _analysis_cache["result"]

    try:
        prompt = build_prompt(market_data)
        response = client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            max_tokens=200,
            temperature=0.7,
            timeout=15,
        )
        text = response.choices[0].message.content.strip()
        _analysis_cache["data_hash"] = h
        _analysis_cache["result"] = text
        return text
    except Exception as e:
        print(f"OpenRouter error: {e}")
        return f"⚠️ AI error: {e}"
