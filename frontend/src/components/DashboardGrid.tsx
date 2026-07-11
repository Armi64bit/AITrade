import { useEffect, useState, useCallback, type ReactNode } from "react";
import { Responsive as ResponsiveGrid } from "react-grid-layout";
import "react-grid-layout/css/styles.css";

interface Widget {
  key: string;
  content: ReactNode;
  minW?: number;
  minH?: number;
}

interface DashboardGridProps {
  widgets: Widget[];
  defaultLayout: { lg: { i: string; x: number; y: number; w: number; h: number }[] };
  className?: string;
}

const LS_KEY = "aitrader_grid_layout";

export function DashboardGrid({ widgets, defaultLayout, className }: DashboardGridProps) {
  const [mounted, setMounted] = useState(false);
  const [layout, setLayout] = useState(() => {
    if (typeof window === "undefined") return defaultLayout;
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return defaultLayout;
  });

  useEffect(() => { setMounted(true); }, []);

  const handleLayoutChange = useCallback((_layout: any, layouts: any) => {
    setLayout(layouts);
    localStorage.setItem(LS_KEY, JSON.stringify(layouts));
  }, []);

  if (!mounted) {
    return (
      <div className="space-y-4">
        {widgets.map((w) => (
          <div key={w.key} className="min-h-[100px]">{w.content}</div>
        ))}
      </div>
    );
  }

  return (
    <ResponsiveGrid
      className={`layout ${className || ""}`}
      layouts={layout}
      breakpoints={{ lg: 1024, md: 768, sm: 0 }}
      cols={{ lg: 12, md: 6, sm: 4 }}
      rowHeight={120}
      onLayoutChange={handleLayoutChange}
      isResizable={true}
      compactType="vertical"
      margin={[16, 16]}
    >
      {widgets.map((w) => (
        <div key={w.key} className="relative group min-h-[60px]">
          <div className="absolute top-0.5 left-0.5 z-10 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <span className="w-3 h-0.5 rounded bg-slate-600" />
            <span className="w-3 h-0.5 rounded bg-slate-600" />
            <span className="w-3 h-0.5 rounded bg-slate-600" />
          </div>
          {w.content}
        </div>
      ))}
    </ResponsiveGrid>
  );
}
