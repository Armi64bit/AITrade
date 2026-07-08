import { XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";

interface Candle {
  time: number;
  close: number;
}

export function PriceChart({ data }: { data: Candle[] }) {
  if (data.length === 0) {
    return <div className="card h-64 flex items-center justify-center text-slate-500">Waiting for price data...</div>;
  }

  const chartData = data.slice(-100).map((d) => ({
    t: new Date(d.time).toLocaleTimeString(),
    p: d.close,
  }));

  const first = chartData[0]?.p ?? 0;
  const last = chartData[chartData.length - 1]?.p ?? 0;
  const color = last >= first ? "#22c55e" : "#ef4444";

  return (
    <div className="card h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={chartData}>
          <defs>
            <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.2} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis dataKey="t" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} />
          <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} width={60} />
          <Tooltip
            contentStyle={{ background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 8 }}
            labelStyle={{ color: "#e2e8f0" }}
          />
          <Area type="monotone" dataKey="p" stroke={color} fill="url(#grad)" strokeWidth={2} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
