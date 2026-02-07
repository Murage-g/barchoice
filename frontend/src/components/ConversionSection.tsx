"use client";
import { useEffect, useState } from "react";
import { Undo2, Loader2, History } from "lucide-react";
import api from "@/lib/api";

export default function ConversionSection({ onStockUpdate }: { onStockUpdate: (updatedProducts: any) => void }) {
  const [totProducts, setTotProducts] = useState<string[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [isConverting, setIsConverting] = useState(false);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [message, setMessage] = useState<{ text: string; type: string }>({ text: "", type: "" });

  useEffect(() => {
    const fetchTotProducts = async () => {
      try {
        const res = await api.get("/api/tot_products"); // <-- uses axios with baseURL
        setTotProducts(res.data);
      } catch (err) {
        console.error("Failed to load TOT products", err);
        setMessage({ text: "Failed to load TOT products", type: "error" });
      }
    };

    fetchTotProducts();
  }, []);


  const performConversion = async () => {
    if (!selectedProduct) return;
    setIsConverting(true);
    setMessage({ text: "Processing.", type: "info" });

    try {
      const response = await fetch("/api/convert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ product_name: selectedProduct }),
        credentials: "include",
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({
          text: result.message,
          type: "success",
        });
        setSelectedProduct("");

        // 🔁 Notify parent with new stock values
        onStockUpdate({
          bottle_name: result.bottle_name,
          bottle_stock: result.bottle_stock,
          tot_name: selectedProduct,
          tot_stock: result.tot_stock,
        });
      } else {
        setMessage({ text: `Conversion Failed: ${result.error}`, type: "error" });
      }
    } catch (err) {
      setMessage({ text: "Network error — check connection.", type: "error" });
    } finally {
      setIsConverting(false);
    }
  };
  const fetchHistory = async () => {
    try {
      console.log("Fetch History")
      const res = await api.get("/api/conversions/history");
      console.log("Fetch History Okay")
      setHistory(res.data);
    } catch (err) {
      console.error("Failed to load history", err);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleUndo = async (id: number) => {
    if (!confirm("Are you sure you want to undo this conversion?")) return;
    setLoading(true);
    try {
      const res = await api.post("/conversions/undo", { conversion_id: id });
      alert(res.data.message);
      onStockUpdate(res.data);
      fetchHistory(); // refresh table
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to undo conversion");
    } finally {
      setLoading(false);
    }
  };

  const messageStyle = {
    success:
      "bg-green-100 border border-green-400 text-green-700 p-3 rounded-lg text-center mt-4",
    error:
      "bg-red-100 border border-red-400 text-red-700 p-3 rounded-lg text-center mt-4",
    info: "bg-blue-100 border border-blue-400 text-blue-700 p-3 rounded-lg text-center mt-4",
  }[message.type];

  return (
    <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mt-6 w-full">
      <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-center">
        🥃 Bottle → Tot Conversion
      </h2>

      <select
        className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-blue-400 focus:outline-none text-sm sm:text-base"
        value={selectedProduct}
        onChange={(e) => setSelectedProduct(e.target.value)}
        disabled={isConverting}
      >
        <option value="">Select a TOT product.</option>
        {totProducts.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
      </select>

      <button
        onClick={performConversion}
        disabled={!selectedProduct || isConverting}
        className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition disabled:opacity-50 text-sm sm:text-base"
        
      >
        {isConverting ? "Processing." : "Convert Bottle"}
      </button>

      {message.text && <div className={messageStyle}>{message.text}</div>}
      

      <div className="mt-8 bg-white rounded-xl shadow-md p-4">
      <div className="flex items-center gap-2 mb-4">
        <History className="w-5 h-5 text-indigo-600" />
        <h2 className="text-lg font-semibold text-gray-700">Conversion History</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm border border-gray-200 rounded-lg">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="py-2 px-3">#</th>
              <th className="py-2 px-3">Bottle</th>
              <th className="py-2 px-3">TOT</th>
              <th className="py-2 px-3">Before</th>
              <th className="py-2 px-3">After</th>
              <th className="py-2 px-3">Time</th>
              <th className="py-2 px-3 text-center">Undo</th>
            </tr>
          </thead>
          <tbody>
            {history.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center text-gray-500 py-4">
                  No conversions recorded
                </td>
              </tr>
            ) : (
              history.map((h) => (
                <tr key={h.id} className="border-t hover:bg-gray-50 transition">
                  <td className="py-2 px-3 text-center">{h.id}</td>
                  <td className="py-2 px-3">{h.bottle_name}</td>
                  <td className="py-2 px-3">{h.tot_name}</td>
                  <td className="py-2 px-3 text-center">
                    <div className="text-xs text-gray-600">
                      <span>Bottle: {h.prev_bottle_stock}</span> <br />
                      <span>TOT: {h.prev_tot_stock}</span>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <div className="text-xs text-gray-600">
                      <span>Bottle: {h.new_bottle_stock}</span> <br />
                      <span>TOT: {h.new_tot_stock}</span>
                    </div>
                  </td>
                  <td className="py-2 px-3 text-gray-500 text-xs">{h.timestamp}</td>
                  <td className="py-2 px-3 text-center">
                    <button
                      onClick={() => handleUndo(h.id)}
                      disabled={loading}
                      className="flex items-center gap-1 bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded-md text-xs"
                    >
                      {loading ? (
                        <Loader2 className="animate-spin w-4 h-4" />
                      ) : (
                        <>
                          <Undo2 className="w-3 h-3" />
                          Undo
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>

    </div>

    
  );
}
