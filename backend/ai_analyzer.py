import json
import re
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

SYSTEM_PROMPT = """You are a crypto trading signal generator. Analyze the market data and output a trading signal as valid JSON only. No markdown, no explanation, no thinking. Just the JSON object.

{
  "signal": "BUY" or "SELL" or "HOLD" or "WAIT",
  "entry": "entry price or range string",
  "stop_loss": "stop loss price string",
  "take_profit": "take profit target string",
  "confidence": 0-100,
  "reasoning": "1-2 sentence explanation of the setup"
}"""


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

    lines.append("\nBased on this data, what is your trading signal? Output JSON only.")

    return "\n".join(line for line in lines if line)


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
