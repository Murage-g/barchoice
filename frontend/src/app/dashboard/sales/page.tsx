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

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/products");
      setProducts(res.data);

      const init: Record<number, number> = {};
      res.data.forEach((p: Product) => (init[p.id] = p.stock));
      setClosing(init);
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

  const calculateSales = () => {
    const total = products.reduce((sum, p) => {
      const sold = p.stock - (closing[p.id] || 0);
      return sum + sold * p.unit_price;
    }, 0);
    setTotalSales(total);
  };

  useEffect(() => {
    calculateSales();
  }, [closing]);

  const submitDailyClose = async () => {
    const invalid = products.some((p) => {
      const sold = p.stock - (closing[p.id] ?? 0);
      return sold < 0;
    });

    if (invalid) {
      alert("Negative sales detected.");
      return;
    }

    if (!confirm("Confirm processing daily close?")) return;

    setProcessing(true);

    try {
      const items = Object.entries(closing).map(([id, val]) => ({
        product_id: parseInt(id),
        closing_stock: val,
      }));

      await api.post("/api/daily_close", { items });

      await fetchTodayClose();
      await fetchProducts();
    } catch {
      alert("Error processing daily close");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">
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
                  const sold = p.stock - (closing[p.id] || 0);
                  const amount = sold * p.unit_price;

                  return (
                    <tr key={p.id} className="border-t">
                      <td className="p-3">{p.name}</td>
                      <td className="p-3 text-center">{p.stock}</td>
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          value={closing[p.id] ?? ""}
                          min={0}
                          max={p.stock}
                          onChange={(e) =>
                            setClosing({
                              ...closing,
                              [p.id]: parseInt(e.target.value) || 0,
                            })
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
          onClick={submitDailyClose}
          disabled={processing}
          className="mt-6 w-full bg-indigo-600 text-white py-3 rounded-lg"
        >
          {processing ? "Processing..." : "Process Daily Close"}
        </button>

        <ConversionSection onStockUpdate={() => fetchProducts()} />

        {todayCloses.length > 0 && selectedClosingDate && (
          <AdminDailyCloseAdjustment
            closes={todayCloses}
            closingStockDate={selectedClosingDate}
          />
        )}

      </div>
    </div>
  );
}
