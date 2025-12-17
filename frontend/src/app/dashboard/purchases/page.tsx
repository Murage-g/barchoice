"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";

interface Supplier {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  unit_price: number;
}

interface Purchase {
  id: number;
  product_name: string;
  supplier_name: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  purchase_date: string;
}

export default function PurchasesPage() {
  const router = useRouter();
  const [authenticated, setAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [purchaseReport, setPurchaseReport] = useState<Purchase[]>([]);
  const [totalSpent, setTotalSpent] = useState(0);

  const [form, setForm] = useState({
    product_id: "",
    supplier_id: "",
    quantity: "",
    unit_cost: "",
  });

  const [newSupplier, setNewSupplier] = useState({
    name: "",
    contact_person: "",
    phone: "",
    email: "",
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await api.get("/utils/decorators/check");
      if (res.data?.role && ["admin", "cashier"].includes(res.data.role)) {
        setAuthenticated(true);
        setUserRole(res.data.role);
        fetchInitialData();
      } else router.push("/login");
    } catch {
      router.push("/login");
    }
  };

  const fetchInitialData = async () => {
    await Promise.all([fetchSuppliers(), fetchProducts(), fetchPurchaseReport()]);
  };

  const fetchSuppliers = async () => {
    const res = await api.get("/suppliers");
    setSuppliers(res.data);
  };

  const fetchProducts = async () => {
    const res = await api.get("/products");
    setProducts(res.data);
  };

  const fetchPurchaseReport = async () => {
    const res = await api.get("/purchases/report");
    setPurchaseReport(res.data.purchases || []);
    setTotalSpent(res.data.total_spent || 0);
  };

  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/purchases", {
        product_id: Number(form.product_id),
        supplier_id: Number(form.supplier_id),
        quantity: Number(form.quantity),
        unit_cost: parseFloat(form.unit_cost),
      });
      alert("✅ Purchase recorded successfully!");
      await Promise.all([fetchPurchaseReport(), fetchProducts()]);
      setForm({ product_id: "", supplier_id: "", quantity: "", unit_cost: "" });
    } catch (err: any) {
      alert(err.response?.data?.error || "Error adding purchase");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSupplier = async () => {
    if (!newSupplier.name.trim()) {
      alert("Supplier name required");
      return;
    }
    try {
      await api.post("/suppliers", newSupplier);
      alert("✅ Supplier added successfully!");
      fetchSuppliers();
      setNewSupplier({ name: "", contact_person: "", phone: "", email: "" });
    } catch (err: any) {
      alert(err.response?.data?.error || "Error creating supplier");
    }
  };

  useEffect(() => {
    if (form.product_id) {
      const selected = products.find((p) => p.id === Number(form.product_id));
      if (selected) setForm((f) => ({ ...f, unit_cost: selected.unit_price.toString() }));
    }
  }, [form.product_id, products]);

  if (!authenticated)
    return (
      <p className="text-center mt-10 text-gray-500 text-lg animate-pulse font-medium">
        Checking authentication.
      </p>
    );

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen p-6 sm:p-10 font-[Inter] text-gray-800">
      <div className="max-w-4xl mx-auto space-y-10">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl sm:text-4xl font-bold text-indigo-700 tracking-tight">
            Purchases & Stock Inflow
          </h1>
          <p className="text-gray-600 mt-2 text-sm sm:text-base">
            Manage supplier purchases and track stock inflow in one view
          </p>
        </div>

        {/* Record Purchase */}
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-lg p-6 border border-gray-100">
          <h2 className="text-xl font-semibold text-indigo-700 mb-2">
            🧾 Record New Purchase
          </h2>
          <p className="text-gray-500 text-sm mb-5">
            Add stock to inventory. This updates both quantity and cost price.
          </p>

          <form onSubmit={handlePurchaseSubmit} className="space-y-4">
            <select
              className="w-full border border-gray-200 rounded-2xl p-3 text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
              value={form.product_id}
              onChange={(e) => setForm({ ...form, product_id: e.target.value })}
              required
            >
              <option value="">Select Product</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <select
              className="w-full border border-gray-200 rounded-2xl p-3 text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
              value={form.supplier_id}
              onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
              required
            >
              <option value="">Select Supplier</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>

            <input
              type="number"
              placeholder="Quantity"
              className="w-full border border-gray-200 rounded-2xl p-3 text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
              value={form.quantity}
              onChange={(e) => setForm({ ...form, quantity: e.target.value })}
              required
            />

            <div className="flex items-center space-x-2">
              <input
                type="number"
                step="0.01"
                placeholder="Unit Cost"
                className="flex-1 border border-gray-200 rounded-2xl p-3 text-sm focus:ring-2 focus:ring-indigo-400 outline-none"
                value={form.unit_cost}
                onChange={(e) => setForm({ ...form, unit_cost: e.target.value })}
                required
              />
              <button
                type="button"
                className="bg-indigo-50 text-indigo-700 text-xs px-4 py-2 rounded-xl border border-indigo-100 hover:bg-indigo-100 transition"
                onClick={() => {
                  const selected = products.find(
                    (p) => p.id === Number(form.product_id)
                  );
                  if (selected)
                    setForm((f) => ({
                      ...f,
                      unit_cost: selected.unit_price.toString(),
                    }));
                }}
              >
                Refresh
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-3 rounded-2xl text-sm font-semibold hover:bg-indigo-700 transition shadow-sm"
            >
              {loading ? "Recording." : "➕ Add Purchase"}
            </button>
          </form>
        </div>

        {/* Add Supplier */}
        <div className="bg-white/90 rounded-3xl shadow-lg p-6 border border-gray-100">
          <h3 className="text-xl font-semibold text-green-700 mb-4">👥 Add New Supplier</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Supplier Name"
              value={newSupplier.name}
              onChange={(e) => setNewSupplier({ .newSupplier, name: e.target.value })}
              className="w-full border border-gray-200 rounded-2xl p-3 text-sm focus:ring-2 focus:ring-green-400 outline-none"
            />
            <input
              type="text"
              placeholder="Contact Person"
              value={newSupplier.contact_person}
              onChange={(e) =>
                setNewSupplier({ .newSupplier, contact_person: e.target.value })
              }
              className="w-full border border-gray-200 rounded-2xl p-3 text-sm focus:ring-2 focus:ring-green-400 outline-none"
            />
            <input
              type="text"
              placeholder="Phone"
              value={newSupplier.phone}
              onChange={(e) =>
                setNewSupplier({ .newSupplier, phone: e.target.value })
              }
              className="w-full border border-gray-200 rounded-2xl p-3 text-sm focus:ring-2 focus:ring-green-400 outline-none"
            />
            <input
              type="email"
              placeholder="Email"
              value={newSupplier.email}
              onChange={(e) =>
                setNewSupplier({ .newSupplier, email: e.target.value })
              }
              className="w-full border border-gray-200 rounded-2xl p-3 text-sm focus:ring-2 focus:ring-green-400 outline-none"
            />
          </div>
          <button
            onClick={handleCreateSupplier}
            className="mt-4 w-full bg-green-600 text-white py-3 rounded-2xl text-sm font-semibold hover:bg-green-700 transition shadow-sm"
          >
            💾 Save Supplier
          </button>
        </div>

        {/* Purchase History */}
        <div className="bg-white/90 rounded-3xl shadow-lg p-6 border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-indigo-700">📜 Purchase History</h3>
            <button
              onClick={fetchPurchaseReport}
              className="bg-gray-100 text-gray-700 text-xs px-4 py-2 rounded-xl border hover:bg-gray-200 transition"
            >
              Refresh
            </button>
          </div>

          {purchaseReport.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border border-gray-100 rounded-xl">
                <thead className="bg-indigo-50 text-indigo-700">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">Date</th>
                    <th className="px-4 py-3 text-left font-semibold">Product</th>
                    <th className="px-4 py-3 text-left font-semibold">Supplier</th>
                    <th className="px-4 py-3 text-left font-semibold">Qty</th>
                    <th className="px-4 py-3 text-left font-semibold">Unit</th>
                    <th className="px-4 py-3 text-left font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {purchaseReport.map((p) => (
                    <tr
                      key={p.id}
                      className="border-t hover:bg-indigo-50 transition"
                    >
                      <td className="px-4 py-2 text-gray-700">
                        {new Date(p.purchase_date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2 text-gray-800 font-medium">{p.product_name}</td>
                      <td className="px-4 py-2 text-gray-700">{p.supplier_name}</td>
                      <td className="px-4 py-2 text-center">{p.quantity}</td>
                      <td className="px-4 py-2 text-right">{p.unit_cost.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right font-semibold text-indigo-700">
                        {p.total_cost.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <p className="text-right mt-5 text-gray-700 font-semibold">
                💰 Total Spent:{" "}
                <span className="text-indigo-700">
                  Ksh {totalSpent.toLocaleString()}
                </span>
              </p>
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8 text-sm">
              No purchases recorded yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
