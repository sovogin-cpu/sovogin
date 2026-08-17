"use client";

import React, { useState } from "react";
import { PortalSidebar } from "./PortalSidebar";
import { PortalHeader } from "./PortalHeader";

interface PortalShellProps {
  associateName: string;
  associateEmail: string;
  children: React.ReactNode;
}

export const PortalShell: React.FC<PortalShellProps> = ({
  associateName,
  associateEmail,
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Sidebar (Desktop Fijo + Mobile Drawer) */}
      <PortalSidebar
        isOpenMobile={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
      />

      {/* Área Principal de Contenido (ml-0 en mobile, ml-64 en desktop) */}
      <div className="flex-1 ml-0 md:ml-64 flex flex-col min-h-screen min-w-0">
        <PortalHeader
          associateName={associateName}
          associateEmail={associateEmail}
          onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
        />
        <main className="flex-1 p-4 sm:p-6 md:p-10">{children}</main>
      </div>
    </div>
  );
};
