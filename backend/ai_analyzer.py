import json
from config import OPENROUTER_API_KEY

client = None
MODEL = "deepseek/deepseek-chat-v3-0324:free"

if OPENROUTER_API_KEY:
    try:
        from openai import OpenAI
        client = OpenAI(
            base_url="https://openrouter.ai/api/v1",
            api_key=OPENROUTER_API_KEY,
        )
    except Exception:
        client = None

SYSTEM_PROMPT = """You are a crypto trading assistant. Output ONLY a 2-3 sentence plain-English market summary. Never explain what you're doing. Never use markdown. Never use first-person. Just state the facts and what to expect. Be direct."""


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

    lines.append("\nWhat is happening right now and what to expect next?")

    return "\n".join(line for line in lines if line)


_analysis_cache = {"data_hash": None, "result": None}


def _hash(data: dict) -> str:
    pos = data.get("position")
    pos_str = f"{pos['side']}_{pos['entry_price']:.2f}_{(pos.get('unrealized_pnl') or 0):.2f}" if pos else "none"
    return f"{(data.get('price') or 0):.0f}_{(data.get('rsi') or 0):.0f}_{pos_str}"


async def generate_analysis(market_data: dict) -> str | None:
    if not client:
        return "⚠️ OpenRouter API key not configured. Set OPENROUTER_API_KEY in Railway env vars."

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
            max_tokens=200,
            temperature=0.7,
            timeout=30,
        )
        if not resp.choices:
            print(f"OpenRouter: no choices, full response: {resp}")
            return "⚠️ AI returned no choices."
        choice = resp.choices[0]
        if not choice.message:
            print(f"OpenRouter: no message in choice, finish_reason={choice.finish_reason}, full: {choice}")
            return "⚠️ AI returned empty message."
        content = choice.message.content
        if not content:
            print(f"OpenRouter: empty content, finish_reason={choice.finish_reason}, full message: {choice.message}")
            # Try to extract from other fields if available
            if hasattr(choice.message, 'reasoning'):
                return choice.message.reasoning.strip()
            return "⚠️ AI returned empty content."
        text = content.strip()
        # Strip reasoning traces: take only after the last  or "response" marker
        for marker in [" response", " response", "Summary:", "summary:"]:
            if marker in text:
                parts = text.split(marker)
                text = parts[-1].strip()
        _analysis_cache["data_hash"] = h
        _analysis_cache["result"] = text
        return text
    except Exception as e:
        print(f"OpenRouter error: {e}")
        return f"⚠️ AI error: {e}"
