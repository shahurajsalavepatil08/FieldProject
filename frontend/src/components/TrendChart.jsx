import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

const COLORS = {
  temperature: "#F97316",
  vibration: "#60A5FA",
  sound: "#A78BFA",
  current: "#A3E635",
};

export default function TrendChart({ data, keys = ["temperature", "vibration", "sound", "current"] }) {
  const fmt = data.map((d) => ({
    t: d.timestamp?.slice(11, 19),
    temperature: d.temperature,
    vibration: d.vibration,
    sound: d.sound,
    current: d.current,
  }));
  return (
    <div className="panel p-5" data-testid="trend-chart">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="mono text-[10px] tracking-[0.3em] text-white/50">LIVE TELEMETRY</div>
          <div className="text-lg font-semibold">Sensor trends</div>
        </div>
        <div className="flex items-center gap-2 chip" style={{ borderColor: "var(--status-normal)", color: "var(--status-normal)" }}>
          <span className="pulse-dot bg-[var(--status-normal)]"/>LIVE
        </div>
      </div>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={fmt} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="2 4" stroke="#262630" vertical={false}/>
            <XAxis dataKey="t" tick={{ fill: "#6B7280", fontSize: 10, fontFamily: "JetBrains Mono" }}
              axisLine={false} tickLine={false} minTickGap={30}/>
            <YAxis tick={{ fill: "#6B7280", fontSize: 10, fontFamily: "JetBrains Mono" }}
              axisLine={false} tickLine={false}/>
            <Tooltip
              contentStyle={{ background: "#0A0A0E", border: "1px solid #262630", fontFamily: "JetBrains Mono", fontSize: 11 }}
              labelStyle={{ color: "#9CA3AF" }}/>
            <Legend wrapperStyle={{ fontFamily: "JetBrains Mono", fontSize: 10, letterSpacing: "0.1em" }}/>
            {keys.map((k) => (
              <Line key={k} type="monotone" dataKey={k} stroke={COLORS[k]} strokeWidth={1.5}
                dot={false} isAnimationActive={false}/>
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
