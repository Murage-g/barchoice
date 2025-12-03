"use client";
import { useEffect, useState } from "react";
import SummaryCard from "./SummaryCard";
import api from "@/lib/api";
import { ArrowUpDown } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";  // ✅ import this

export default function AdminDashboard() {
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sortAsc, setSortAsc] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const res = await api.get("/admin/dashboard");
      setDashboardData(res.data);
    } catch (err) {
      console.error("Failed to fetch dashboard data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading)
    return <p className="p-6 text-center text-gray-500 animate-pulse">Loading dashboard...</p>;

  if (!dashboardData)
    return <p className="p-6 text-center text-gray-500">No data available.</p>;

  const topDebtors = dashboardData?.top_debtors || [];
  const lowStockProducts = dashboardData?.low_stock || [];

  const sortedProducts = [...lowStockProducts].sort((a, b) =>
    sortAsc ? a.id - b.id : b.id - a.id
  );

  return (
    <ProtectedRoute allowedRoles={["admin"]}> {/* ✅ admin-only access */}
      <div className="p-4 sm:p-6 md:p-8 bg-gradient-to-b from-gray-50 to-gray-100 min-h-screen">
        <h2 className="text-2xl md:text-3xl font-extrabold text-gray-800 mb-6 text-center md:text-left">
          📊 Admin Dashboard
        </h2>

        {/* Summary Section */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <SummaryCard
            title="Today's Sales"
            value={`KSh ${dashboardData?.today_revenue?.toFixed?.(2) || "0.00"}`}
            color="text-blue-600"
          />
          <SummaryCard
            title="Today's Profit"
            value={`KSh ${dashboardData?.today_profit?.toFixed?.(2) || "0.00"}`}
            color="text-green-600"
          />
          <SummaryCard
            title="Low Stock Alert"
            value={dashboardData?.low_stock_count ?? 0}
            color="text-red-600"
            subtitle="Items at risk of running out"
          />
        </div>

        {/* Top Debtors */}
        <div className="bg-white rounded-2xl shadow-lg p-5 mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg md:text-xl font-semibold text-gray-800">
              Top 10 Debtors (Unpaid)
            </h3>
            <span className="text-xs md:text-sm text-gray-500">
              {topDebtors.length} Debtors
            </span>
          </div>
          <ul className="divide-y divide-gray-100">
            {topDebtors.length > 0 ? (
              topDebtors.map((debtor: any) => (
                <li
                  key={debtor.id}
                  className="py-2 flex justify-between items-center hover:bg-gray-50 transition-colors"
                >
                  <span className="font-medium text-gray-700 truncate">
                    {debtor.name}
                  </span>
                  <span className="text-red-600 font-semibold text-sm">
                    KSh {debtor.total_debt?.toFixed?.(2) || "0.00"}
                  </span>
                </li>
              ))
            ) : (
              <li className="text-gray-500 py-2 text-center">
                No outstanding debts.
              </li>
            )}
          </ul>
        </div>

        {/* Low Stock Items */}
        <div className="bg-white rounded-2xl shadow-lg p-5">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg md:text-xl font-semibold text-gray-800">
              Low Stock Items
            </h3>
            <button
              onClick={() => setSortAsc(!sortAsc)}
              className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition"
            >
              Sort by ID
              <ArrowUpDown size={14} />
            </button>
          </div>

          <ul className="divide-y divide-gray-100">
            {sortedProducts.length > 0 ? (
              sortedProducts.map((p: any) => (
                <li
                  key={p.id}
                  className="py-2 flex justify-between items-center hover:bg-gray-50 transition"
                >
                  <span className="font-medium text-gray-700 truncate">
                    {p.name}
                  </span>
                  <span
                    className={`font-semibold text-sm ${
                      p.stock < 5 ? "text-red-600" : "text-yellow-600"
                    }`}
                  >
                    Stock: {p.stock}
                  </span>
                </li>
              ))
            ) : (
              <li className="text-gray-500 py-2 text-center">
                No items with low stock.
              </li>
            )}
          </ul>
        </div>
      </div>
    </ProtectedRoute>
  );
}
