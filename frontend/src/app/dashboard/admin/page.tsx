"use client";

import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import AdminDashboard from "@/components/Dashboard/AdminDashboard";
import CashierDashboard from "@/components/Dashboard/CashierDashboard";

export default function DashboardPage() {
  const { user } = useAuth();
  const role = user?.role || localStorage.getItem("role");

  return (
    <ProtectedRoute allowedRoles={["admin", "cashier"]}>
      {role === "admin" ? <AdminDashboard /> : <CashierDashboard />}
    </ProtectedRoute>
  );
}
