// app/dashboard/expenses/page.tsx
"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import ProtectedRoute from "@/components/ProtectedRoute";

type Expense = {
  id: number;
  date: string;
  category?: string;
  description?: string;
  amount: number;
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ date: "", category: "", description: "", amount: "" });
  const [editing, setEditing] = useState<number | null>(null);

  useEffect(() => {
    fetchExpenses();
  }, []);

  async function fetchExpenses(date?: string) {
    setLoading(true);
    try {
      const url = date ? `/expenses?date=${date}` : "/expenses";
      const res = await api.get(url);
      setExpenses(res.data || []);
    } catch (err) {
      console.error("Failed to fetch expenses", err);
    } finally {
      setLoading(false);
    }
  }

  async function submitExpense(e: React.FormEvent) {
    e.preventDefault();
    try {
      const body = {
        date: form.date || undefined,
        category: form.category,
        description: form.description,
        amount: parseFloat(form.amount || "0"),
      };
      if (editing) {
        await api.put(`/expenses/${editing}`, body);
        setEditing(null);
      } else {
        await api.post("/expenses", body);
      }
      setForm({ date: "", category: "", description: "", amount: "" });
      fetchExpenses();
    } catch (err: any) {
      alert(err?.response?.data?.error || "Error saving expense");
    }
  }

  async function startEdit(e: Expense) {
    setEditing(e.id);
    setForm({ date: e.date?.split("T")[0] || "", category: e.category || "", description: e.description || "", amount: e.amount.toString() });
  }

  async function deleteExpense(id: number) {
    if (!confirm("Delete this expense?")) return;
    try {
      await api.delete(`/expenses/${id}`);
      fetchExpenses();
    } catch (err) {
      alert("Failed to delete");
    }
  }

  const total = expenses.reduce((s, x) => s + Number(x.amount || 0), 0);

  return (
    <ProtectedRoute allowedRoles={["admin", "cashier"]}>
      <div className="p-4 min-h-screen bg-gray-50">
        <div className="max-w-lg mx-auto space-y-6">
          <div className="bg-white rounded-2xl p-4 shadow">
            <h2 className="text-lg font-semibold text-gray-800">Add / Edit Expense</h2>
            <form className="mt-3 space-y-3" onSubmit={submitExpense}>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full border rounded-xl p-3 text-sm"
              />
              <input
                placeholder="Category (eg. Utilities)"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full border rounded-xl p-3 text-sm"
              />
              <input
                placeholder="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border rounded-xl p-3 text-sm"
              />
              <input
                type="number"
                step="0.01"
                placeholder="Amount"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
                className="w-full border rounded-xl p-3 text-sm"
              />
              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-indigo-600 text-white py-3 rounded-xl text-sm font-medium">
                  {editing ? "Update Expense" : "Add Expense"}
                </button>
                <button
                  type="button"
                  onClick={() => { setEditing(null); setForm({ date: "", category: "", description: "", amount: "" }); }}
                  className="bg-gray-100 text-sm px-3 py-3 rounded-xl"
                >
                  Clear
                </button>
              </div>
            </form>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-md font-semibold text-gray-700">Recent Expenses</h3>
              <span className="text-sm text-gray-500">Total: KSh {total.toFixed(2)}</span>
            </div>

            {loading ? (
              <p className="text-center text-gray-500 py-6">Loading.</p>
            ) : expenses.length === 0 ? (
              <p className="text-center text-gray-500 py-6">No expenses yet</p>
            ) : (
              <ul className="space-y-2">
                {expenses.map((e) => (
                  <li key={e.id} className="flex justify-between items-start bg-gray-50 p-3 rounded-lg">
                    <div>
                      <div className="text-sm font-medium text-gray-800">{e.category || "Expense"}</div>
                      <div className="text-xs text-gray-500">{e.description}</div>
                      <div className="text-xs text-gray-400">{new Date(e.date).toLocaleDateString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-gray-800">KSh {Number(e.amount).toFixed(2)}</div>
                      <div className="mt-2 flex gap-2 justify-end">
                        <button onClick={() => startEdit(e)} className="text-xs px-2 py-1 bg-yellow-100 rounded">Edit</button>
                        <button onClick={() => deleteExpense(e.id)} className="text-xs px-2 py-1 bg-red-100 rounded">Delete</button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
