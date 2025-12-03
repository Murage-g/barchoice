"use client";
import AdminDashboard from "@/components/Dashboard/AdminDashboard";
import CashierDashboard from "@/components/Dashboard/CashierDashboard";

export default function DashboardPage() {
  const role = localStorage.getItem("role"); // or decode from token
  const dashboardData = JSON.parse(localStorage.getItem("dashboardData") || "{}");

  if (role === "admin") return <AdminDashboard dashboardData={dashboardData} />;
  return <CashierDashboard dashboardData={dashboardData} />;
}
