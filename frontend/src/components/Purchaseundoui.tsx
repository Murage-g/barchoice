"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";

type Purchase = {
  id: number;
  product_id: number;
  product_name: string;
  supplier_name: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  purchase_date: string;
};

export default function UndoPurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [reason, setReason] = useState("");
  const [preview, setPreview] = useState<any[]>([]);

  useEffect(() => {
    fetchPurchases();
  }, []);

  async function fetchPurchases() {
    try {
      const res = await api.get("/api/purchases/report");
      setPurchases(res.data.purchases || []);
    } catch (err) {
      console.error(err);
      alert("Failed to load purchases");
    }
  }

  const filtered = purchases.filter((p) =>
    `${p.product_name} ${p.supplier_name}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  function toggleSelect(id: number) {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : [...prev, id]
    );
  }

  function buildPreview() {
    const impacts = selected.map((id) => {
      const p = purchases.find((x) => x.id === id);
      if (!p) return null;
      return {
        id: p.id,
        product: p.product_name,
        qty_change: -p.quantity, // stock will go DOWN
        total_cost: p.total_cost,
      };
    }).filter(Boolean);

    setPreview(impacts);
  }

  async function undoPurchases() {
    if (!reason.trim()) {
      alert("Please provide a reason for undoing.");
      return;
    }

    if (selected.length === 0) {
      alert("Select at least one purchase to undo.");
      return;
    }

    if (
      !confirm(
        `You are about to undo ${selected.length} purchase(s). This will reduce stock. Continue?`
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      await api.post("/api/purchases/undo", {
        purchase_ids: selected,
        reason,
      });

      alert("Purchase(s) undone successfully");
      setSelected([]);
      setReason("");
      fetchPurchases();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || "Undo failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-xl font-bold mb-4">Undo Purchases (Safe Mode)</h1>

      <div className="bg-yellow-50 border border-yellow-300 p-3 mb-4 text-sm">
        ⚠️ Undoing a purchase will <b>reduce product stock</b>.  
        Only use this if the purchase was recorded in error.
      </div>

      {/* SEARCH */}
      <input
        placeholder="Search by product or supplier..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="border px-3 py-2 w-full mb-4"
      />

      {/* TABLE */}
      <table className="w-full border-collapse border">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2"></th>
            <th className="border p-2">Date</th>
            <th className="border p-2">Product</th>
            <th className="border p-2">Supplier</th>
            <th className="border p-2">Qty</th>
            <th className="border p-2">Unit Cost</th>
            <th className="border p-2">Total</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((p) => (
            <tr key={p.id}>
              <td className="border p-2 text-center">
                <input
                  type="checkbox"
                  checked={selected.includes(p.id)}
                  onChange={() => toggleSelect(p.id)}
                />
              </td>
              <td className="border p-2">{p.purchase_date}</td>
              <td className="border p-2">{p.product_name}</td>
              <td className="border p-2">{p.supplier_name}</td>
              <td className="border p-2">{p.quantity}</td>
              <td className="border p-2">KSh {p.unit_cost}</td>
              <td className="border p-2">KSh {p.total_cost}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* ACTIONS */}
      <div className="mt-4 flex gap-3 items-start">
        <div className="flex-1">
          <textarea
            placeholder="Reason for undoing (e.g., wrong supplier, wrong quantity, duplicate entry)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="border w-full p-2"
            rows={3}
          />
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={buildPreview}
            disabled={selected.length === 0}
            className="bg-gray-700 text-white px-4 py-2 rounded"
          >
            Preview Impact
          </button>

          <button
            onClick={undoPurchases}
            disabled={loading || selected.length === 0}
            className="bg-red-600 text-white px-4 py-2 rounded"
          >
            {loading ? "Undoing..." : "Undo Selected"}
          </button>
        </div>
      </div>

      {/* PREVIEW PANEL */}
      {preview.length > 0 && (
        <div className="mt-6 bg-gray-50 border p-4">
          <h3 className="font-semibold mb-2">Stock Impact Preview</h3>
          <table className="w-full border">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2">Purchase ID</th>
                <th className="border p-2">Product</th>
                <th className="border p-2">Stock Change</th>
                <th className="border p-2">Cost Reversed</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((r) => (
                <tr key={r.id}>
                  <td className="border p-2">{r.id}</td>
                  <td className="border p-2">{r.product}</td>
                  <td className="border p-2 text-red-600">
                    {r.qty_change}
                  </td>
                  <td className="border p-2">KSh {r.total_cost}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
