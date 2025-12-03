"use client";

import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminDashboard from "@/components/Dashboard/AdminDashboard";
import CashierDashboard from "@/components/Dashboard/CashierDashboard";

export default function DashboardPage() {
  const { user } = useAuth();
  const role = user?.role || localStorage.getItem("role");
  const dashboardData = JSON.parse(localStorage.getItem("dashboardData") || "{}");

  return (
    <ProtectedRoute allowedRoles={["admin", "cashier"]}>
      {role === "admin" ? (
        <AdminDashboard dashboardData={dashboardData} />
      ) : (
        <CashierDashboard dashboardData={dashboardData} />
      )}
    </ProtectedRoute>
  );
}
