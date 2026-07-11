import { useEffect, useState, useCallback, type ReactNode } from "react";
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

  const handleLayoutChange = useCallback((newLayout: any) => {
    setLayout((prev: any) => {
      const merged = { ...prev };
      merged.lg = newLayout;
      localStorage.setItem(LS_KEY, JSON.stringify(merged));
      return merged;
    });
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
    <GridLayout
      className={`layout ${className || ""}`}
      layouts={layout}
      breakpoints={{ lg: 1024, md: 768, sm: 0 }}
      cols={{ lg: 12, md: 6, sm: 4 }}
      rowHeight={120}
      onLayoutChange={handleLayoutChange}
      draggableHandle=".drag-handle"
      isResizable={true}
      compactType="vertical"
      margin={[16, 16]}
    >
      {widgets.map((w) => (
        <div key={w.key} className="relative group min-h-[60px]">
          <div className="drag-handle absolute top-0 left-0 right-0 h-6 z-10 cursor-grab active:cursor-grabbing flex items-center px-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex gap-1">
              <span className="w-4 h-0.5 rounded bg-slate-600" />
              <span className="w-4 h-0.5 rounded bg-slate-600" />
              <span className="w-4 h-0.5 rounded bg-slate-600" />
            </div>
          </div>
          {w.content}
        </div>
      ))}
    </GridLayout>
  );
}
