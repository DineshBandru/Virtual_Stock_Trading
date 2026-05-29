import { Routes, Route, Navigate } from "react-router-dom";
import AppShell from "./components/AppShell";
import AuthLayout from "./components/AuthLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import ToastContainer from "./components/ToastContainer";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import StockDetail from "./pages/StockDetail";
import Portfolio from "./pages/Portfolio";
import Transactions from "./pages/Transactions";
import Watchlist from "./pages/Watchlist";
import Alerts from "./pages/Alerts";
import Leaderboard from "./pages/Leaderboard";
import Competitions from "./pages/Competitions";
import Analytics from "./pages/Analytics";
import Admin from "./pages/Admin";

const App = () => {
  return (
    <AuthProvider>
      <ToastProvider>
        <div className="app-scanlines min-h-screen bg-base text-white">
          <Routes>
          <Route path="/" element={<Home />} />
          <Route
            path="/login"
            element={
              <AuthLayout>
                <Login />
              </AuthLayout>
            }
          />
          <Route
            path="/register"
            element={
              <AuthLayout>
                <Register />
              </AuthLayout>
            }
          />
          <Route
            path="/stocks/:symbol"
            element={
              <ProtectedRoute>
                <AppShell>
                  <StockDetail />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/portfolio"
            element={
              <ProtectedRoute>
                <AppShell>
                  <Portfolio />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/transactions"
            element={
              <ProtectedRoute>
                <AppShell>
                  <Transactions />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/watchlist"
            element={
              <ProtectedRoute>
                <AppShell>
                  <Watchlist />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/alerts"
            element={
              <ProtectedRoute>
                <AppShell>
                  <Alerts />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/leaderboard"
            element={
              <ProtectedRoute>
                <AppShell>
                  <Leaderboard />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/competitions"
            element={
              <ProtectedRoute>
                <AppShell>
                  <Competitions />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/analytics"
            element={
              <ProtectedRoute>
                <AppShell>
                  <Analytics />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin>
                <AppShell>
                  <Admin />
                </AppShell>
              </ProtectedRoute>
            }
          />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <ToastContainer />
        </div>
      </ToastProvider>
    </AuthProvider>
  );
};

export default App;
