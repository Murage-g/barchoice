"use client";

import ProtectedRoute from "@/components/ProtectedRoute"; // Admin-only wrapper
import SmartCRUD from "@/components/SmartCrud";

export default function AccountingAdminPage() {
  return (
    <ProtectedRoute roles={["admin"]}>
      <div className="p-4 space-y-6 max-w-3xl mx-auto">

        {/* Fixed Assets */}
        <SmartCRUD
          title="Fixed Assets"
          endpoint="/api/fixed_assets"
          fields={[
            { name: "name", label: "Asset Name" },
            { name: "purchase_date", label: "Purchase Date" },
            { name: "cost", label: "Cost" },
            { name: "useful_life_years", label: "Useful Life (Years)" },
            { name: "salvage_value", label: "Salvage Value" },
          ]}
        />

        {/* Accounts Receivable */}
        <SmartCRUD
          title="Accounts Receivable"
          endpoint="/api/accounts_receivable"
          fields={[
            { name: "customer_name", label: "Customer Name" },
            { name: "amount_owed", label: "Amount Owed" },
            { name: "amount_paid", label: "Amount Paid" },
          ]}
        />

        {/* Suppliers */}
        <SmartCRUD
          title="Suppliers"
          endpoint="/api/suppliers"
          fields={[
            { name: "name", label: "Supplier Name" },
            { name: "contact_person", label: "Contact Person" },
            { name: "phone", label: "Phone" },
            { name: "email", label: "Email" },
            { name: "total_amount_owed", label: "Amount Owed" },
            { name: "total_amount_paid", label: "Amount Paid" },
          ]}
        />

      </div>
    </ProtectedRoute>
  );
}
