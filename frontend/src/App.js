import "@/App.css";
import "@/index.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import History from "@/pages/History";
import Admin from "@/pages/Admin";
import Layout from "@/components/Layout";
import { Toaster } from "sonner";

function Protected({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-white/60 mono">LOADING...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" theme="dark" toastOptions={{ className: "mono" }} />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Protected><Layout><Dashboard /></Layout></Protected>} />
          <Route path="/history" element={<Protected><Layout><History /></Layout></Protected>} />
          <Route path="/admin" element={<Protected roles={["admin"]}><Layout><Admin /></Layout></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
