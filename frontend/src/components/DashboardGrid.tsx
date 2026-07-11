import { useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import GridLayout from "react-grid-layout";
import "react-grid-layout/css/styles.css";

interface Widget {
  key: string;
  content: ReactNode;
  minW?: number;
  minH?: number;
}

interface DashboardGridProps {
  widgets: Widget[];
  defaultLayout: { i: string; x: number; y: number; w: number; h: number }[];
  className?: string;
}

const LS_KEY = "aitrader_grid_layout";

function useWidth(): number {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setWidth(e.contentRect.width);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return width;
}

function useCols(): number {
  const [cols, setCols] = useState(12);
  useEffect(() => {
    const mq = (w: number) => {
      if (w >= 1024) return 12;
      if (w >= 768) return 8;
      return 4;
    };
    setCols(mq(window.innerWidth));
    const handler = () => setCols(mq(window.innerWidth));
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);
  return cols;
}

export function DashboardGrid({ widgets, defaultLayout, className }: DashboardGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const width = useWidth();
  const cols = useCols();
  const [mounted, setMounted] = useState(false);
  const [layout, setLayout] = useState(() => {
    if (typeof window === "undefined") return defaultLayout;
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.lg || parsed;
      }
    } catch {}
    return defaultLayout;
  });

  useEffect(() => { setMounted(true); }, []);

  const handleLayoutChange = useCallback((newLayout: any) => {
    setLayout(newLayout);
    localStorage.setItem(LS_KEY, JSON.stringify({ lg: newLayout }));
  }, []);

  if (!mounted || width === 0) {
    return (
      <div className="space-y-4" ref={containerRef}>
        {widgets.map((w) => (
          <div key={w.key} className="min-h-[100px]">{w.content}</div>
        ))}
      </div>
    );
  }

  return (
    <div ref={containerRef}>
      <GridLayout
        className={`layout ${className || ""}`}
        layout={layout}
        cols={cols}
        width={width}
        rowHeight={cols >= 8 ? 120 : 100}
        onLayoutChange={handleLayoutChange}
        isResizable={cols >= 8}
        compactType="vertical"
        margin={[16, 16]}
      >
        {widgets.map((w) => (
          <div key={w.key} className="relative group min-h-[60px] overflow-hidden rounded-2xl">
            <div className="absolute top-0.5 left-0.5 z-10 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <span className="w-3 h-0.5 rounded bg-slate-600" />
              <span className="w-3 h-0.5 rounded bg-slate-600" />
              <span className="w-3 h-0.5 rounded bg-slate-600" />
            </div>
            {w.content}
          </div>
        ))}
      </GridLayout>
    </div>
  );
}
