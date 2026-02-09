"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";

export default function WaitersDebtorsPage() {
  const [waiters, setWaiters] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchWaiters();
  }, []);

  async function fetchWaiters() {
    const res = await api.get("/api/recon/waiter/list");
    setWaiters(res.data);
  }

  async function createWaiter(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/api/recon/waiter/create", { name: newName });
      setNewName("");
      fetchWaiters();
    } catch (err) {
      alert("Failed to create waiter");
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(waiterId: number, currentStatus: string) {
    try {
      const newStatus = currentStatus === "active" ? "inactive" : "active";
      await api.put(`/api/recon/waiter/${waiterId}/status`, { status: newStatus });
      fetchWaiters();
    } catch (err) {
      alert("Failed to update status");
      console.error(err);
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Waiters & Outstanding Bills</h1>

      {/* Create waiter form */}
      <form onSubmit={createWaiter} className="mb-6 flex gap-2">
        <input
          type="text"
          placeholder="Waiter name"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className="border rounded px-3 py-2 flex-1"
          required
        />
        <button
          type="submit"
          disabled={saving}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          {saving ? "Saving..." : "Add Waiter"}
        </button>
      </form>

      {/* Waiters table */}
      <table className="w-full border-collapse border">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">Name</th>
            <th className="border p-2">Status</th>
            <th className="border p-2">Outstanding Bills</th>
            <th className="border p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {waiters.map((w) => (
            <>
              <tr key={w.id}>
                <td className="border p-2">{w.name}</td>
                <td className="border p-2">{w.status}</td>
                <td className="border p-2">
                  {w.bills?.reduce(
                    (s: number, b: any) => s + (!b.is_settled ? b.total_amount : 0),
                    0
                  )}
                </td>
                <td className="border p-2 flex gap-2">
                  <button
                    onClick={() => setExpanded(expanded === w.id ? null : w.id)}
                    className="bg-blue-500 text-white px-2 py-1 rounded"
                  >
                    {expanded === w.id ? "Hide" : "Expand"}
                  </button>
                  <button
                    onClick={() => toggleStatus(w.id, w.status)}
                    className={`px-2 py-1 rounded ${
                      w.status === "active"
                        ? "bg-red-500 text-white"
                        : "bg-green-500 text-white"
                    }`}
                  >
                    {w.status === "active" ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
              {expanded === w.id && (
                <tr>
                  <td colSpan={4} className="border p-2 bg-gray-50">
                    <ul>
                      {w.bills?.map((b: any) => (
                        <li key={b.id} className="mb-2">
                          <div className="text-sm">
                            {b.description} — KSh {b.total_amount}
                            {b.is_settled ? " (Settled)" : " (Outstanding)"}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
