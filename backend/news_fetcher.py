import json
import time
import urllib.request
import urllib.error

NEWS_URL = "https://min-api.cryptocompare.com/data/v2/news/?lang=EN&extraParams=aitrader"
CACHE_DURATION = 1800
_SOURCES = ["CoinDesk", "Cointelegraph", "CoinMarketCap", "Binance", "Decrypt", "CryptoSlate", "The Block", "Bitcoin.com"]

_cache = {"data": None, "ts": 0.0}


def _extract_body(item: dict) -> str:
    raw = item.get("body", "")
    if not raw:
        return ""
    # Take first ~120 chars
    clean = raw.replace("<br />", " ").replace("<br/>", " ").replace("<p>", "").replace("</p>", "")
    return clean[:120] + ("..." if len(clean) > 120 else "")


def fetch_news() -> list[dict]:
    now = time.time()
    if _cache["data"] and (now - _cache["ts"]) < CACHE_DURATION:
        return _cache["data"]

    try:
        req = urllib.request.Request(NEWS_URL, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=10) as resp:
            raw = json.loads(resp.read().decode())

        items = []
        for item in raw.get("Data", []):
            source = item.get("source", "")
            if source not in _SOURCES:
                continue
            items.append({
                "title": item.get("title", ""),
                "source": source,
                "url": item.get("url", ""),
                "published_at": item.get("published_on", 0),
                "summary": _extract_body(item),
            })
            if len(items) >= 5:
                break

        _cache["data"] = items
        _cache["ts"] = now
        return items
    except Exception as e:
        print(f"News fetch error: {e}")
        return _cache.get("data") or []


def get_news_headlines() -> str:
    news = fetch_news()
    if not news:
        return ""
    lines = ["Recent crypto news:"]
    for n in news:
        lines.append(f"- {n['title']} ({n['source']})")
    return "\n".join(lines)
