import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useApp } from "../state/AppContext";

export default function ProtectedRoute() {
  const { user } = useApp();
  const location = useLocation();
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}
