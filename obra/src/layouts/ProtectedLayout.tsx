import { Navigate, Outlet } from "react-router-dom";
import { AuthFlowLoading } from "@/components/obra/AuthFlowLoading";
import { useAuth } from "@/auth/authContext";

export function ProtectedLayout() {
  const { session, loading } = useAuth();

  if (loading) {
    return <AuthFlowLoading variant="fullscreen" />;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
