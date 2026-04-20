import { Factory } from "@phosphor-icons/react";

export default function MachineSelector({ machines, active, onSelect }) {
  return (
    <div className="panel p-4" data-testid="machine-selector">
      <div className="mono text-[10px] tracking-[0.3em] text-white/50 mb-3">SELECT MACHINE</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        {machines.map((m) => {
          const isActive = m.id === active;
          return (
            <button key={m.id} onClick={() => onSelect(m.id)}
              data-testid={`machine-${m.id}-btn`}
              className={`text-left p-3 border transition-all ${
                isActive
                  ? "border-[var(--primary)] bg-[var(--surface-hover)]"
                  : "border-[var(--border)] hover:border-white/30"
              }`}>
              <div className="flex items-center justify-between">
                <Factory size={16} className={isActive ? "text-[var(--primary)]" : "text-white/50"}/>
                <span className="mono text-[10px] text-white/40">{m.id.toUpperCase()}</span>
              </div>
              <div className="mt-2 font-semibold text-sm">{m.name}</div>
              <div className="mono text-[10px] text-white/50 tracking-wider">{m.location}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
