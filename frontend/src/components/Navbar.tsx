"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { Menu, X } from "lucide-react"; // icons from lucide-react

export default function Navbar() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detect screen size to switch between mobile/desktop
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleMenu = () => setIsOpen(!isOpen);

  return (
    <nav className="bg-blue-600 text-white shadow-md fixed top-0 left-0 right-0 z-50">
      <div className="flex justify-between items-center px-4 py-3 max-w-6xl mx-auto">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <Link
            href={user?.role === "admin" ? "/dashboard/admin" : "/dashboard/cashier"}
            className="flex items-center gap-2"
          >
            <h1 className="text-lg sm:text-xl font-bold tracking-wide hover:text-yellow-200 transition">
              🍻 BarPOS
            </h1>
          </Link>
        </div>

        {/* Hamburger for small screens */}
        {isMobile ? (
          <button onClick={toggleMenu} className="text-white focus:outline-none">
            {isOpen ? <X size={26} /> : <Menu size={26} />}
          </button>
        ) : (
          <div className="flex items-center gap-5 text-sm font-medium">
            {(user?.role === "admin" || user?.role === "cashier") && (
              <>
                <Link href="/dashboard/sales" className="hover:text-yellow-200 transition">
                  Sales
                </Link>
                <Link href="/dashboard/stock" className="hover:text-yellow-200 transition">
                  Stock
                </Link>
                <Link
                  href="/dashboard/purchases"
                  className="bg-yellow-400 text-blue-800 px-3 py-1.5 rounded-lg hover:bg-yellow-300 transition"
                >
                  Purchases
                </Link>
                <Link
                  href="/dashboard/expenses"
                  className="bg-yellow-400 text-blue-800 px-3 py-1.5 rounded-lg hover:bg-yellow-300 transition"
                >
                  Expenses
                </Link>
              </>
            )}
            {user?.role === "admin" && (
              <>
                <Link href="/dashboard/users" className="hover:text-yellow-200 transition">
                  Users
                </Link>
                <Link href="/dashboard/reports" className="hover:text-yellow-200 transition">
                  Reports
                </Link>
                <Link href="/register" className="hover:text-yellow-200 transition">
                  Register User
                </Link>
                <Link href="/dashboard/reconciliation" className="hover:text-yellow-200 transition">
                  Accounts
                </Link>
                <Link href="/dashboard/more" className="hover:text-yellow-200 transition">
                  More
                </Link>
                <Link href="/dashboard/waiters" className="hover:text-yellow-200 transition">
                  Waiters
                </Link>
                <Link href="/dashboard/debtors" className="hover:text-yellow-200 transition">
                  Debtors
                </Link>
              </>
            )}
          </div>
        )}

        {/* User info (always visible) */}
        {!isMobile && (
          <div className="flex items-center gap-3 text-sm">
            <span className="bg-blue-500 px-3 py-1 rounded-lg">
              {user?.username} ({user?.role})
            </span>
            <button
              onClick={logout}
              className="bg-red-500 hover:bg-red-600 px-3 py-1 rounded-lg text-sm font-medium transition"
            >
              Logout
            </button>
          </div>
        )}
      </div>

      {/* Dropdown for small screens */}
      {isMobile && isOpen && (
        <div className="bg-blue-700 border-t border-blue-500">
          <div className="flex flex-col items-start px-4 py-3 space-y-3 text-sm font-medium">
            {(user?.role === "admin" || user?.role === "cashier") && (
              <>
                <Link href="/dashboard/sales" className="hover:text-yellow-300" onClick={toggleMenu}>
                  Sales
                </Link>
                <Link href="/dashboard/stock" className="hover:text-yellow-300" onClick={toggleMenu}>
                  Stock
                </Link>
                <Link
                  href="/dashboard/purchases"
                  className="hover:text-yellow-300"
                  onClick={toggleMenu}
                >
                  Purchases
                </Link>
              </>
            )}
            {user?.role === "admin" && (
              <>
                <Link href="/dashboard/users" className="hover:text-yellow-300" onClick={toggleMenu}>
                  Users
                </Link>
                <Link
                  href="/dashboard/reports"
                  className="hover:text-yellow-300"
                  onClick={toggleMenu}
                >
                  Reports
                </Link>
                <Link href="/register" className="hover:text-yellow-300" onClick={toggleMenu}>
                  Register User
                </Link>
                <Link href="/dashboard/reconciliation" className="hover:text-yellow-300" onClick={toggleMenu}>
                  Reports
                </Link>
                <Link href="/dashboard/more" className="hover:text-yellow-300" onClick={toggleMenu}>
                  More
                </Link>
                <Link href="/dashboard/waiters" className="hover:text-yellow-300" onClick={toggleMenu}>
                  Waiters
                </Link>
                <Link href="/dashboard/debtors" className="hover:text-yellow-300" onClick={toggleMenu}>
                  Debtors
                </Link>
              </>
            )}
            <div className="border-t border-blue-500 w-full pt-3 mt-2">
              <span className="block text-sm mb-2">
                {user?.username} ({user?.role})
              </span>
              <button
                onClick={logout}
                className="bg-red-500 hover:bg-red-600 w-full py-2 rounded-lg text-sm font-medium transition"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
