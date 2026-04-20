import { motion } from "framer-motion";

export default function HealthGauge({ value = 0, status = "NORMAL" }) {
  const v = Math.max(0, Math.min(100, value));
  const color = status === "CRITICAL" ? "var(--status-critical)"
              : status === "WARNING" ? "var(--status-warning)"
              : "var(--status-normal)";
  const r = 70, c = 2 * Math.PI * r;
  const offset = c - (v / 100) * c;
  return (
    <div className="panel p-6 flex flex-col lg:flex-row items-center gap-6" data-testid="health-gauge">
      <div className="relative w-[180px] h-[180px]">
        <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
          <circle cx="80" cy="80" r={r} stroke="var(--border)" strokeWidth="10" fill="none"/>
          <motion.circle
            cx="80" cy="80" r={r}
            stroke={color} strokeWidth="10" fill="none"
            strokeDasharray={c}
            initial={false}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            strokeLinecap="butt"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="mono text-[10px] tracking-[0.3em] text-white/50">HEALTH</div>
          <div className="metric-num text-5xl" style={{ color }} data-testid="health-value">
            {v.toFixed(0)}<span className="text-xl">%</span>
          </div>
        </div>
      </div>
      <div className="flex-1 space-y-3">
        <div className="mono text-[10px] tracking-[0.3em] text-white/50">MACHINE STATUS</div>
        <div className="text-3xl font-bold" style={{ color }}>{status}</div>
        <p className="text-sm text-white/60 leading-relaxed max-w-sm">
          {status === "NORMAL" && "All telemetry within operational envelope. No intervention required."}
          {status === "WARNING" && "Drift detected across one or more channels. Schedule inspection."}
          {status === "CRITICAL" && "Critical threshold breach. Immediate field-engineer dispatch recommended."}
        </p>
        <div className="flex gap-4 mono text-[10px] text-white/50 tracking-widest pt-2">
          <span>UPTIME 99.2%</span>
          <span>MTBF 214H</span>
          <span>LAST SVC 12D</span>
        </div>
      </div>
    </div>
  );
}
