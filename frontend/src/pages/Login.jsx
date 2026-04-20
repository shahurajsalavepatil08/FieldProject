import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Lightning, Gauge, ShieldCheck } from "@phosphor-icons/react";
import { toast } from "sonner";

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("admin@pm.com");
  const [password, setPassword] = useState("admin123");
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("engineer");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "login") {
        const u = await login(email, password);
        toast.success(`Welcome, ${u.username}`);
      } else {
        const u = await register({ username, email, password, role });
        toast.success(`Account created: ${u.username}`);
      }
      navigate("/");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Authentication failed");
    } finally { setBusy(false); }
  };

  const quickFill = (which) => {
    if (which === "admin") { setEmail("admin@pm.com"); setPassword("admin123"); }
    else { setEmail("engineer@pm.com"); setPassword("engineer123"); }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-[var(--bg)]">
      {/* left: brand */}
      <div className="relative hidden lg:flex flex-col justify-between p-10 overflow-hidden border-r border-[var(--border)]">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `url('https://images.pexels.com/photos/17323801/pexels-photo-17323801.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940')`,
            backgroundSize: "cover", backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)]/80 to-transparent" />
        <div className="absolute inset-0 grid-bg opacity-40" />
        <div className="relative z-10 flex items-center gap-3">
          <div className="h-9 w-9 bg-[var(--primary)] grid place-items-center">
            <Lightning size={20} weight="bold" />
          </div>
          <div>
            <div className="text-sm tracking-[0.3em] mono text-white/70">INDUSTRIAL IOT + AI</div>
            <div className="text-2xl font-bold">Smart Predictive Maintenance System</div>
          </div>
        </div>
        <div className="relative z-10 space-y-6 max-w-md">
          <div className="mono text-[11px] tracking-[0.3em] text-[var(--primary)]">
            SMART PREDICTIVE MAINTENANCE SYSTEM
          </div>
          <h1 className="text-5xl font-bold leading-[1.05]">
            Zero-downtime<br/>industrial intelligence.
          </h1>
          <p className="text-white/60 text-sm leading-relaxed">
            Realtime telemetry from vibration, thermal, acoustic and current
            sensors. AI-assisted diagnosis and predictive maintenance
            across every machine on your floor.
          </p>
          <div className="flex gap-6 text-xs mono text-white/50 uppercase tracking-[0.2em]">
            <span className="flex items-center gap-2"><Gauge size={14}/> 4 sensors</span>
            <span className="flex items-center gap-2"><ShieldCheck size={14}/> Role-based</span>
            <span className="flex items-center gap-2"><Lightning size={14}/> LLM insights</span>
          </div>
        </div>
        <div className="relative z-10 mono text-[11px] text-white/40 tracking-[0.2em]">
          SYSTEM STATUS : <span className="text-[var(--status-normal)]">● ONLINE</span>
        </div>
      </div>

      {/* right: form */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <form onSubmit={submit} className="w-full max-w-md panel p-8 space-y-6" data-testid="login-form">
          <div className="flex items-center gap-3 pb-4 border-b border-[var(--border)] lg:hidden">
            <div className="h-9 w-9 bg-[var(--primary)] grid place-items-center">
              <Lightning size={18} weight="bold"/>
            </div>
            <div>
              <div className="mono text-[10px] tracking-[0.3em] text-white/60">INDUSTRIAL IOT + AI</div>
              <div className="text-lg font-bold leading-tight">Smart Predictive Maintenance System</div>
            </div>
          </div>
          <div>
            <div className="mono text-[11px] tracking-[0.3em] text-[var(--primary)] mb-2">
              {mode === "login" ? "SECURE ACCESS" : "NEW OPERATOR"}
            </div>
            <h2 className="text-3xl font-bold">
              {mode === "login" ? "Sign in to control room" : "Create operator account"}
            </h2>
          </div>

          <div className="flex gap-2 mono text-[11px]">
            <button type="button" onClick={() => quickFill("admin")}
              data-testid="fill-admin-btn"
              className="chip panel-hover">Use admin</button>
            <button type="button" onClick={() => quickFill("engineer")}
              data-testid="fill-engineer-btn"
              className="chip panel-hover">Use engineer</button>
          </div>

          {mode === "register" && (
            <div className="space-y-1">
              <label className="mono text-[11px] tracking-widest text-white/60">USERNAME</label>
              <input required value={username} onChange={(e) => setUsername(e.target.value)}
                data-testid="register-username-input" className="input-industrial"/>
            </div>
          )}
          <div className="space-y-1">
            <label className="mono text-[11px] tracking-widest text-white/60">EMAIL</label>
            <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)}
              data-testid="login-email-input" className="input-industrial"/>
          </div>
          <div className="space-y-1">
            <label className="mono text-[11px] tracking-widest text-white/60">PASSWORD</label>
            <input required type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              data-testid="login-password-input" className="input-industrial"/>
          </div>
          {mode === "register" && (
            <div className="space-y-1">
              <label className="mono text-[11px] tracking-widest text-white/60">ROLE</label>
              <select value={role} onChange={(e) => setRole(e.target.value)}
                data-testid="register-role-select" className="input-industrial">
                <option value="engineer">Engineer</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          )}

          <button disabled={busy} type="submit" data-testid="login-submit-button"
            className="btn-primary w-full disabled:opacity-50">
            {busy ? "..." : mode === "login" ? "AUTHENTICATE →" : "CREATE ACCOUNT →"}
          </button>

          <div className="text-xs text-white/50 text-center">
            {mode === "login" ? "No account?" : "Already registered?"}{" "}
            <button type="button" onClick={() => setMode(mode === "login" ? "register" : "login")}
              data-testid="toggle-mode-btn"
              className="text-[var(--primary)] hover:underline">
              {mode === "login" ? "Create one" : "Sign in"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
