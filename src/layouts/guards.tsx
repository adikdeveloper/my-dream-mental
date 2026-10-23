import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Loading } from "../components/ui";

export function RequireTeacher() {
  const { role, loading } = useAuth();
  if (loading) return <div className="p-6"><Loading /></div>;
  if (role !== "teacher") return <Navigate to="/teacher/login" replace />;
  return <Outlet />;
}

export function RequireStudent() {
  const { role, loading } = useAuth();
  if (loading) return <div className="p-6"><Loading /></div>;
  if (role !== "student") return <Navigate to="/student/login" replace />;
  return <Outlet />;
}
