import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Lightning, Gauge, ClockCounterClockwise, ShieldCheck, SignOut } from "@phosphor-icons/react";

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const items = [
    { to: "/", label: "DASHBOARD", icon: Gauge, testid: "nav-dashboard" },
    { to: "/history", label: "HISTORY", icon: ClockCounterClockwise, testid: "nav-history" },
  ];
  if (user?.role === "admin") items.push({ to: "/admin", label: "ADMIN", icon: ShieldCheck, testid: "nav-admin" });

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg)] text-white">
      <header className="border-b border-[var(--border)] bg-[var(--bg)]/95 backdrop-blur sticky top-0 z-20">
        <div className="max-w-[1600px] mx-auto px-5 h-14 flex items-center justify-between gap-6">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="h-7 w-7 bg-[var(--primary)] grid place-items-center">
                <Lightning size={16} weight="bold"/>
              </div>
              <div className="hidden sm:block">
                <div className="mono text-[10px] tracking-[0.3em] text-white/60 leading-none">INDUSTRIAL IOT + AI</div>
                <div className="text-sm font-semibold leading-tight">Smart Predictive Maintenance System</div>
              </div>
            </div>
            <nav className="flex items-center gap-1">
              {items.map((it) => (
                <NavLink key={it.to} to={it.to} end data-testid={it.testid}
                  className={({ isActive }) =>
                    `px-3 py-1.5 mono text-[11px] tracking-widest border flex items-center gap-2 transition-colors ${
                      isActive
                        ? "border-[var(--primary)] text-white bg-[var(--surface-hover)]"
                        : "border-transparent text-white/60 hover:text-white hover:bg-[var(--surface-hover)]"
                    }`
                  }>
                  <it.icon size={14}/> {it.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex flex-col items-end mono text-[11px] leading-tight">
              <span className="text-white/90" data-testid="user-email">{user?.email}</span>
              <span className="text-[var(--primary)] tracking-widest">
                ROLE: {user?.role?.toUpperCase()}
              </span>
            </div>
            <button onClick={() => { logout(); navigate("/login"); }}
              data-testid="logout-btn"
              className="btn-ghost flex items-center gap-2">
              <SignOut size={14}/> LOGOUT
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-5 py-6">
        {children}
      </main>
      <footer className="border-t border-[var(--border)] py-3 mono text-[10px] text-white/40 tracking-[0.2em] text-center">
        SMART PREDICTIVE MAINTENANCE SYSTEM · v1.0
      </footer>
    </div>
  );
}
