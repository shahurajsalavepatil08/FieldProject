import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Trash, FloppyDisk } from "@phosphor-icons/react";

export default function Admin() {
  const [tab, setTab] = useState("users");
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [th, setTh] = useState(null);

  const loadAll = async () => {
    const [u, l, t] = await Promise.all([
      api.get("/users"), api.get("/logs"), api.get("/thresholds"),
    ]);
    setUsers(u.data); setLogs(l.data); setTh(t.data);
  };
  useEffect(() => { loadAll(); }, []);

  const remove = async (id) => {
    try {
      await api.delete(`/users/${id}`);
      toast.success("User removed");
      loadAll();
    } catch (e) { toast.error(e?.response?.data?.detail || "Failed"); }
  };

  const saveTh = async () => {
    try {
      await api.put("/thresholds", th);
      toast.success("Thresholds updated");
      loadAll();
    } catch (e) { toast.error("Failed to save"); }
  };

  const tabs = [
    { id: "users", label: "USERS" },
    { id: "thresholds", label: "THRESHOLDS" },
    { id: "logs", label: "SYSTEM LOGS" },
  ];

  return (
    <div className="space-y-5" data-testid="admin-page">
      <div>
        <div className="mono text-[10px] tracking-[0.3em] text-[var(--primary)]">ADMIN CONSOLE</div>
        <h1 className="text-3xl sm:text-4xl font-bold">System Administration</h1>
      </div>

      <div className="panel p-1 flex gap-1 w-fit">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            data-testid={`admin-tab-${t.id}`}
            className={`px-4 py-2 mono text-[11px] tracking-widest ${
              tab === t.id ? "bg-[var(--primary)] text-white" : "text-white/60 hover:text-white"
            }`}>{t.label}</button>
        ))}
      </div>

      {tab === "users" && (
        <div className="panel overflow-hidden">
          <table className="w-full text-sm" data-testid="users-table">
            <thead className="mono text-[10px] tracking-widest text-white/60 bg-[var(--bg)]">
              <tr className="border-b border-[var(--border)]">
                {["USERNAME", "EMAIL", "ROLE", "CREATED", ""].map((h) => (
                  <th key={h} className="text-left px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-[var(--border)]/50">
                  <td className="px-4 py-3 font-medium">{u.username}</td>
                  <td className="px-4 py-3 mono text-[12px]">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="chip" style={{
                      borderColor: u.role === "admin" ? "var(--primary)" : "var(--border)",
                      color: u.role === "admin" ? "var(--primary)" : "inherit",
                    }}>{u.role.toUpperCase()}</span>
                  </td>
                  <td className="px-4 py-3 mono text-[11px] text-white/60">{u.created_at?.slice(0, 19).replace("T", " ")}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => remove(u.id)}
                      data-testid={`delete-user-${u.id}`}
                      className="btn-ghost flex items-center gap-1">
                      <Trash size={12}/> DELETE
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "thresholds" && th && (
        <div className="panel p-6 space-y-5 max-w-3xl">
          <div className="mono text-[11px] tracking-widest text-white/50">
            Configure warning and critical thresholds per sensor channel.
          </div>
          <div className="grid sm:grid-cols-2 gap-6">
            {[
              ["TEMPERATURE (°C)", "temp_warning", "temp_critical"],
              ["VIBRATION", "vib_warning", "vib_critical"],
              ["SOUND (dB)", "sound_warning", "sound_critical"],
              ["CURRENT (A)", "current_warning", "current_critical"],
            ].map(([lbl, w, c]) => (
              <div key={w} className="space-y-2">
                <div className="mono text-[10px] tracking-widest text-white/60">{lbl}</div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="mono text-[10px] text-[var(--status-warning)]">WARN</label>
                    <input type="number" step="0.1" value={th[w]}
                      onChange={(e) => setTh({ ...th, [w]: parseFloat(e.target.value) })}
                      data-testid={`th-${w}`} className="input-industrial"/>
                  </div>
                  <div className="flex-1">
                    <label className="mono text-[10px] text-[var(--status-critical)]">CRIT</label>
                    <input type="number" step="0.1" value={th[c]}
                      onChange={(e) => setTh({ ...th, [c]: parseFloat(e.target.value) })}
                      data-testid={`th-${c}`} className="input-industrial"/>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button onClick={saveTh} data-testid="save-thresholds-btn"
            className="btn-primary flex items-center gap-2">
            <FloppyDisk size={14} weight="bold"/> SAVE CHANGES
          </button>
        </div>
      )}

      {tab === "logs" && (
        <div className="panel p-4" data-testid="logs-panel">
          <div className="mono text-[11px] space-y-1 max-h-[520px] overflow-auto">
            {logs.map((l) => (
              <div key={l.id} className="flex gap-3 py-1 border-b border-[var(--border)]/30">
                <span className="text-white/40">{l.timestamp?.slice(0, 19).replace("T", " ")}</span>
                <span className={
                  l.level === "WARN" ? "text-[var(--status-warning)]" :
                  l.level === "ERROR" ? "text-[var(--status-critical)]" :
                  "text-[var(--status-normal)]"
                }>[{l.level}]</span>
                <span className="text-white/80">{l.message}</span>
              </div>
            ))}
            {logs.length === 0 && <div className="py-8 text-center text-white/40 tracking-widest">NO LOG ENTRIES</div>}
          </div>
        </div>
      )}
    </div>
  );
}
