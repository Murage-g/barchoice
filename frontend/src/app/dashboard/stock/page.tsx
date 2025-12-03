"use client";

import { useState, useEffect } from "react";
import { Trash2, PackagePlus, Loader2, ArrowUpDown } from "lucide-react";
import api from "@/lib/api";

interface Product {
  id: number;
  name: string;
  stock: number;
  unit_price: number;
  cost_price: number;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortAsc, setSortAsc] = useState(true);
  const [form, setForm] = useState({
    name: "",
    stock: "",
    unit_price: "",
    cost_price: "",
  });
  const [deleting, setDeleting] = useState<number | null>(null);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get("/products");
      setProducts(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const addProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post("/products", {
        name: form.name.trim(),
        stock: parseInt(form.stock),
        unit_price: parseFloat(form.unit_price),
        cost_price: parseFloat(form.cost_price),
      });
      alert(res.data.message);
      setForm({ name: "", stock: "", unit_price: "", cost_price: "" });
      fetchProducts();
    } catch (err: any) {
      alert(err.response?.data?.error || "Error adding product");
    }
  };

  const deleteProduct = async (id: number) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    setDeleting(id);
    try {
      await api.delete(`/products/${id}`);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert("Error deleting product");
    } finally {
      setDeleting(null);
    }
  };

  const toggleSort = () => {
    setSortAsc(!sortAsc);
    const sorted = [...products].sort((a, b) =>
      sortAsc ? b.id - a.id : a.id - b.id
    );
    setProducts(sorted);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 px-4 py-6">
      <div className="max-w-5xl mx-auto">
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-2">
          <h1 className="text-3xl font-extrabold flex items-center gap-2">
            <PackagePlus className="text-indigo-600 w-8 h-8" />
            Product Management
          </h1>
          <p className="text-gray-500 text-sm">
            Manage your inventory with ease
          </p>
        </header>

        {/* Add Form */}
        <form
          onSubmit={addProduct}
          className="bg-white rounded-2xl shadow-md p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-8"
        >
          <input
            className="border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 text-sm placeholder-gray-400"
            placeholder="Product Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
          <input
            className="border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 text-sm placeholder-gray-400"
            placeholder="Stock Quantity"
            type="number"
            value={form.stock}
            onChange={(e) => setForm({ ...form, stock: e.target.value })}
            required
          />
          <input
            className="border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 text-sm placeholder-gray-400"
            placeholder="Unit Price (KSh)"
            type="number"
            step="0.01"
            value={form.unit_price}
            onChange={(e) => setForm({ ...form, unit_price: e.target.value })}
            required
          />
          <input
            className="border border-gray-300 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-lg px-3 py-2 text-sm placeholder-gray-400"
            placeholder="Cost Price (KSh)"
            type="number"
            step="0.01"
            value={form.cost_price}
            onChange={(e) => setForm({ ...form, cost_price: e.target.value })}
            required
          />
          <button
            type="submit"
            className="col-span-1 sm:col-span-2 lg:col-span-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg transition flex justify-center items-center"
          >
            Add Product
          </button>
        </form>

        {/* Product Table */}
        <div className="bg-white rounded-2xl shadow-md overflow-x-auto">
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="animate-spin w-6 h-6 text-indigo-600" />
              <span className="ml-2 text-gray-500">Loading products...</span>
            </div>
          ) : products.length === 0 ? (
            <p className="text-center text-gray-500 py-6">
              No products found. Add one above.
            </p>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-indigo-50 text-indigo-700">
                <tr>
                  <th
                    className="py-3 px-4 text-left font-semibold cursor-pointer select-none"
                    onClick={toggleSort}
                  >
                    ID
                    <ArrowUpDown className="inline-block w-4 h-4 ml-1" />
                  </th>
                  <th className="py-3 px-4 text-left font-semibold">Name</th>
                  <th className="py-3 px-4 text-center font-semibold">Stock</th>
                  <th className="py-3 px-4 text-center font-semibold">Unit Price</th>
                  <th className="py-3 px-4 text-center font-semibold">Status</th>
                  <th className="py-3 px-4 text-center font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr
                    key={p.id}
                    className="border-b last:border-none hover:bg-gray-50 transition"
                  >
                    <td className="py-2 px-4">{p.id}</td>
                    <td className="py-2 px-4 font-medium">{p.name}</td>
                    <td className="py-2 px-4 text-center">{p.stock}</td>
                    <td className="py-2 px-4 text-center">
                      KSh {p.unit_price.toFixed(2)}
                    </td>
                    <td className="py-2 px-4 text-center">
                      <span
                        className={`px-2 py-1 text-xs rounded-full font-medium ${
                          p.stock === 0
                            ? "bg-red-100 text-red-700"
                            : p.stock <= 10
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {p.stock === 0
                          ? "Out of Stock"
                          : p.stock <= 10
                          ? "Low Stock"
                          : "In Stock"}
                      </span>
                    </td>
                    <td className="py-2 px-4 text-center">
                      <button
                        onClick={() => deleteProduct(p.id)}
                        disabled={deleting === p.id}
                        className="text-red-500 hover:text-red-700 transition disabled:opacity-50"
                      >
                        {deleting === p.id ? (
                          <Loader2 className="animate-spin w-5 h-5" />
                        ) : (
                          <Trash2 className="w-5 h-5" />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
