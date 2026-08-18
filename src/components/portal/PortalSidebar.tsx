"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  User,
  CreditCard,
  Award,
  BookOpen,
  FileText,
  ShieldCheck,
  ChevronRight,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const portalMenuItems = [
  {
    name: "Resumen Gremiado",
    href: "/portal",
    icon: LayoutDashboard,
  },
  {
    name: "Mi Perfil Profesional",
    href: "/portal/perfil",
    icon: User,
  },
  {
    name: "Mi Membresía",
    href: "/portal/membresia",
    icon: CreditCard,
  },
  {
    name: "Beneficios Exclusivos",
    href: "/portal/beneficios",
    icon: Award,
  },
  {
    name: "Biblioteca & Recursos",
    href: "/portal/recursos",
    icon: BookOpen,
  },
  {
    name: "Certificados & Constancias",
    href: "/portal/certificados",
    icon: FileText,
    upcoming: true,
  },
];

interface PortalSidebarProps {
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const PortalSidebar: React.FC<PortalSidebarProps> = ({
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const pathname = usePathname();

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-950 text-white border-r border-slate-800/80 shadow-2xl">
      {/* Header Logo */}
      <div className="p-6 border-b border-slate-800/80 flex items-center justify-between">
        <Link href="/" onClick={onCloseMobile} className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-white rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-105">
            <img src="/img/logo.png" alt="SOVOGIN" className="w-7 h-7 object-contain" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-lg tracking-tight leading-none text-white font-heading">
              SOVOGIN
            </span>
            <span className="text-[10px] text-teal-400 font-bold uppercase tracking-widest mt-1">
              Portal Asociados
            </span>
          </div>
        </Link>

        {/* Botón cerrar para mobile */}
        {onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="md:hidden p-2 rounded-xl text-slate-400 hover:text-white bg-slate-900 border border-slate-800 focus:outline-none"
            aria-label="Cerrar menú de navegación"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
        <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Menú de Navegación
        </div>

        {portalMenuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          if (item.upcoming) {
            return (
              <div
                key={item.name}
                className="flex items-center justify-between px-4 py-3.5 rounded-2xl text-slate-300 text-xs font-semibold bg-slate-900/60 border border-slate-800/80 cursor-not-allowed"
                title="Funcionalidad disponible en la siguiente fase"
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 text-slate-400" />
                  <span>{item.name}</span>
                </div>
                <span className="text-[9px] font-bold bg-slate-800 border border-slate-700 text-slate-300 px-2 py-0.5 rounded-full uppercase">
                  Pronto
                </span>
              </div>
            );
          }

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onCloseMobile}
              className={cn(
                "flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all text-xs font-bold tracking-tight focus:outline-none focus:ring-2 focus:ring-teal-500",
                isActive
                  ? "bg-[#006666] text-white shadow-lg shadow-[#006666]/20 font-extrabold"
                  : "text-slate-300 hover:bg-slate-900 hover:text-white"
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className={cn("w-4 h-4", isActive ? "text-white" : "text-slate-400")} />
                <span>{item.name}</span>
              </div>
              <ChevronRight className={cn("w-4 h-4", isActive ? "text-white" : "text-slate-500")} />
            </Link>
          );
        })}
      </nav>

      {/* Footer gremial */}
      <div className="p-4 border-t border-slate-800/80">
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-1">
          <div className="flex items-center gap-2 text-xs font-bold text-teal-300">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            <span>Membresía SOVOGIN</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-tight">
            Valle del Cauca - Colombia
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Sidebar Fijo Desktop (>= 768px) */}
      <aside className="hidden md:block w-64 h-screen fixed left-0 top-0 z-[50]">
        {sidebarContent}
      </aside>

      {/* Drawer Mobile (< 768px) */}
      {isOpenMobile && (
        <div className="md:hidden">
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[60]"
            onClick={onCloseMobile}
            aria-hidden="true"
          />
          {/* Drawer Sidebar */}
          <aside className="fixed inset-y-0 left-0 w-64 z-[65] shadow-2xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
};
