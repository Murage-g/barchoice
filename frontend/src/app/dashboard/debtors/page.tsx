"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import ProtectedRoute from "@/components/ProtectedRoute";

type Debtor = { id: number; name: string; phone?: string; total_debt: number };

export default function DebtorsPage() {
  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDebtors();
  }, []);

  async function fetchDebtors() {
    try {
      const res = await api.get("/api/recon/debtor/list");
      setDebtors(res.data || []);
    } catch (err) {
      console.error("Failed to fetch debtors", err);
    }
  }

  async function createDebtor(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/api/recon/debtor/create", { name, phone });
      setName("");
      setPhone("");
      fetchDebtors();
    } catch (err) {
      console.error("Failed to create debtor", err);
      alert("Failed to create debtor");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div className="p-6 min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-white p-4 rounded shadow">
            <h2 className="text-lg font-semibold mb-4">Create Debtor</h2>
            <form onSubmit={createDebtor} className="space-y-3">
              <input
                type="text"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border rounded px-3 py-2"
                required
              />
              <input
                type="text"
                placeholder="Phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full border rounded px-3 py-2"
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-indigo-600 text-white px-4 py-2 rounded"
              >
                {loading ? "Saving..." : "Add Debtor"}
              </button>
            </form>
          </div>

          <div className="bg-white p-4 rounded shadow">
            <h2 className="text-lg font-semibold mb-4">Debtors List</h2>
            <table className="w-full border-collapse border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2">Name</th>
                  <th className="border p-2">Phone</th>
                  <th className="border p-2">Total Debt</th>
                </tr>
              </thead>
              <tbody>
                {debtors.map((d) => (
                  <tr key={d.id}>
                    <td className="border p-2">{d.name}</td>
                    <td className="border p-2">{d.phone || "-"}</td>
                    <td className="border p-2">KSh {d.total_debt.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
