import { useEffect, useState } from "react";
import { api, downloadPdf } from "@/lib/api";
import TrendChart from "@/components/TrendChart";
import { DownloadSimple } from "@phosphor-icons/react";
import { toast } from "sonner";

const WINDOWS = [
  { label: "15 MIN", hours: 0.25 },
  { label: "1 HR", hours: 1 },
  { label: "6 HR", hours: 6 },
  { label: "24 HR", hours: 24 },
];

export default function History() {
  const [machines, setMachines] = useState([]);
  const [active, setActive] = useState("m1");
  const [hours, setHours] = useState(1);
  const [rows, setRows] = useState([]);
  const [keys, setKeys] = useState(["temperature", "vibration", "sound", "current"]);

  useEffect(() => {
    api.get("/machines").then((r) => {
      setMachines(r.data);
      if (r.data.length) setActive(r.data[0].id);
    });
  }, []);

  useEffect(() => {
    api.get(`/history?machine_id=${active}&hours=${hours}&limit=400`).then((r) => setRows(r.data));
  }, [active, hours]);

  const toggleKey = (k) =>
    setKeys((ks) => (ks.includes(k) ? ks.filter((x) => x !== k) : [...ks, k]));

  return (
    <div className="space-y-5" data-testid="history-page">
      <div>
        <div className="mono text-[10px] tracking-[0.3em] text-[var(--primary)]">ARCHIVE</div>
        <h1 className="text-3xl sm:text-4xl font-bold">Historical Telemetry</h1>
        <p className="text-sm text-white/50 mt-1">Filter by machine and time window. Export full report as PDF.</p>
      </div>

      <div className="panel p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="mono text-[10px] tracking-widest text-white/50">MACHINE:</span>
          {machines.map((m) => (
            <button key={m.id} onClick={() => setActive(m.id)}
              data-testid={`history-machine-${m.id}`}
              className={`chip panel-hover ${active === m.id ? "border-[var(--primary)] text-[var(--primary)]" : ""}`}>
              {m.name}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="mono text-[10px] tracking-widest text-white/50">RANGE:</span>
          {WINDOWS.map((w) => (
            <button key={w.label} onClick={() => setHours(w.hours)}
              data-testid={`history-range-${w.label.replace(" ", "-")}`}
              className={`chip panel-hover ${hours === w.hours ? "border-[var(--primary)] text-[var(--primary)]" : ""}`}>
              {w.label}
            </button>
          ))}
          <button onClick={async () => { try { await downloadPdf(active, Math.max(1, hours)); toast.success("Report downloaded"); } catch { toast.error("Failed"); } }}
            data-testid="history-download-btn"
            className="btn-primary flex items-center gap-2 ml-2">
            <DownloadSimple size={12} weight="bold"/> PDF
          </button>
        </div>
      </div>

      <div className="panel p-4 flex items-center gap-3 flex-wrap">
        <span className="mono text-[10px] tracking-widest text-white/50">METRICS:</span>
        {["temperature", "vibration", "sound", "current"].map((k) => (
          <label key={k} className="flex items-center gap-2 mono text-[11px] uppercase tracking-widest cursor-pointer">
            <input type="checkbox" checked={keys.includes(k)} onChange={() => toggleKey(k)}
              data-testid={`toggle-${k}`} className="accent-[var(--primary)]"/>
            {k}
          </label>
        ))}
        <span className="ml-auto mono text-[10px] text-white/40">{rows.length} samples</span>
      </div>

      <TrendChart data={rows} keys={keys}/>

      <div className="panel overflow-hidden">
        <div className="overflow-auto max-h-[440px]">
          <table className="w-full text-sm" data-testid="history-table">
            <thead className="mono text-[10px] tracking-widest text-white/60 bg-[var(--bg)] sticky top-0">
              <tr className="border-b border-[var(--border)]">
                {["TIME", "TEMP", "VIB", "SOUND", "CURRENT", "STATUS", "HEALTH"].map((h) => (
                  <th key={h} className="text-left px-4 py-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="mono text-[12px]">
              {rows.slice().reverse().map((r) => {
                const color = r.status === "CRITICAL" ? "text-[var(--status-critical)]"
                  : r.status === "WARNING" ? "text-[var(--status-warning)]"
                  : "text-[var(--status-normal)]";
                return (
                  <tr key={r.id} className="border-b border-[var(--border)]/50">
                    <td className="px-4 py-2 text-white/70">{r.timestamp?.slice(11, 19)}</td>
                    <td className="px-4 py-2">{r.temperature}</td>
                    <td className="px-4 py-2">{r.vibration}</td>
                    <td className="px-4 py-2">{r.sound}</td>
                    <td className="px-4 py-2">{r.current}</td>
                    <td className={`px-4 py-2 ${color}`}>{r.status}</td>
                    <td className="px-4 py-2">{r.health}%</td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan="7" className="text-center py-10 text-white/40 mono text-[11px] tracking-widest">NO DATA</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
