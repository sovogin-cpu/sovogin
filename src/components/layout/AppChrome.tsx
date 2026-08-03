"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ChatbotWidget } from "@/components/chat/ChatbotWidget";

export interface AppChromeProps {
  children: React.ReactNode;
  settings?: Record<string, unknown> | null;
}

export function AppChrome({ children, settings }: AppChromeProps) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith("/admin");

  if (isAdminRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar settings={settings} />
      <main className="flex-grow pt-16">{children}</main>
      <Footer settings={settings} />
      <ChatbotWidget />
    </>
  );
}
