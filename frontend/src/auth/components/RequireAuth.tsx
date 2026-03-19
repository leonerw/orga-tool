import { Navigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import React from "react";

export function RequireAuth({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, isBootstrapping } = useAuth();

    if (isBootstrapping) {
        return <div className="p-6">Loading session...</div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
}