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
  const [selectedDailyCloseId, setSelectedDailyCloseId] = useState<number | null>(null);
  const [selectedClosingDate, setSelectedClosingDate] = useState<string | null>(null);


  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/products");
      setProducts(res.data);
      const init: Record<number, number> = {};
      res.data.forEach((p: Product) => (init[p.id] = p.stock));
      setClosing(init);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const calculateSales = () => {
    const total = products.reduce((sum, p) => {
      const sold = p.stock - (closing[p.id] || 0);
      return sum + sold * p.unit_price;
    }, 0);
    setTotalSales(total);
  };

  const submitDailyClose = async () => {
    // Validate for negative sales
    const invalid = products.some((p) => {
      const sold = p.stock - (closing[p.id] ?? 0);
      return sold < 0;
    });

    if (invalid) {
      alert("Cannot process! One or more items have negative sales.");
      return;
    }
    if (!confirm("Confirm processing daily close?")) return;
    setProcessing(true);
    try {
      const items = Object.entries(closing).map(([id, val]) => ({
        product_id: parseInt(id),
        closing_stock: val,
      }));
      const res = await api.post("/api/daily_close", { items });
      alert(res.data.message);

      // Set the newly created daily close for adjustments
      const newDailyCloseId = res.data.daily_close_ids[0]; // your backend should return this
      const today = new Date().toISOString().slice(0, 10);

      setSelectedDailyCloseId(newDailyCloseId);
      setSelectedClosingDate(today);

      fetchProducts();

    } catch (err) {
      alert("Error processing daily close");
    } finally {
      setProcessing(false);
    }
  };

  // Called after conversion success
  const handleStockUpdate = (update: any) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.name === update.bottle_name
          ? { ...p, stock: update.bottle_stock }
          : p.name === update.tot_name
          ? { ...p, stock: update.tot_stock }
          : p
      )
    );
  };

  useEffect(() => {
    calculateSales();
  }, [closing]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 px-4 py-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-2">
          <h1 className="text-3xl font-extrabold flex items-center gap-2">
            <DollarSign className="text-indigo-600 w-8 h-8" />
            Daily Sales & Closing
          </h1>
          <p className="text-gray-500 text-sm">
            Record your daily closing stock and calculate revenue
          </p>
        </header>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-md overflow-x-auto">
          {loading ? (
            <div className="flex justify-center items-center py-10">
              <Loader2 className="animate-spin w-6 h-6 text-indigo-600" />
              <span className="ml-2 text-gray-500">Loading products.</span>
            </div>
          ) : products.length === 0 ? (
            <p className="text-center text-gray-500 py-6">
              No products found. Add products first.
            </p>
          ) : (
            <table className="min-w-full text-sm">
              <thead className="bg-indigo-50 text-indigo-700 font-semibold">
                <tr>
                  <th className="py-3 px-4 text-left">Product</th>
                  <th className="py-3 px-4 text-center">Opening</th>
                  <th className="py-3 px-4 text-center">Closing</th>
                  <th className="py-3 px-4 text-center">Sold</th>
                  <th className="py-3 px-4 text-center">Amount</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const sold = p.stock - (closing[p.id] || 0);
                  const amount = sold * p.unit_price;
                  return (
                    <tr
                      key={p.id}
                      className="border-b last:border-none hover:bg-gray-50 transition"
                    >
                      <td className="py-2 px-4 font-medium">{p.name}</td>
                      <td className="py-2 px-4 text-center">{p.stock}</td>
                      <td className="py-2 px-4 text-center">
                        <input
                          type="number"
                          className={`border rounded-lg p-1 text-center w-20 text-sm focus:ring-1 ${
                            (closing[p.id] ?? 0) < 0 || (closing[p.id] ?? 0) > p.stock
                              ? "border-red-500 focus:ring-red-500"
                              : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-500"
                          }`}
                          min={0}
                          max={p.stock}
                          value={closing[p.id] ?? ""}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 0;

                            // Prevent negative or greater than opening stock
                            if (value < 0) {
                              alert("Closing stock cannot be negative!");
                              return;
                            }
                            if (value > p.stock) {
                              alert("Closing stock cannot exceed opening stock!");
                              return;
                            }

                            setClosing({
                              ...closing,
                              [p.id]: value,
                            });
                          }}
                        />

                      </td>
                      <td className="py-2 px-4 text-center font-medium text-gray-800">
                        {sold}
                      </td>
                      <td className="py-2 px-4 text-center text-indigo-700 font-semibold">
                        KSh {amount.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Summary */}
        <div className="mt-6 flex justify-between items-center bg-indigo-50 p-4 rounded-xl shadow-inner">
          <span className="text-lg font-semibold text-gray-700">Total Sales:</span>
          <span className="text-2xl font-bold text-indigo-700">
            KSh {totalSales.toFixed(2)}
          </span>
        </div>
        

        {/* Submit Button */}
        <button
          onClick={submitDailyClose}
          disabled={processing}
          className="mt-6 w-full bg-indigo-600 text-white font-semibold py-3 rounded-lg hover:bg-indigo-700 transition flex justify-center items-center"
        >
          {processing ? (
            <>
              <Loader2 className="animate-spin w-5 h-5 mr-2" />
              Processing.
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5 mr-2" />
              Process Daily Close
            </>
          )}
        </button>
      </div>
      <div>
        {/* Conversion section */}
      <ConversionSection onStockUpdate={handleStockUpdate} />
      </div>
      <div>
        {/* Admin adjustments */}
        {selectedDailyCloseId && selectedClosingDate && (
        <AdminDailyCloseAdjustment
          dailyCloseId={selectedDailyCloseId}
          closingStockDate={selectedClosingDate}
        />
      )}
      </div>
    </div>
  );
}
