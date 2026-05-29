import AppShell from "../components/AppShell";
import AuthLayout from "../components/AuthLayout";
import Dashboard from "./Dashboard";
import AuthGate from "./AuthGate";
import useAuth from "../hooks/useAuth";

const Home = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-300">
        Loading session...
      </div>
    );
  }

  if (!user) {
    return (
      <AuthLayout>
        <AuthGate />
      </AuthLayout>
    );
  }

  return (
    <AppShell>
      <Dashboard />
    </AppShell>
  );
};

export default Home;
