// file: components/SpecialStockManagement.tsx
"use client";

import React, { useState, useEffect } from "react";
import api from "@/lib/api";

interface Product {
  id: number;
  name: string;
  stock: number;
  cost_price: number;
}

export default function SpecialStockManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [form, setForm] = useState({
    product_id: "",
    quantity: "",
    reason: "",
    unit_price: "",
    is_wholesale: false,
    is_cost_sale: false,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    const res = await api.get("/api/products");
    setProducts(res.data);
  };

  const handleNonStandardSale = async () => {
    if (!form.product_id || !form.quantity) return alert("Select product and quantity");
    setLoading(true);
    try {
      await api.post("/api/special/sales/add", {
        product_id: Number(form.product_id),
        quantity: Number(form.quantity),
        unit_price: parseFloat(form.unit_price),
        is_wholesale: form.is_wholesale,
        is_cost_sale: form.is_cost_sale,
      });
      alert("✅ Sale recorded");
      setForm({ product_id: "", quantity: "", reason: "", unit_price: "", is_wholesale: false, is_cost_sale: false });
      fetchProducts();
    } catch (err: any) {
      alert(err.response?.data?.error || "Error recording sale");
    } finally {
      setLoading(false);
    }
  };

  const handleDamagedStock = async () => {
    if (!form.product_id || !form.quantity || !form.reason) return alert("Provide product, quantity and reason");
    setLoading(true);
    try {
      await api.post("/api/special/stock/damage", {
        product_id: Number(form.product_id),
        quantity: Number(form.quantity),
        reason: form.reason,
      });
      alert("✅ Damaged stock recorded");
      setForm({ ...form, product_id: "", quantity: "", reason: "" });
      fetchProducts();
    } catch (err: any) {
      alert(err.response?.data?.error || "Error recording damaged stock");
    } finally {
      setLoading(false);
    }
  };

  const handleOffer = async () => {
    if (!form.product_id || !form.quantity) return alert("Provide product and quantity");
    setLoading(true);
    try {
      await api.post("/api/special/offers/add", {
        product_id: Number(form.product_id),
        quantity: Number(form.quantity),
      });
      alert("✅ Offer added");
      setForm({ ...form, product_id: "", quantity: "" });
      fetchProducts();
    } catch (err: any) {
      alert(err.response?.data?.error || "Error adding offer");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow p-6 space-y-4">
      <h2 className="text-xl font-semibold text-indigo-700">Special Stock Management</h2>

      <select
        value={form.product_id}
        onChange={(e) => setForm({ ...form, product_id: e.target.value })}
        className="w-full border rounded p-2"
      >
        <option value="">Select Product</option>
        {products.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name} (Stock: {p.stock})
          </option>
        ))}
      </select>

      <input
        type="number"
        placeholder="Quantity"
        className="w-full border rounded p-2"
        value={form.quantity}
        onChange={(e) => setForm({ ...form, quantity: e.target.value })}
      />

      {/* Non-standard sale options */}
      <input
        type="number"
        placeholder="Unit Price (for sale)"
        className="w-full border rounded p-2"
        value={form.unit_price}
        onChange={(e) => setForm({ ...form, unit_price: e.target.value })}
      />
      <div className="flex gap-4 items-center">
        <label>
          <input
            type="checkbox"
            checked={form.is_wholesale}
            onChange={(e) => setForm({ ...form, is_wholesale: e.target.checked })}
          /> Wholesale
        </label>
        <label>
          <input
            type="checkbox"
            checked={form.is_cost_sale}
            onChange={(e) => setForm({ ...form, is_cost_sale: e.target.checked })}
          /> Sold at Cost
        </label>
      </div>
      <button onClick={handleNonStandardSale} disabled={loading} className="bg-indigo-600 text-white px-4 py-2 rounded">
        Record Sale
      </button>

      {/* Damaged stock */}
      <input
        type="text"
        placeholder="Reason for damage"
        className="w-full border rounded p-2"
        value={form.reason}
        onChange={(e) => setForm({ ...form, reason: e.target.value })}
      />
      <button onClick={handleDamagedStock} disabled={loading} className="bg-red-600 text-white px-4 py-2 rounded">
        Record Damaged Stock
      </button>

      {/* Offers */}
      <button onClick={handleOffer} disabled={loading} className="bg-green-600 text-white px-4 py-2 rounded">
        Add Offer / Free Product
      </button>
    </div>
  );
}