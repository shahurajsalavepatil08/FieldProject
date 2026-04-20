import { motion } from "framer-motion";

const STATUS = {
  normal: { color: "var(--status-normal)", label: "NOMINAL" },
  warning: { color: "var(--status-warning)", label: "WARNING" },
  critical: { color: "var(--status-critical)", label: "CRITICAL" },
};

function sensorStatus(value, warn, crit) {
  if (value >= crit) return "critical";
  if (value >= warn) return "warning";
  return "normal";
}

export default function SensorCard({ icon: Icon, label, value, unit, warn, crit, testid }) {
  const st = sensorStatus(value, warn, crit);
  const cfg = STATUS[st];
  return (
    <motion.div
      data-testid={testid}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`panel p-5 relative overflow-hidden ${st === "critical" ? "crit-flash" : ""}`}
    >
      <div className="absolute top-0 left-0 h-[3px] w-full" style={{ background: cfg.color }}/>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Icon size={20} className="text-white/60"/>
          <span className="mono text-[10px] tracking-[0.25em] text-white/60">{label}</span>
        </div>
        <span className="chip" style={{ borderColor: cfg.color, color: cfg.color }}>
          <span className="pulse-dot" style={{ background: cfg.color, color: cfg.color }}/>
          {cfg.label}
        </span>
      </div>
      <div className="mt-6 flex items-baseline gap-2">
        <motion.span
          key={value}
          initial={{ opacity: 0.5 }}
          animate={{ opacity: 1 }}
          className="metric-num text-5xl"
          style={{ color: cfg.color }}
          data-testid={`${testid}-value`}
        >
          {value?.toFixed(1) ?? "--"}
        </motion.span>
        <span className="mono text-sm text-white/50">{unit}</span>
      </div>
      <div className="mt-3 h-1 bg-[var(--bg)] relative">
        <div className="absolute inset-y-0 left-0" style={{
          width: `${Math.min(100, (value / crit) * 100)}%`, background: cfg.color,
        }}/>
        <div className="absolute inset-y-[-2px] w-[1px] bg-white/30"
             style={{ left: `${(warn / crit) * 100}%` }} title="warn"/>
      </div>
      <div className="mt-2 flex justify-between mono text-[10px] text-white/40">
        <span>0</span>
        <span>warn {warn}</span>
        <span>crit {crit}</span>
      </div>
    </motion.div>
  );
}
