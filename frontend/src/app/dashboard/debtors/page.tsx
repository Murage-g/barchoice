"use client";

import { useEffect, useState } from "react";
import api from "@/lib/api";
import ProtectedRoute from "@/components/ProtectedRoute";

/* ============================
   TYPE DEFINITIONS
============================ */

type Debtor = {
  id: number;
  name: string;
  phone?: string;
  total_debt: number;
};

type DebtTransaction = {
  id: number;
  debtor_id: number;
  amount: number;
  paid_amount: number;
  outstanding_amount: number;
  is_paid: boolean;
  description?: string;
  issued_by?: string;
  date: string;
  due_date: string;
};

/* ============================
   COMPONENT
============================ */

export default function DebtorsPage() {

  const [debtors, setDebtors] = useState<Debtor[]>([]);
  const [selectedDebtor, setSelectedDebtor] = useState<Debtor | null>(null);
  const [transactions, setTransactions] = useState<DebtTransaction[]>([]);
  const [paymentInputs, setPaymentInputs] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);

  /* ============================
     FETCH FUNCTIONS
  ============================ */

  useEffect(() => {
    fetchDebtors();
  }, []);

  async function fetchDebtors() {
    try {
      const res = await api.get("/api/recon/debtor/list");
      setDebtors(res.data);
    } catch (error) {
      console.error("Failed to fetch debtors", error);
    }
  }

  async function fetchTransactions(debtorId: number) {
    try {
      const res = await api.get(
        `/api/recon/debtor/${debtorId}/transactions`
      );
      setTransactions(res.data);
    } catch (error) {
      console.error("Failed to fetch transactions", error);
    }
  }

  /* ============================
     PAYMENT HANDLER
  ============================ */

  async function handlePayment(transactionId: number) {
    const raw = paymentInputs[transactionId];
    const amount = Number(raw);

    if (!amount || amount <= 0) {
      alert("Enter valid amount");
      return;
    }

    try {
      setLoading(true);

      await api.post(
        `/api/recon/debtor/transaction/${transactionId}/pay`,
        { amount }
      );

      setPaymentInputs((prev) => ({ ...prev, [transactionId]: "" }));

      if (selectedDebtor) {
        await fetchTransactions(selectedDebtor.id);
        await fetchDebtors();
      }

    } catch (error: any) {
      alert(error?.response?.data?.error || "Payment failed");
    } finally {
      setLoading(false);
    }
  }

  /* ============================
     UI
  ============================ */

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div className="min-h-screen bg-gray-50 p-4 space-y-4">

        {/* ================= Debtor Cards ================= */}

        {debtors.map((debtor) => (
          <div
            key={debtor.id}
            className="bg-white rounded-2xl shadow p-4 flex justify-between items-center"
          >
            <div>
              <h3 className="font-semibold text-lg">
                {debtor.name}
              </h3>

              <p className="text-sm text-gray-500">
                {debtor.phone || "No phone"}
              </p>

              <p className="text-red-600 font-semibold mt-1">
                KSh {debtor.total_debt.toFixed(2)}
              </p>
            </div>

            <button
              onClick={() => {
                setSelectedDebtor(debtor);
                fetchTransactions(debtor.id);
              }}
              className="bg-indigo-600 text-white px-4 py-2 rounded-xl"
            >
              View
            </button>
          </div>
        ))}

        {/* ================= Bottom Sheet ================= */}

        {selectedDebtor && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-end sm:items-center justify-center">

            <div className="bg-white w-full sm:w-[650px] rounded-t-3xl sm:rounded-2xl p-4 max-h-[85vh] overflow-y-auto">

              <h2 className="text-lg font-semibold mb-4">
                {selectedDebtor.name} Transactions
              </h2>

              {transactions.length === 0 && (
                <p className="text-gray-500">No transactions</p>
              )}

              {transactions.map((t) => (
                <div
                  key={t.id}
                  className="border rounded-xl p-3 mb-4 space-y-2"
                >
                  <div className="flex justify-between">
                    <span className="font-medium">
                      KSh {t.amount}
                    </span>

                    <span
                      className={
                        t.is_paid
                          ? "text-green-600 font-semibold"
                          : "text-red-600 font-semibold"
                      }
                    >
                      {t.is_paid ? "PAID" : "PENDING"}
                    </span>
                  </div>

                  <div className="text-sm text-gray-600">
                    Paid: KSh {t.paid_amount}
                  </div>

                  <div className="text-sm text-gray-500">
                    Outstanding: KSh {t.outstanding_amount}
                  </div>

                  {!t.is_paid && (
                    <div className="flex gap-2 mt-2">
                      <input
                        type="number"
                        value={paymentInputs[t.id] || ""}
                        onChange={(e) =>
                          setPaymentInputs({
                            ...paymentInputs,
                            [t.id]: e.target.value,
                          })
                        }
                        placeholder="Amount"
                        className="flex-1 border rounded-lg px-3 py-2"
                      />

                      <button
                        disabled={loading}
                        onClick={() => handlePayment(t.id)}
                        className="bg-green-600 text-white px-4 rounded-lg"
                      >
                        Pay
                      </button>
                    </div>
                  )}
                </div>
              ))}

              <button
                onClick={() => setSelectedDebtor(null)}
                className="w-full mt-4 bg-gray-200 py-2 rounded-xl"
              >
                Close
              </button>

            </div>
          </div>
        )}

      </div>
    </ProtectedRoute>
  );
}
