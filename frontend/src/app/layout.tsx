"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Navbar from "../components/Navbar";
import { AuthProvider } from "../context/AuthContext";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Define routes that shouldn't show navbar (like login/register)
  const hideNavbar = ["/login", "/register"].includes(pathname);

  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {!hideNavbar && <Navbar />}
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
