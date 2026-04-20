import { motion } from "framer-motion";
import { Robot, ArrowsClockwise } from "@phosphor-icons/react";

const RISK = {
  LOW: { color: "var(--status-normal)", bg: "rgba(163,230,53,0.08)" },
  MEDIUM: { color: "var(--status-warning)", bg: "rgba(245,158,11,0.08)" },
  HIGH: { color: "var(--status-critical)", bg: "rgba(220,38,38,0.1)" },
  CRITICAL: { color: "var(--status-critical)", bg: "rgba(220,38,38,0.15)" },
};

export default function AIPanel({ insight, loading, onRefresh }) {
  const risk = RISK[insight?.risk_level] || RISK.LOW;
  return (
    <div className="panel p-5 h-full flex flex-col" data-testid="ai-panel">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 bg-[var(--primary)] grid place-items-center">
            <Robot size={16} weight="bold"/>
          </div>
          <div>
            <div className="mono text-[10px] tracking-[0.3em] text-white/50">AI DIAGNOSTIC</div>
            <div className="text-sm font-semibold">Maintenance Analyst</div>
          </div>
        </div>
        <button onClick={onRefresh} disabled={loading}
          data-testid="ai-refresh-btn" className="btn-ghost flex items-center gap-1">
          <ArrowsClockwise size={12} className={loading ? "animate-spin" : ""}/> RUN
        </button>
      </div>

      <div className="mono text-[10px] text-white/50 tracking-widest mb-2">
        $ analyze --machine={insight?.machine_id || "--"}
      </div>

      <motion.div
        key={insight?.headline || "empty"}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex-1 space-y-4"
      >
        <div className="border-l-2 pl-3" style={{ borderColor: risk.color, background: risk.bg }}>
          <div className="mono text-[10px] tracking-widest" style={{ color: risk.color }}>
            RISK {insight?.risk_level || "—"}
          </div>
          <div className="text-lg font-semibold mt-1" data-testid="ai-headline">
            {insight?.headline || (loading ? "Analyzing telemetry..." : "No analysis yet")}
          </div>
        </div>

        <div>
          <div className="mono text-[10px] tracking-widest text-white/50 mb-2">FINDINGS</div>
          <ul className="space-y-1.5">
            {(insight?.findings || []).map((f, i) => (
              <li key={i} className="flex gap-2 text-sm text-white/80">
                <span className="mono text-[var(--primary)]">{`>`}</span>
                <span>{f}</span>
              </li>
            ))}
            {!insight?.findings?.length && !loading && (
              <li className="text-sm text-white/40">— no findings —</li>
            )}
          </ul>
        </div>

        <div className="pt-2 border-t border-[var(--border)]">
          <div className="mono text-[10px] tracking-widest text-white/50 mb-2">RECOMMENDED ACTION</div>
          <p className="text-sm leading-relaxed" data-testid="ai-action">
            {insight?.action || "Awaiting sensor data..."}
          </p>
        </div>

        <div className="mono text-[10px] text-white/30 pt-2">
          source: {insight?.source === "llm" ? "CLAUDE SONNET 4.5" : "RULE ENGINE"}
        </div>
      </motion.div>
    </div>
  );
}
