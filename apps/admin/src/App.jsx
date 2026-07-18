import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import ToastContainer from "./components/ToastContainer";
import ProtectedRoute from "./components/ProtectedRoute";
import Admin from "./pages/Admin";
import Login from "./pages/Login";

const AdminShell = ({ children }) => {
  return (
    <div className="app-scanlines min-h-screen bg-base px-4 py-6 text-white md:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-borderGlow/60 bg-panel/70 px-5 py-4 shadow-glow">
          <div>
            <p className="text-[11px] uppercase tracking-[0.35em] text-cyan">Admin App</p>
            <h1 className="mt-1 text-xl font-semibold text-white">Virtual Stock Platform Control</h1>
          </div>
          <a
            href="http://localhost:3000"
            className="rounded-xl border border-borderGlow/60 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-300 transition hover:border-cyan/50 hover:text-cyan"
          >
            Website
          </a>
        </header>
        {children}
      </div>
    </div>
  );
};

const AuthShell = ({ children }) => (
  <div className="app-scanlines flex min-h-screen items-center justify-center bg-base px-4 py-8 text-white">
    <div className="w-full max-w-xl rounded-3xl border border-cyan/40 bg-panel/80 p-6 shadow-glow md:p-10">
      {children}
    </div>
  </div>
);

const App = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          <Route
            path="/"
            element={
              <ProtectedRoute requireAdmin>
                <AdminShell>
                  <Admin />
                </AdminShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/login"
            element={
              <AuthShell>
                <Login />
              </AuthShell>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <ToastContainer />
      </ToastProvider>
    </AuthProvider>
  );
};

export default App;
