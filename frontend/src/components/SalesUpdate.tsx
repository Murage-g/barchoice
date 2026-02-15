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

interface Props {
  dailyCloseIds: number[];
  closingStockDate: string;
}

const AdminDailyCloseAdjustments: React.FC<Props> = ({
  dailyCloseIds,
  closingStockDate,
}) => {
  const [adjustments, setAdjustments] = useState<
    Record<number, DailyCloseAdjustment[]>
  >({});

  const [newClosing, setNewClosing] = useState<Record<number, string>>({});
  const [reason, setReason] = useState<Record<number, string>>({});
  const [error, setError] = useState("");

  const isLocked = () => {
    const closeDate = new Date(closingStockDate);
    const now = new Date();
    return now.getTime() > closeDate.getTime() + 3 * 24 * 60 * 60 * 1000;
  };

  const fetchAdjustments = async (dcId: number) => {
    const res = await fetch(`/api/daily_close/${dcId}/adjustments`);
    const data = await res.json();
    setAdjustments((prev) => ({ ...prev, [dcId]: data }));
  };

  useEffect(() => {
    dailyCloseIds.forEach((id) => fetchAdjustments(id));
  }, [dailyCloseIds]);

  const printReport = async () => {
    for (const id of dailyCloseIds) {
      const res = await api.get(`/api/daily_close/${id}/report`);
      console.log(res.data);
    }

    window.print();
  };


  const submitAdjustment = async (dcId: number) => {
    if (!newClosing[dcId] || !reason[dcId]) {
      setError("All fields required");
      return;
    }

    const res = await fetch(`/api/daily_close/${dcId}/adjust`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        new_closing_stock: parseInt(newClosing[dcId]),
        reason: reason[dcId],
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error);
      return;
    }

    fetchAdjustments(dcId);
    setNewClosing({ ...newClosing, [dcId]: "" });
    setReason({ ...reason, [dcId]: "" });
  };

  return (
    <div className="mt-8 border-t pt-6">
      <h2 className="text-xl font-bold mb-4">Daily Close Adjustments</h2>

      {dailyCloseIds.map((dcId) => (
        <div key={dcId} className="mb-6 border rounded p-4">
          <h4 className="font-semibold mb-2">Daily Close ID: {dcId}</h4>

          {!isLocked() && (
            <div className="flex gap-2 mb-3">
              <input
                type="number"
                placeholder="New Closing"
                value={newClosing[dcId] || ""}
                onChange={(e) =>
                  setNewClosing({
                    ...newClosing,
                    [dcId]: e.target.value,
                  })
                }
                className="border p-2"
              />
              <input
                type="text"
                placeholder="Reason"
                value={reason[dcId] || ""}
                onChange={(e) =>
                  setReason({
                    ...reason,
                    [dcId]: e.target.value,
                  })
                }
                className="border p-2"
              />
              <button
                onClick={() => submitAdjustment(dcId)}
                className="bg-blue-600 text-white px-4 py-2"
              >
                Adjust
              </button>
            </div>
          )}

          <table className="w-full border text-sm">
            <thead>
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
              {(adjustments[dcId] || []).map((a) => (
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

          <button
            onClick={printReport}
            className="bg-blue-600 text-white px-4 py-2 rounded mt-4"
          >
            Print End of Day Report
          </button>

        </div>
      ))}
    </div>
  );
};

export default AdminDailyCloseAdjustments;
