"use client";

import React, { Suspense } from "react";
import { DoctorDirectoryAdminPage } from "@/components/directory/admin/DoctorDirectoryAdminPage";
import { RefreshCw } from "lucide-react";

export default function AdminDirectorioMedicoPage() {
  return (
    <Suspense
      fallback={
        <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin text-[#006666]" />
          <span>Cargando panel del directorio médico...</span>
        </div>
      }
    >
      <DoctorDirectoryAdminPage />
    </Suspense>
  );
}
