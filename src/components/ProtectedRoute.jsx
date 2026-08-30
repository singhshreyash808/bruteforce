import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function ProtectedRoute({ allowedRoles, children }) {
  const { currentUser, userRole, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        background: "var(--bg-primary, #0B1120)",
        color: "var(--text-primary, #F8FAFC)",
        fontFamily: "'Segoe UI', sans-serif"
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "36px", marginBottom: "12px" }}>🛡️</div>
          <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--cyan, #06B6D4)" }}>
            Verifying CybeX Security Authorization...
          </div>
        </div>
      </div>
    );
  }

  // Not authenticated -> redirect to login
  if (!currentUser) {
    return <Navigate to="/" replace />;
  }

  // Role validation if allowedRoles is specified
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
    return <Navigate to="/" replace />;
  }

  return children ? children : <Outlet />;
}

export default ProtectedRoute;