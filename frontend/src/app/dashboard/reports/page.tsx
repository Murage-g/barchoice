"use client";
import { useEffect, useState } from "react";
import axios from "axios";
import ProtectedRoute from "@/components/ProtectedRoute";
import { TrendingUp, PieChart, DollarSign } from "lucide-react";
import React from "react";
import api from "@/lib/api";

// ✅ Define interface only once
interface Report {
  report_type: string;
  period: { start: string; end: string };
  sections: {
    // Profit & Loss
    sales?: number;
    cogs?: number;
    gross_profit?: number;
    expenses?: number;
    net_profit?: number;

    // Balance Sheet
    assets?: {
      current_assets: number;
      fixed_assets: number;
      total_assets: number;
    };
    liabilities?: {
      current_liabilities: number;
      long_term_liabilities: number;
      total_liabilities: number;
    };
    equity?: {
      owner_equity: number;
      retained_earnings: number;
      total_equity: number;
    };
    total_liabilities_and_equity?: number;

    // Cash Flow
    operating_activities?: {
      cash_inflows: number;
      cash_outflows: number;
      net_cash_from_operations: number;
    };
    investing_activities?: {
      purchases_equipment: number;
      sales_assets: number;
      net_cash_from_investing: number;
    };
    financing_activities?: {
      loans_received: number;
      loan_repayments: number;
      net_cash_from_financing: number;
    };
    net_increase_in_cash?: number;
    closing_cash_balance?: number;

    // Optional extra fields (for flexibility)
    [key: string]:
      | number
      | undefined
      | {
          [subKey: string]: number;
        };
  };
}
;


export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("today");
  const [customRange, setCustomRange] = useState({ start: "", end: "" });

  const getDateRange = () => {
    const today = new Date();
    let start = new Date(today);
    let end = new Date(today);

    if (filterType === "this_month") {
      start = new Date(today.getFullYear(), today.getMonth(), 1);
    } else if (filterType === "custom") {
      start = new Date(customRange.start);
      end = new Date(customRange.end);
    }

    const format = (d: Date) => d.toISOString().split("T")[0];
    return { start: format(start), end: format(end) };
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const { start, end } = getDateRange();
      const params = `?start_date=${start}&end_date=${end}`;

      const [pl, bs, cf] = await Promise.all([
        api.get(`/reports/profit_loss${params}`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }),
        api.get(`/reports/balance_sheet`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }),
        api.get(`/reports/cash_flow${params}`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }),
      ]);

      setReports([pl.data, bs.data, cf.data]);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [filterType, customRange]);

  const icons: Record<string, React.ReactNode> = {
    "Profit and Loss": <TrendingUp className="text-3xl text-green-500" />,
    "Balance Sheet": <PieChart className="text-3xl text-blue-500" />,
    "Cash Flow Statement": <DollarSign className="text-3xl text-yellow-500" />,
  };

  return (
    <ProtectedRoute>
      <div className="pt-24 pb-8 px-4 sm:px-6 lg:px-8 min-h-screen bg-gradient-to-br from-blue-50 to-white">
        <h1 className="text-3xl sm:text-4xl font-bold mb-6 text-center text-blue-700">
          Financial Reports
        </h1>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-3 mb-6 items-center font-bold mb-6 text-center text-blue-700">
          <select
            className="border rounded-lg p-2 w-full sm:w-auto"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="today">Today</option>
            <option value="this_month">This Month</option>
            <option value="custom">Custom Range</option>
          </select>

          {filterType === "custom" && (
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto items-center ">
              <input
                type="date"
                className="border rounded-lg p-2"
                value={customRange.start}
                onChange={(e) =>
                  setCustomRange((prev) => ({ ...prev, start: e.target.value }))
                }
              />
              <input
                type="date"
                className="border rounded-lg p-2"
                value={customRange.end}
                onChange={(e) =>
                  setCustomRange((prev) => ({ ...prev, end: e.target.value }))
                }
              />
              <button
                onClick={fetchReports}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Apply
              </button>
            </div>
          )}
        </div>

        {/* Report Display */}
        {loading ? (
          <p className="text-center text-gray-600 mt-8">
            Loading financial reports.
          </p>
        ) : error ? (
          <p className="text-center text-red-500 mt-8">{error}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {reports.map((r, i) => (
              <div
                key={i}
                className="bg-white p-6 rounded-2xl shadow-lg hover:shadow-xl transition"
              >
                <div className="flex items-center gap-3 mb-4">
                  {icons[r.report_type] ||
                    <PieChart className="text-3xl text-gray-400" />}
                  <h2 className="text-xl font-semibold text-blue-700">
                    {r.report_type}
                  </h2>
                </div>

                {r.report_type === "Profit and Loss" && (
                  <div className="space-y-2">
                    <div className="flex justify-between font-semibold text-green-600">
                      <span>Sales</span>
                      <span>{r.sections.sales?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-red-500">
                      <span>Cost of Goods Sold</span>
                      <span>{r.sections.cogs?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t pt-1 font-semibold text-green-600">
                      <span>Gross Profit</span>
                      <span>{r.sections.gross_profit?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-red-500">
                      <span>Expenses</span>
                      <span>{r.sections.expenses?.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between border-t pt-1 font-bold text-blue-700">
                      <span>Net Profit</span>
                      <span>{r.sections.net_profit?.toLocaleString()}</span>
                    </div>
                  </div>
                )}

                
                {r.report_type === "Balance Sheet" && (
                    <div className="space-y-2">
                        {/* Assets Section */}
                        <details className="bg-gray-50 rounded-lg p-2">
                        <summary className="font-semibold text-green-700 cursor-pointer">
                            Assets
                        </summary>
                        <div className="pl-4 space-y-1">
                            <div className="flex justify-between">
                            <span>Current Assets</span>
                            <span>{r.sections.assets?.current_assets?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                            <span>Fixed Assets</span>
                            <span>{r.sections.assets?.fixed_assets?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between border-t pt-1 font-semibold">
                            <span>Total Assets</span>
                            <span>{r.sections.assets?.total_assets?.toLocaleString()}</span>
                            </div>
                        </div>
                        </details>

                        {/* Liabilities Section */}
                        <details className="bg-gray-50 rounded-lg p-2">
                        <summary className="font-semibold text-red-700 cursor-pointer">
                            Liabilities
                        </summary>
                        <div className="pl-4 space-y-1">
                            <div className="flex justify-between">
                            <span>Current Liabilities</span>
                            <span>{r.sections.liabilities?.current_liabilities?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                            <span>Long-Term Liabilities</span>
                            <span>{r.sections.liabilities?.long_term_liabilities?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between border-t pt-1 font-semibold">
                            <span>Total Liabilities</span>
                            <span>{r.sections.liabilities?.total_liabilities?.toLocaleString()}</span>
                            </div>
                        </div>
                        </details>

                        {/* Equity Section */}
                        <details className="bg-gray-50 rounded-lg p-2">
                        <summary className="font-semibold text-blue-700 cursor-pointer">
                            Equity
                        </summary>
                        <div className="pl-4 space-y-1">
                            <div className="flex justify-between">
                            <span>Owner’s Equity</span>
                            <span>{r.sections.equity?.owner_equity?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                            <span>Retained Earnings</span>
                            <span>{r.sections.equity?.retained_earnings?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between border-t pt-1 font-semibold">
                            <span>Total Equity</span>
                            <span>{r.sections.equity?.total_equity?.toLocaleString()}</span>
                            </div>
                        </div>
                        </details>

                        {/* Total Balance */}
                        <div className="flex justify-between border-t pt-1 font-bold text-purple-700">
                        <span>Total Liabilities + Equity</span>
                        <span>{r.sections.total_liabilities_and_equity?.toLocaleString()}</span>
                        </div>
                    </div>
                    )}

                    {r.report_type === "Cash Flow" && (
                    <div className="space-y-2">
                        {/* Operating Activities */}
                        <details className="bg-gray-50 rounded-lg p-2">
                        <summary className="font-semibold text-green-700 cursor-pointer">
                            Operating Activities
                        </summary>
                        <div className="pl-4 space-y-1">
                            <div className="flex justify-between">
                            <span>Cash Inflows</span>
                            <span>{r.sections.operating_activities?.cash_inflows?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                            <span>Cash Outflows</span>
                            <span>{r.sections.operating_activities?.cash_outflows?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between border-t pt-1 font-semibold">
                            <span>Net Cash from Operations</span>
                            <span>{r.sections.operating_activities?.net_cash_from_operations?.toLocaleString()}</span>
                            </div>
                        </div>
                        </details>

                        {/* Investing Activities */}
                        <details className="bg-gray-50 rounded-lg p-2">
                        <summary className="font-semibold text-yellow-700 cursor-pointer">
                            Investing Activities
                        </summary>
                        <div className="pl-4 space-y-1">
                            <div className="flex justify-between">
                            <span>Purchases of Equipment</span>
                            <span>{r.sections.investing_activities?.purchases_equipment?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                            <span>Sales of Assets</span>
                            <span>{r.sections.investing_activities?.sales_assets?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between border-t pt-1 font-semibold">
                            <span>Net Cash from Investing</span>
                            <span>{r.sections.investing_activities?.net_cash_from_investing?.toLocaleString()}</span>
                            </div>
                        </div>
                        </details>

                        {/* Financing Activities */}
                        <details className="bg-gray-50 rounded-lg p-2">
                        <summary className="font-semibold text-blue-700 cursor-pointer">
                            Financing Activities
                        </summary>
                        <div className="pl-4 space-y-1">
                            <div className="flex justify-between">
                            <span>Loans Received</span>
                            <span>{r.sections.financing_activities?.loans_received?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between">
                            <span>Loan Repayments</span>
                            <span>{r.sections.financing_activities?.loan_repayments?.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between border-t pt-1 font-semibold">
                            <span>Net Cash from Financing</span>
                            <span>{r.sections.financing_activities?.net_cash_from_financing?.toLocaleString()}</span>
                            </div>
                        </div>
                        </details>

                        {/* Net Cash and Closing Balance */}
                        <div className="flex justify-between border-t pt-1 font-bold text-purple-700">
                        <span>Net Increase in Cash</span>
                        <span>{r.sections.net_increase_in_cash?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between font-bold text-green-800">
                        <span>Closing Cash Balance</span>
                        <span>{r.sections.closing_cash_balance?.toLocaleString()}</span>
                        </div>
                    </div>
                    )}



              </div>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
