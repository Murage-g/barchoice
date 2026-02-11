"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";

export default function WaitersDebtorsPage() {
  const [waiters, setWaiters] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  const [page, setPage] = useState(1);
  const [perPage] = useState(10);
  const [status, setStatus] = useState("active");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("outstanding_desc");

  const [meta, setMeta] = useState<any>({});

  useEffect(() => {
    fetchWaiters();
  }, [page, status, search, sort]);

  async function fetchWaiters() {
    const res = await api.get("/api/recon/waiter/list", {
      params: { page, per_page: perPage, status, search, sort },
    });

    setWaiters(res.data.items);
    setMeta(res.data);
  }

  async function createWaiter(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post("/api/recon/waiter/create", {
        name: newName,
        daily_salary: 0,
      });
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

  async function settleBill(billId: number) {
    try {
      await api.put(`/api/recon/waiter/bill/${billId}/settle`);
      fetchWaiters();
    } catch (err) {
      alert("Failed to settle bill");
      console.error(err);
    }
  }

  async function exportCSV() {
    window.open(
      `${process.env.NEXT_PUBLIC_API_URL}/api/recon/waiter/list?export=csv&status=${status}&search=${search}&sort=${sort}`
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Waiters & Outstanding Bills</h1>

      {/* CONTROLS */}
      <div className="flex gap-3 mb-4">
        <input
          placeholder="Search waiter..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="border px-3 py-2"
        />

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border px-3 py-2"
        >
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="">All</option>
        </select>

        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="border px-3 py-2"
        >
          <option value="outstanding_desc">Highest Outstanding</option>
          <option value="outstanding_asc">Lowest Outstanding</option>
        </select>

        <button
          onClick={exportCSV}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Export CSV
        </button>
      </div>

      {/* CREATE FORM */}
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

      {/* TABLE */}
      <table className="w-full border-collapse border">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">Name</th>
            <th className="border p-2">Status</th>
            <th className="border p-2">Outstanding (KSh)</th>
            <th className="border p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {waiters.map((w) => (
            <>
              <tr key={w.id}>
                <td className="border p-2">{w.name}</td>
                <td className="border p-2">{w.status}</td>
                <td className="border p-2">{w.total_outstanding}</td>
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
                        <li key={b.id} className="mb-2 flex justify-between">
                          <span>
                            {b.description} — KSh {b.total_amount}
                            {b.is_settled ? " (Settled)" : " (Outstanding)"}
                          </span>

                          {!b.is_settled && (
                            <button
                              onClick={() => settleBill(b.id)}
                              className="bg-purple-600 text-white px-2 py-1 rounded"
                            >
                              Mark Settled
                            </button>
                          )}
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

      {/* PAGINATION */}
      <div className="flex gap-3 mt-4">
        <button
          disabled={!meta.has_prev}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="border px-3 py-2"
        >
          Prev
        </button>

        <span>
          Page {meta.page} of {meta.pages}
        </span>

        <button
          disabled={!meta.has_next}
          onClick={() => setPage((p) => p + 1)}
          className="border px-3 py-2"
        >
          Next
        </button>
      </div>
    </div>
  );
}
