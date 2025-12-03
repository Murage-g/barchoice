"use client";

import ProtectedRoute from "@/components/ProtectedRoute";

export default function CashierLayout({ children }: { children: React.ReactNode }) {
  return <ProtectedRoute allowedRoles={["cashier", "admin"]}>{children}</ProtectedRoute>;
}
