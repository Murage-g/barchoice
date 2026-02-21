"use client";

import React, { useEffect, useState } from "react";
import api from "@/lib/api";

interface DailyCloseAdjustment {
  id: number;
  previous_closing_stock: number;
  new_closing_stock: number;
  quantity_delta: number;
  revenue_delta: number;
  profit_delta: number;
  reason: string;
  created_by: string;
  created_at: string;
}

interface Close {
  id: number;
  product_name: string;
  opening_stock: number;
  closing_stock: number;
  units_sold: number;
  revenue: number;
  profit: number;
}

interface Props {
  closes: Close[];
  closingStockDate: string;
}

const AdminDailyCloseAdjustments: React.FC<Props> = ({
  closes,
  closingStockDate,
}) => {
  const [adjustments, setAdjustments] = useState<
    Record<number, DailyCloseAdjustment[]>
  >({});
  const [newClosing, setNewClosing] = useState<Record<number, string>>({});
  const [reason, setReason] = useState<Record<number, string>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState<Record<number, boolean>>({});

  const isLocked = () => {
    const closeDate = new Date(closingStockDate);
    const now = new Date();
    return now.getTime() > closeDate.getTime() + 3 * 24 * 60 * 60 * 1000;
  };

  const fetchAdjustments = async (dcId: number) => {
    try {
      const res = await api.get(`/api/daily_close/${dcId}/adjustments`);
      const data = res.data.adjustments || [];
      setAdjustments((prev) => ({ ...prev, [dcId]: data }));
    } catch {
      console.error("Failed to fetch adjustments");
    }
  };

  useEffect(() => {
    closes.forEach((c) => fetchAdjustments(c.id));
  }, [closes]);

  const submitAdjustment = async (close: Close) => {
    const dcId = close.id;
    const parsed = parseInt(newClosing[dcId]);

    if (!newClosing[dcId] || !reason[dcId]) {
      setErrors((prev) => ({ ...prev, [dcId]: "All fields required" }));
      return;
    }

    if (isNaN(parsed) || parsed < 0) {
      setErrors((prev) => ({
        ...prev,
        [dcId]: "Closing stock must be a valid positive number",
      }));
      return;
    }

    setLoading((prev) => ({ ...prev, [dcId]: true }));
    setErrors((prev) => ({ ...prev, [dcId]: "" }));

    try {
      await api.post(`/api/daily_close/${dcId}/adjust`, {
        new_closing_stock: parsed,
        reason: reason[dcId],
      });

      await fetchAdjustments(dcId);

      setNewClosing((prev) => ({ ...prev, [dcId]: "" }));
      setReason((prev) => ({ ...prev, [dcId]: "" }));
    } catch (err: any) {
      setErrors((prev) => ({
        ...prev,
        [dcId]: err.response?.data?.error || "Adjustment failed",
      }));
    } finally {
      setLoading((prev) => ({ ...prev, [dcId]: false }));
    }
  };

  const renderPreview = (close: Close) => {
    const value = parseInt(newClosing[close.id]);
    if (isNaN(value)) return null;

    const difference = value - close.closing_stock;
    const unitsDelta = -difference;

    return (
      <div className="text-xs mt-2 text-gray-600">
        <div>Units Change: {unitsDelta > 0 ? "+" : ""}{unitsDelta}</div>
      </div>
    );
  };

  const printReport = () => window.print();

  const locked = isLocked();

  return (
    <div className="mt-10 border-t pt-8">
      <h2 className="text-2xl font-bold mb-6 text-indigo-700">
        Daily Close Summary & Adjustments
      </h2>

      {locked && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-6">
          🔒 Daily Close Locked (More than 3 days old)
        </div>
      )}

      {closes.map((close) => (
        <div key={close.id} className="mb-10 bg-white shadow rounded-xl p-6">
          {/* SUMMARY */}
          <div className="mb-4">
            <h3 className="text-lg font-bold text-gray-800">
              {close.product_name}
            </h3>

            <div className="grid grid-cols-3 gap-4 text-sm mt-2">
              <div>Opening: {close.opening_stock}</div>
              <div>Closing: {close.closing_stock}</div>
              <div>Sold: {close.units_sold}</div>
              <div className="text-indigo-700 font-semibold">
                Revenue: KSh {close.revenue.toFixed(2)}
              </div>
              <div className="text-green-700 font-semibold">
                Profit: KSh {close.profit.toFixed(2)}
              </div>
            </div>
          </div>

          {/* ADJUSTMENT FORM */}
          {!locked && (
            <div className="mb-4 space-y-2">
              <div className="flex gap-3">
                <input
                  type="number"
                  placeholder="New Closing"
                  value={newClosing[close.id] || ""}
                  onChange={(e) =>
                    setNewClosing((prev) => ({
                      ...prev,
                      [close.id]: e.target.value,
                    }))
                  }
                  className="border rounded p-2 w-40"
                />

                <input
                  type="text"
                  placeholder="Reason"
                  value={reason[close.id] || ""}
                  onChange={(e) =>
                    setReason((prev) => ({
                      ...prev,
                      [close.id]: e.target.value,
                    }))
                  }
                  className="border rounded p-2 flex-1"
                />

                <button
                  onClick={() => submitAdjustment(close)}
                  disabled={loading[close.id]}
                  className="bg-indigo-600 text-white px-4 py-2 rounded disabled:opacity-50"
                >
                  {loading[close.id] ? "Processing..." : "Adjust"}
                </button>
              </div>

              {renderPreview(close)}

              {errors[close.id] && (
                <div className="text-red-600 text-sm">
                  {errors[close.id]}
                </div>
              )}
            </div>
          )}

          {/* HISTORY TABLE */}
          <table className="w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th>Date</th>
                <th>Prev</th>
                <th>New</th>
                <th>Qty Δ</th>
                <th>Revenue Δ</th>
                <th>Profit Δ</th>
                <th>Reason</th>
                <th>By</th>
              </tr>
            </thead>
            <tbody>
              {(adjustments[close.id] || []).map((a) => (
                <tr key={a.id} className="border-t">
                  <td>{new Date(a.created_at).toLocaleString()}</td>
                  <td>{a.previous_closing_stock}</td>
                  <td>{a.new_closing_stock}</td>
                  <td>{a.quantity_delta}</td>
                  <td>{a.revenue_delta.toFixed(2)}</td>
                  <td>{a.profit_delta.toFixed(2)}</td>
                  <td>{a.reason}</td>
                  <td>{a.created_by}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <button
            onClick={printReport}
            className="mt-4 bg-gray-800 text-white px-4 py-2 rounded"
          >
            Print Report
          </button>
        </div>
      ))}
    </div>
  );
};

export default AdminDailyCloseAdjustments;