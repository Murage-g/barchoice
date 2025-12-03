// app/dashboard/reconciliation/page.tsx
"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import ProtectedRoute from "@/components/ProtectedRoute";

type Line = { kind: "expense" | "sale" | "other"; description?: string; amount: string };

export default function ReconciliationPage() {
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [salesTotal, setSalesTotal] = useState<number>(0);
  const [expensesTotal, setExpensesTotal] = useState<number>(0);
  const [mpesa1, setMpesa1] = useState<string>("0");
  const [mpesa2, setMpesa2] = useState<string>("0");
  const [mpesa3, setMpesa3] = useState<string>("0");
  const [cashOnHand, setCashOnHand] = useState<string>("0");
  const [lines, setLines] = useState<Line[]>([]);
  const [notes, setNotes] = useState<string>("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSummary();
  }, [date]);

  async function fetchSummary() {
    try {
      const res = await api.get(`/recon/summary?date=${date}`);
      setSalesTotal(res.data.total_sales || 0);
      setExpensesTotal(res.data.total_expenses || 0);
    } catch (err) {
      console.error("Failed to fetch summary", err);
    }
  }

  function addLine() {
    setLines((s) => [...s, { kind: "other", description: "", amount: "0" }]);
  }
  function updateLine(idx: number, patch: Partial<Line>) {
    setLines((s) => s.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  }
  function removeLine(idx: number) {
    setLines((s) => s.filter((_, i) => i !== idx));
  }

  const mpesaTotal = Number(mpesa1 || 0) + Number(mpesa2 || 0) + Number(mpesa3 || 0);
  const linesTotal = lines.reduce((s, l) => s + Number(l.amount || 0), 0);
  const expectedCash = salesTotal - linesTotal; // naive, adapt as you need
  const countedCash = Number(cashOnHand || 0) + mpesaTotal;
  const difference = countedCash - salesTotal + linesTotal; // positive: surplus

  async function submitReconc() {
    if (!confirm("Save reconciliation?")) return;
    setSaving(true);
    try {
      const payload = {
        date,
        mpesa1: Number(mpesa1 || 0),
        mpesa2: Number(mpesa2 || 0),
        mpesa3: Number(mpesa3 || 0),
        cash_on_hand: Number(cashOnHand || 0),
        notes,
        lines: lines.map((l) => ({ kind: l.kind, description: l.description, amount: Number(l.amount || 0) })),
      };
      const res = await api.post("/recon/create", payload);
      alert("Saved");
      // reset
      setLines([]);
      setNotes("");
      setMpesa1("0"); setMpesa2("0"); setMpesa3("0"); setCashOnHand("0");
      fetchSummary();
    } catch (err) {
      alert("Failed to save");
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ProtectedRoute allowedRoles={["admin", "cashier"]}>
      <div className="p-4 min-h-screen bg-gray-50">
        <div className="max-w-lg mx-auto space-y-6">
          <div className="bg-white rounded-2xl p-4 shadow">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-800">Reconciliation</h2>
              <input type="date" value={date} onChange={(e)=>setDate(e.target.value)} className="border rounded px-2 py-1 text-sm"/>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="bg-indigo-50 p-3 rounded">
                <div className="text-xs text-gray-500">Sales (from system)</div>
                <div className="text-lg font-bold text-indigo-700">KSh {salesTotal.toFixed(2)}</div>
              </div>
              <div className="bg-red-50 p-3 rounded">
                <div className="text-xs text-gray-500">Expenses recorded</div>
                <div className="text-lg font-bold text-red-600">KSh {expensesTotal.toFixed(2)}</div>
              </div>
            </div>

            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700">Cash & Mpesa</h3>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <input className="border rounded p-2 text-sm" placeholder="Mpesa 1" value={mpesa1} onChange={(e)=>setMpesa1(e.target.value)} />
                <input className="border rounded p-2 text-sm" placeholder="Mpesa 2" value={mpesa2} onChange={(e)=>setMpesa2(e.target.value)} />
                <input className="border rounded p-2 text-sm" placeholder="Mpesa 3" value={mpesa3} onChange={(e)=>setMpesa3(e.target.value)} />
                <input className="border rounded p-2 text-sm" placeholder="Cash on hand" value={cashOnHand} onChange={(e)=>setCashOnHand(e.target.value)} />
              </div>
              <div className="text-xs text-gray-500 mt-2">Mpesa total: KSh {mpesaTotal.toFixed(2)}</div>
            </div>

            <div className="mt-4">
              <h3 className="text-sm font-medium text-gray-700">Adjustments / Lines</h3>
              <div className="space-y-2 mt-2">
                {lines.map((l, i) => (
                  <div key={i} className="flex gap-2">
                    <select value={l.kind} onChange={(e)=>updateLine(i, { kind: e.target.value as any })} className="w-1/3 border rounded px-2 py-1 text-sm">
                      <option value="expense">Expense</option>
                      <option value="sale">Sale</option>
                      <option value="other">Other</option>
                    </select>
                    <input value={l.description} onChange={(e)=>updateLine(i, { description: e.target.value })} placeholder="Description" className="flex-1 border rounded px-2 py-1 text-sm"/>
                    <input value={l.amount} onChange={(e)=>updateLine(i, { amount: e.target.value })} placeholder="Amount" className="w-28 border rounded px-2 py-1 text-sm"/>
                    <button onClick={()=>removeLine(i)} className="bg-red-100 text-red-700 px-2 rounded text-sm">Del</button>
                  </div>
                ))}
                <button onClick={addLine} className="mt-2 text-sm bg-gray-100 px-3 py-2 rounded">Add Line</button>
                <div className="mt-3 text-sm text-gray-600">Lines total: KSh {linesTotal.toFixed(2)}</div>
              </div>
            </div>

            <div className="mt-4">
              <label className="text-sm text-gray-600">Notes</label>
              <textarea value={notes} onChange={(e)=>setNotes(e.target.value)} className="w-full border rounded p-2 text-sm" rows={3} />
            </div>

            <div className="mt-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-xs text-gray-500">Counted vs Sales</div>
                  <div className="text-lg font-bold">{difference >= 0 ? <span className="text-green-700">Surplus KSh {difference.toFixed(2)}</span> : <span className="text-red-600">Shortfall KSh {Math.abs(difference).toFixed(2)}</span>}</div>
                </div>
                <button onClick={submitReconc} disabled={saving} className="bg-indigo-600 text-white px-4 py-2 rounded">
                  {saving ? "Saving..." : "Save Reconciliation"}
                </button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </ProtectedRoute>
  );
}
