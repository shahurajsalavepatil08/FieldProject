import { Warning, WarningOctagon, CheckCircle } from "@phosphor-icons/react";

export default function StatusBanner({ status, machineName, timestamp }) {
  const cfg = {
    NORMAL: { color: "var(--status-normal)", Icon: CheckCircle, label: "ALL SYSTEMS NOMINAL" },
    WARNING: { color: "var(--status-warning)", Icon: Warning, label: "ANOMALY DETECTED" },
    CRITICAL: { color: "var(--status-critical)", Icon: WarningOctagon, label: "CRITICAL — IMMEDIATE ACTION" },
  }[status] || { color: "var(--text-2)", Icon: CheckCircle, label: "--" };
  const { Icon } = cfg;
  return (
    <div
      data-testid="status-banner"
      className="panel p-4 flex items-center justify-between"
      style={{ borderLeft: `4px solid ${cfg.color}` }}
    >
      <div className="flex items-center gap-3">
        <Icon size={26} style={{ color: cfg.color }} weight="bold"/>
        <div>
          <div className="mono text-[10px] tracking-[0.3em] text-white/50">SYSTEM STATUS</div>
          <div className="text-xl font-bold" style={{ color: cfg.color }}>{cfg.label}</div>
        </div>
      </div>
      <div className="text-right hidden sm:block">
        <div className="mono text-[10px] tracking-widest text-white/50">{machineName}</div>
        <div className="mono text-[11px] text-white/70">{timestamp?.slice(11, 19)} UTC</div>
      </div>
    </div>
  );
}
