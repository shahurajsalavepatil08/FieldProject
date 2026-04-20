import { BellRinging } from "@phosphor-icons/react";

export default function AlertsList({ alerts }) {
  return (
    <div className="panel p-5" data-testid="alerts-list">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BellRinging size={18} className="text-[var(--primary)]"/>
          <div>
            <div className="mono text-[10px] tracking-[0.3em] text-white/50">EVENT LOG</div>
            <div className="text-sm font-semibold">Alert history</div>
          </div>
        </div>
        <span className="mono text-[10px] text-white/40">{alerts.length} events</span>
      </div>
      <div className="max-h-[340px] overflow-auto space-y-2 pr-1">
        {alerts.length === 0 && (
          <div className="mono text-[11px] text-white/40 py-8 text-center tracking-widest">
            NO ALERTS IN WINDOW
          </div>
        )}
        {alerts.map((a) => {
          const isCrit = a.type === "critical";
          const color = isCrit ? "var(--status-critical)" : "var(--status-warning)";
          return (
            <div key={a.id}
              data-testid={`alert-${a.id}`}
              className="border-l-2 pl-3 py-2 pr-2 bg-[var(--bg)]"
              style={{ borderColor: color }}>
              <div className="flex items-center justify-between">
                <span className="chip" style={{ borderColor: color, color }}>
                  {a.type.toUpperCase()}
                </span>
                <span className="mono text-[10px] text-white/40">{a.timestamp?.slice(11, 19)}</span>
              </div>
              <div className="text-sm mt-1.5">{a.message}</div>
              <div className="mono text-[10px] text-white/40 mt-1">{a.machine_name || a.machine_id}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
