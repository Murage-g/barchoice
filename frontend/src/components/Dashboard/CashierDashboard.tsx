"use client";

import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";
import SummaryCard from "@/components/Dashboard/SummaryCard";
import { useEffect, useState } from "react";
import api from "@/lib/api";

export default function CashierDashboard() {
  const { user } = useAuth();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 🔹 Fetch dashboard data for cashier
  const fetchDashboardData = async () => {
    try {
      const res = await api.get("/cashier/dashboard");
      setDashboardData(res.data);
    } catch (err: any) {
      console.error("Failed to fetch cashier dashboard data:", err.response?.data || err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return <p className="p-6 text-center text-gray-500">Loading dashboard...</p>;
  }

  if (!dashboardData) {
    return <p className="p-6 text-center text-gray-500">No data available.</p>;
  }

  const topProducts = dashboardData?.topProducts || [];

  return (
    <ProtectedRoute allowedRoles={["cashier", "admin"]}>
      <div className="p-4 sm:p-6 md:p-8 bg-gray-50 min-h-screen">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">💰 Cashier Dashboard</h2>

        {/* Summary Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          <SummaryCard
            title="Today's Sales"
            value={`KSh ${dashboardData?.today_revenue?.toFixed?.(2) || "0.00"}`}
          />
          <SummaryCard
            title="Outstanding Bills"
            value={`KSh ${dashboardData?.outstanding_bills?.toFixed?.(2) || "0.00"}`}
            color="text-yellow-600"
          />
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-md p-5 mb-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-700">Quick Actions</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <button className="bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition">
              Record Sale
            </button>
            <button className="bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition">
              Manage Debts
            </button>
            <button className="bg-gray-600 text-white py-2 rounded-lg hover:bg-gray-700 transition">
              Check Stock
            </button>
          </div>
        </div>

        {/* Top Selling Items */}
        <div className="bg-white rounded-xl shadow-md p-5">
          <h3 className="text-lg font-semibold mb-3 text-gray-700">Top Selling Products</h3>
          <ul className="divide-y divide-gray-200">
            {topProducts.length > 0 ? (
              topProducts.map((p: any) => (
                <li key={p.id} className="py-2 flex justify-between">
                  <span>{p.name}</span>
                  <span className="text-gray-800 font-semibold">{p.quantity_sold}</span>
                </li>
              ))
            ) : (
              <li className="text-gray-500 py-2">No sales recorded yet.</li>
            )}
          </ul>
        </div>
      </div>
    </ProtectedRoute>
  );
}
