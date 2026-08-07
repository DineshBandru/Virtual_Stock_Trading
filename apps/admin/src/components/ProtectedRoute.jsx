import { Navigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";
import { Skeleton } from "./Skeleton";

const ProtectedRoute = ({ children, requireAdmin = false }) => {
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
    return <Navigate to="/login" replace />;
  }

  if (requireAdmin && user.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-lg rounded-lg border border-red-500/40 bg-red-500/10 p-6 text-center text-red-100">
          <h1 className="text-lg font-semibold">Admin access required</h1>
          <p className="mt-3 text-sm text-red-100/80">
            You are signed in, but this account does not have the admin role.
          </p>
          <Navigate to="/login" replace />
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
