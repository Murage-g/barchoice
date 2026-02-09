"use client";
import { useEffect, useState } from "react";
import api from "@/lib/api";

export default function WaitersDebtorsPage() {
  const [waiters, setWaiters] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    fetchWaiters();
  }, []);

  async function fetchWaiters() {
    const res = await api.get("/api/recon/waiter/list");
    setWaiters(res.data);
  }

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Waiters & Outstanding Bills</h1>
      <table className="w-full border-collapse border">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">Name</th>
            <th className="border p-2">Status</th>
            <th className="border p-2">Outstanding Bills</th>
            <th className="border p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {waiters.map((w) => (
            <>
              <tr key={w.id}>
                <td className="border p-2">{w.name}</td>
                <td className="border p-2">{w.status}</td>
                <td className="border p-2">{w.bills?.reduce((s:any,b:any)=>s+(!b.is_settled?b.total_amount:0),0)}</td>
                <td className="border p-2">
                  <button 
                    onClick={()=>setExpanded(expanded===w.id?null:w.id)} 
                    className="bg-blue-500 text-white px-2 py-1 rounded"
                  >
                    {expanded===w.id ? "Hide" : "Expand"}
                  </button>
                </td>
              </tr>
              {expanded===w.id && (
                <tr>
                  <td colSpan={4} className="border p-2 bg-gray-50">
                    <ul>
                      {w.bills?.map((b:any)=>(
                        <li key={b.id} className="mb-2">
                          <div className="text-sm">
                            {b.description} — KSh {b.total_amount} 
                            {b.is_settled ? " (Settled)" : " (Outstanding)"}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </td>
                </tr>
              )}
            </>
          ))}
        </tbody>
      </table>
    </div>
  );
}
