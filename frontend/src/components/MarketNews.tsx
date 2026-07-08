import { useEffect, useState } from "react";
import { api } from "../api/client";

interface NewsItem {
  title: string;
  source: string;
  url: string;
  published_at: number;
  summary: string;
}

export function MarketNews() {
  const [news, setNews] = useState<NewsItem[]>([]);

  useEffect(() => {
    const fetch = async () => {
      try {
        const d = await api.getNews();
        setNews(d.news);
      } catch {}
    };
    fetch();
    const id = setInterval(fetch, 30000);
    return () => clearInterval(id);
  }, []);

  if (news.length === 0) return null;

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        <h3 className="text-lg font-semibold text-slate-200">Market News</h3>
      </div>
      <div className="space-y-2 text-xs max-h-64 overflow-y-auto">
        {news.map((item, i) => (
          <a
            key={i}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-2.5 rounded-lg border border-slate-700/50 hover:border-cyan-500/30 hover:bg-slate-800/30 transition-all"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-slate-200 font-medium leading-snug">{item.title}</span>
              <span className="text-[10px] text-slate-500 shrink-0">{item.source}</span>
            </div>
            {item.summary && (
              <p className="text-slate-500 mt-1 leading-relaxed">{item.summary}</p>
            )}
          </a>
        ))}
      </div>
    </div>
  );
}
