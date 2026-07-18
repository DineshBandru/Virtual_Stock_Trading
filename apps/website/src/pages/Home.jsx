import AppShell from "../components/AppShell";
import AuthLayout from "../components/AuthLayout";
import Dashboard from "./Dashboard";
import AuthGate from "./AuthGate";
import useAuth from "../hooks/useAuth";
import { Skeleton } from "../components/Skeleton";

const Home = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="w-full max-w-md space-y-3">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
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
