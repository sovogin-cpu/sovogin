"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, UserCheck, Menu } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface PortalHeaderProps {
  associateName: string;
  associateEmail: string;
  onToggleMobileMenu?: () => void;
}

export const PortalHeader: React.FC<PortalHeaderProps> = ({
  associateName,
  associateEmail,
  onToggleMobileMenu,
}) => {
  const [signingOut, setSigningOut] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignOut = async () => {
    try {
      setSigningOut(true);
      await supabase.auth.signOut();
      sessionStorage.removeItem("member_access");
      router.push("/portal/login");
      router.refresh();
    } catch (err) {
      console.error("Error al cerrar sesión del portal:", err);
      setSigningOut(false);
    }
  };

  return (
    <header className="h-20 bg-slate-900 border-b border-slate-800/80 px-4 md:px-10 flex items-center justify-between sticky top-0 z-40 text-white">
      <div className="flex items-center gap-3">
        {/* Botón menú hamburguesa para mobile */}
        {onToggleMobileMenu && (
          <button
            onClick={onToggleMobileMenu}
            className="md:hidden p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 focus:outline-none focus:ring-2 focus:ring-teal-500"
            aria-label="Abrir menú de navegación"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-300 shrink-0">
          <UserCheck className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest block">
            Sesión de Asociado
          </span>
          <h2 className="text-sm font-bold text-white truncate max-w-[160px] sm:max-w-none">
            {associateName}
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden sm:flex flex-col text-right">
          <span className="text-xs font-semibold text-slate-300">
            {associateEmail}
          </span>
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
            Miembro Activo
          </span>
        </div>

        <button
          onClick={handleSignOut}
          disabled={signingOut}
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-red-950/60 text-slate-300 hover:text-red-400 border border-slate-700/60 hover:border-red-800/60 transition-all flex items-center gap-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-red-500"
          title="Cerrar sesión"
          aria-label="Cerrar sesión"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">
            {signingOut ? "Saliendo..." : "Salir"}
          </span>
        </button>
      </div>
    </header>
  );
};
