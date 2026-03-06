"use client";

import { useState, useEffect } from "react";
import { Loader2, DollarSign, CheckCircle2 } from "lucide-react";
import api from "@/lib/api";
import ConversionSection from "@/components/ConversionSection";
import AdminDailyCloseAdjustment from "@/components/SalesUpdate";

interface Product {
  id: number;
  name: string;
  stock: number;
  unit_price: number;
}

export default function SalesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [closing, setClosing] = useState<Record<number, number>>({});
  const [totalSales, setTotalSales] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [todayCloses, setTodayCloses] = useState<any[]>([]);
  const [selectedClosingDate, setSelectedClosingDate] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const draftKey = `daily_close_${today}`;

  /* =========================
     FETCH PRODUCTS (SAFE)
  ========================== */
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/products");
      setProducts(res.data);

      const saved = localStorage.getItem(draftKey);

      if (saved) {
        setClosing(JSON.parse(saved));
      } else {
        const init: Record<number, number> = {};
        res.data.forEach((p: Product) => (init[p.id] = p.stock));
        setClosing(init);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchTodayClose = async () => {
    try {
      const res = await api.get("/api/daily_close/today");
      if (res.data.exists) {
        setTodayCloses(res.data.closes);
        setSelectedClosingDate(res.data.date);
      } else {
        setTodayCloses([]);
      }
    } catch {
      console.error("Failed to fetch today's close");
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchTodayClose();
  }, []);

  /* =========================
     SALES CALCULATION
  ========================== */
  useEffect(() => {
    const total = products.reduce((sum, p) => {
      const sold = p.stock - (closing[p.id] ?? p.stock);
      return sum + sold * p.unit_price;
    }, 0);

    setTotalSales(total);
  }, [closing, products]);

  const getSoldProducts = () =>
    products
      .map((p) => {
        const closingStock = Number(closing[p.id] ?? p.stock);
        const sold = p.stock - closingStock;

        return {
          ...p,
          sold,
          amount: sold * p.unit_price,
        };
      })
      .filter((p) => p.sold > 0);

  /* =========================
     SAVE DRAFT ON CHANGE
  ========================== */
  const updateClosing = (id: number, value: number) => {
    const updated = {
      ...closing,
      [id]: value,
    };

    setClosing(updated);
    localStorage.setItem(draftKey, JSON.stringify(updated));
  };

  /* =========================
     VALIDATION
  ========================== */
  const submitDailyClose = () => {
    const invalid = products.some((p) => {
      const closingStock = Number(closing[p.id] ?? p.stock);
      const sold = p.stock - closingStock;
      return sold < 0 || isNaN(closingStock);
    });

    if (invalid) {
      alert("Negative sales detected.");
      return;
    }

    setShowConfirmModal(true);
  };

  /* =========================
     CONFIRM PROCESS
  ========================== */
  const confirmDailyClose = async () => {
    setProcessing(true);

    try {
      const items = products.map((p) => ({
        product_id: p.id,
        closing_stock: Number(closing[p.id] ?? p.stock),
      }));

      await api.post("/api/daily_close", { items });

      // Clear draft only after success
      localStorage.removeItem(draftKey);

      setShowConfirmModal(false);
      await fetchTodayClose();
      await fetchProducts();
    } catch {
      alert("Error processing daily close");
    } finally {
      setProcessing(false);
    }
  };

  /* =========================
     DISCARD
  ========================== */
  const discardChanges = () => {
    localStorage.removeItem(draftKey);

    const reset: Record<number, number> = {};
    products.forEach((p) => (reset[p.id] = p.stock));

    setClosing(reset);
  };

  /* =========================
     UI
  ========================== */
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
      <div classname = "pt-16"></div>
      <div className="max-w-5xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <DollarSign className="text-indigo-600 w-8 h-8" />
            Daily Sales & Closing
          </h1>
        </header>

        <div className="bg-white rounded-xl shadow overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="animate-spin w-6 h-6 text-indigo-600" />
            </div>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-indigo-50">
                <tr>
                  <th className="p-3 text-left">Product</th>
                  <th className="p-3 text-center">Opening</th>
                  <th className="p-3 text-center">Closing</th>
                  <th className="p-3 text-center">Sold</th>
                  <th className="p-3 text-center">Amount</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const sold = p.stock - (closing[p.id] ?? p.stock);
                  const amount = sold * p.unit_price;

                  return (
                    <tr key={p.id} className="border-t">
                      <td className="p-3">{p.name}</td>
                      <td className="p-3 text-center">{p.stock}</td>
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          min={0}
                          max={p.stock}
                          value={closing[p.id] ?? ""}
                          onChange={(e) =>
                            updateClosing(
                              p.id,
                              parseInt(e.target.value) || 0
                            )
                          }
                          className="border rounded p-1 w-20 text-center"
                        />
                      </td>
                      <td className="p-3 text-center">{sold}</td>
                      <td className="p-3 text-center font-semibold text-indigo-700">
                        KSh {amount.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-6 bg-indigo-50 p-4 rounded-xl flex justify-between">
          <span className="font-semibold">Total Sales</span>
          <span className="font-bold text-indigo-700">
            KSh {totalSales.toFixed(2)}
          </span>
        </div>

        <button
          onClick={discardChanges}
          className="mt-6 w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition"
        >
          Discard Changes
        </button>

        <button
          onClick={submitDailyClose}
          disabled={processing}
          className="mt-6 w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 transition"
        >
          {processing ? "Processing..." : "Process Daily Close"}
        </button>

        <ConversionSection onStockUpdate={fetchProducts} />

        {todayCloses.length > 0 && selectedClosingDate && (
          <AdminDailyCloseAdjustment
            closes={todayCloses}
            closingStockDate={selectedClosingDate}
          />
        )}
      </div>

      {/* =========================
          CONFIRM MODAL
      ========================== */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center overflow-y-auto px-4 ${
          showConfirmModal ? "opacity-100 visible" : "opacity-0 invisible"
        }`}
      >
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={() => !processing && setShowConfirmModal(false)}
        />

        <div className="relative bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl p-6">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <CheckCircle2 className="text-indigo-600" />
            Confirm Daily Close
          </h2>

          {getSoldProducts().length === 0 ? (
            <div className="text-sm text-gray-600">
              No sales detected.
            </div>
          ) : (
            <>
              <table className="w-full text-sm mb-4">
                <thead className="bg-indigo-50">
                  <tr>
                    <th className="p-2 text-left">Product</th>
                    <th className="p-2 text-center">Sold</th>
                    <th className="p-2 text-center">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {getSoldProducts().map((p) => (
                    <tr key={p.id} className="border-t">
                      <td className="p-2">{p.name}</td>
                      <td className="p-2 text-center font-semibold">
                        {p.sold}
                      </td>
                      <td className="p-2 text-center text-indigo-700 font-semibold">
                        KSh {p.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-between font-semibold mb-4">
                <span>Total</span>
                <span className="text-indigo-700">
                  KSh {totalSales.toFixed(2)}
                </span>
              </div>
            </>
          )}

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setShowConfirmModal(false)}
              disabled={processing}
              className="px-4 py-2 rounded border hover:bg-gray-100 transition"
            >
              Cancel
            </button>

            <button
              onClick={confirmDailyClose}
              disabled={processing}
              className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700 transition"
            >
              {processing ? "Processing..." : "Confirm & Process"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}