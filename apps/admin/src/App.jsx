import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import ToastContainer from "./components/ToastContainer";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminShell from "./components/AdminShell";
import Admin from "./pages/Admin";
import Login from "./pages/Login";

const AuthShell = ({ children }) => (
  <div className="auth-shell flex min-h-dvh items-center justify-center px-4 py-8 text-white">
    <div className="w-full max-w-md rounded-xl border border-borderGlow bg-panel p-6 shadow-glow md:p-8">
      {children}
    </div>
  </div>
);

const ProtectedAdminView = ({ view }) => (
  <ProtectedRoute requireAdmin>
    <AdminShell>
      <Admin view={view} />
    </AdminShell>
  </ProtectedRoute>
);

const App = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          <Route path="/" element={<ProtectedAdminView view="dashboard" />} />
          <Route path="/users" element={<ProtectedAdminView view="users" />} />
          <Route path="/transactions" element={<ProtectedAdminView view="transactions" />} />
          <Route path="/orders" element={<ProtectedAdminView view="orders" />} />
          <Route path="/competitions" element={<ProtectedAdminView view="competitions" />} />
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
