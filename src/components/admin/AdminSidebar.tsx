"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  FileText, 
  MessageSquare, 
  Settings, 
  LogOut,
  Users2,
  Image as ImageIcon,
  CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  { name: "Resumen", href: "/admin", icon: LayoutDashboard },
  { name: "Eventos", href: "/admin/eventos", icon: Calendar },
  { name: "Inscritos", href: "/admin/inscritos", icon: CheckCircle2 },
  { name: "Transmisiones", href: "/admin/eventos/live", icon: ImageIcon },
  { name: "Miembros", href: "/admin/miembros", icon: Users },
  { name: "Recursos", href: "/admin/recursos", icon: FileText },
  { name: "Chatbot", href: "/admin/chatbot", icon: MessageSquare },
  { name: "Junta Directiva", href: "/admin/junta", icon: Users2 },
  { name: "Beneficios", href: "/admin/beneficios", icon: CheckCircle2 },
  { name: "Patrocinadores", href: "/admin/sponsors", icon: ImageIcon },
  { name: "Configuración", href: "/admin/config", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-950 text-white flex flex-col h-screen fixed left-0 top-0 z-[100] shadow-2xl">
      <div className="p-8 border-b border-white/5">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110">
            <img src="/img/logo.png" alt="Logo" className="w-7 h-7 object-contain" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg tracking-tight leading-none">SOVOGIN</span>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Admin Panel</span>
          </div>
        </Link>
      </div>
      
      <nav className="flex-1 p-6 space-y-2 overflow-y-auto custom-scrollbar">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-4 px-4 py-4 rounded-2xl transition-all text-sm font-bold tracking-tight",
                isActive 
                  ? "bg-primary text-white shadow-lg shadow-primary/20" 
                  : "text-slate-500 hover:bg-white/5 hover:text-white"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive ? "text-white" : "text-slate-500")} />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-6 border-t border-white/5 space-y-4">
        <div className="flex items-center gap-3 px-4 py-2 bg-white/5 rounded-2xl">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs">
            AD
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="text-xs font-bold truncate">Admin SOVOGIN</span>
            <span className="text-[10px] text-slate-500 truncate">admin@sovogin.com</span>
          </div>
        </div>
        <button className="flex items-center gap-4 px-4 py-4 w-full text-left rounded-2xl text-slate-500 hover:bg-red-500/10 hover:text-red-500 transition-all text-sm font-bold">
          <LogOut className="w-5 h-5" />
          Cerrar Sesión
        </button>
      </div>
    </aside>
  );
}
