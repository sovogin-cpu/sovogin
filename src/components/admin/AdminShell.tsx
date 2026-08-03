"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export interface AdminShellProps {
  children: React.ReactNode;
}

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();

  const authRoutes = [
    "/admin/login",
    "/admin/recuperar-password",
    "/admin/actualizar-password",
  ];

  const isAuthRoute = pathname ? authRoutes.includes(pathname) : false;

  if (isAuthRoute) {
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <AdminSidebar />
      <main className="flex-1 ml-64 p-8">{children}</main>
    </div>
  );
}
