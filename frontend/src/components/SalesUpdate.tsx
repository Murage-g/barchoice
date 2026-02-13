"use client";

import React, { useEffect, useState } from "react";

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

interface Props {
  dailyCloseId: number;
  closingStockDate: string;
}

const AdminDailyCloseAdjustments: React.FC<Props> = ({
  dailyCloseId,
  closingStockDate,
}) => {
  const [adjustments, setAdjustments] = useState<DailyCloseAdjustment[]>([]);
  const [newClosing, setNewClosing] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const isLocked =
    new Date().getTime() >
    new Date(closingStockDate).getTime() + 3 * 24 * 60 * 60 * 1000;

  const fetchAdjustments = async () => {
    const res = await fetch(`/api/daily_close/${dailyCloseId}/adjustments`);
    const data = await res.json();
    setAdjustments(data);
  };

  useEffect(() => {
    fetchAdjustments();
  }, [dailyCloseId]);

  const submitAdjustment = async () => {
    setError("");
    if (!newClosing || !reason) {
      setError("All fields required");
      return;
    }

    const res = await fetch(`/api/daily_close/${dailyCloseId}/adjust`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        new_closing_stock: parseInt(newClosing),
        reason,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error);
      return;
    }

    setNewClosing("");
    setReason("");
    fetchAdjustments();
  };

  return (
    <div className="mt-6 border-t pt-4">
      <h3 className="text-lg font-semibold">Closing Stock Adjustments</h3>

      {isLocked && (
        <div className="text-red-500 mb-3">
          Daily close locked after 3 days
        </div>
      )}

      {!isLocked && (
        <div className="flex gap-2 mb-4">
          <input
            type="number"
            placeholder="New Closing Stock"
            value={newClosing}
            onChange={(e) => setNewClosing(e.target.value)}
            className="border p-2"
          />
          <input
            type="text"
            placeholder="Reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="border p-2"
          />
          <button
            onClick={submitAdjustment}
            className="bg-blue-500 text-white px-4 py-2"
          >
            Adjust
          </button>
        </div>
      )}

      {error && <div className="text-red-500 mb-2">{error}</div>}

      <table className="w-full border">
        <thead>
          <tr>
            <th>Date</th>
            <th>Prev Closing</th>
            <th>New Closing</th>
            <th>Qty Delta</th>
            <th>Revenue Delta</th>
            <th>Profit Delta</th>
            <th>Reason</th>
            <th>By</th>
          </tr>
        </thead>
        <tbody>
          {adjustments.map((a) => (
            <tr key={a.id}>
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
    </div>
  );
};

export default AdminDailyCloseAdjustments;