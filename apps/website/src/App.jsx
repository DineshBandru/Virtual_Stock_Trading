import { Routes, Route, Navigate } from "react-router-dom";
import AppShell from "./components/AppShell";
import AuthLayout from "./components/AuthLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { ThemeProvider } from "./context/ThemeContext";
import { PracticeModeProvider } from "./context/PracticeModeContext";
import ToastContainer from "./components/ToastContainer";
import OnboardingTour from "./components/OnboardingTour";
import ScrollRestoration from "./components/ScrollRestoration";
import useTradingNotifications from "./hooks/useTradingNotifications";
import useAuth from "./hooks/useAuth";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ResetPassword from "./pages/ResetPassword";
import StockDetail from "./pages/StockDetail";
import Portfolio from "./pages/Portfolio";
import Positions from "./pages/Positions";
import Transactions from "./pages/Transactions";
import Orders from "./pages/Orders";
import Watchlist from "./pages/Watchlist";
import Alerts from "./pages/Alerts";
import Leaderboard from "./pages/Leaderboard";
import Competitions from "./pages/Competitions";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";

const TradingNotificationBridge = () => {
  const { user } = useAuth();
  useTradingNotifications(Boolean(user));
  return null;
};

const App = () => {
  return (
    <ThemeProvider>
      <PracticeModeProvider>
        <AuthProvider>
          <ToastProvider>
            <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-primary)] transition-colors">
              <TradingNotificationBridge />
              <ScrollRestoration />
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
            path="/reset-password"
            element={
              <AuthLayout>
                <ResetPassword />
              </AuthLayout>
            }
          />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <AppShell>
                  <Dashboard />
                </AppShell>
              </ProtectedRoute>
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
            path="/positions"
            element={
              <ProtectedRoute>
                <AppShell>
                  <Positions />
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
            path="/orders"
            element={
              <ProtectedRoute>
                <AppShell>
                  <Orders />
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
            path="/settings"
            element={<Navigate to="/settings/account" replace />}
          />
          <Route
            path="/settings/:section"
            element={
              <ProtectedRoute>
                <AppShell>
                  <Settings />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route path="/profile" element={<Navigate to="/settings/account" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <ToastContainer />
          <OnboardingTour />
        </div>
          </ToastProvider>
        </AuthProvider>
      </PracticeModeProvider>
    </ThemeProvider>
  );
};

export default App;
