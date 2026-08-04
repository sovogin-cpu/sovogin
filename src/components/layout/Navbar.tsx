"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ChevronDown, User, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { name: "Inicio", href: "/" },
  { 
    name: "Asociación", 
    href: "/asociacion",
    children: [
      { name: "Historia", href: "/asociacion#historia" },
      { name: "Junta Directiva", href: "/asociacion#junta" },
      { name: "Estatutos", href: "/asociacion#estatutos" },
      { name: "Admisiones", href: "/asociacion#admisiones" },
      { name: "Portal de Pagos", href: "/pagos" },
    ]
  },
  { name: "Innovación", href: "/innovacion" },
  { name: "A la comunidad", href: "/comunidad" },
  { name: "Eventos", href: "/simposios" },
  { name: "Recursos", href: "/recursos" },
  { name: "Contacto", href: "/contacto" },
];

export interface NavbarSettings {
  name?: string;
}

export interface NavbarProps {
  settings?: NavbarSettings | null;
}

export function Navbar({ settings }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const pathname = usePathname();

  const brandName = settings?.name || "SOVOGIN";

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    
    const checkLogin = () => {
      const access = sessionStorage.getItem("member_access");
      setIsLoggedIn(access === "granted");
    };

    window.addEventListener("scroll", handleScroll);
    checkLogin();
    
    // Listen for storage changes (for multiple tabs or manual logout)
    window.addEventListener("storage", checkLogin);
    
    // Custom event for same-window updates
    window.addEventListener("member-login-change", checkLogin);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("storage", checkLogin);
      window.removeEventListener("member-login-change", checkLogin);
    };
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem("member_access");
    setIsLoggedIn(false);
    window.dispatchEvent(new Event("member-login-change"));
    window.location.reload(); // Refresh to clear states in other pages
  };

  return (
    <nav
      className={cn(
        "fixed top-0 w-full z-50 transition-all duration-300",
        scrolled 
          ? "bg-white/80 backdrop-blur-md shadow-sm py-3" 
          : "bg-transparent py-5"
      )}
    >
      <div className="container mx-auto px-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <img src="/img/logo.png" alt={`${brandName} Logo`} className="h-12 w-auto object-contain" />
          <span className={cn(
            "font-bold text-2xl tracking-tight hidden sm:block",
            scrolled ? "text-slate-900" : "text-slate-900"
          )}>
            {brandName}
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <div key={item.name} className="relative group">
              <Link
                href={item.href}
                className={cn(
                  "text-sm font-medium transition-colors hover:text-primary flex items-center gap-1",
                  pathname === item.href ? "text-primary" : "text-slate-600"
                )}
              >
                {item.name}
                {item.children && <ChevronDown className="w-4 h-4" />}
              </Link>
              
              {item.children && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-white shadow-lg rounded-xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 border border-slate-100">
                  {item.children.map((child) => (
                    <Link
                      key={child.name}
                      href={child.href}
                      className="block px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-primary"
                    >
                      {child.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {isLoggedIn ? (
            <Button onClick={handleLogout} variant="ghost" size="sm" className="gap-2 text-red-500 hover:text-red-600 font-bold hover:bg-red-50">
              <User className="w-4 h-4" />
              Cerrar Sesión
            </Button>
          ) : (
            <Link href="/admin/login">
              <Button variant="ghost" size="sm" className="gap-2 text-slate-600 font-bold">
                <LogIn className="w-4 h-4" />
                Ingresar
              </Button>
            </Link>
          )}
          <Link href="/asociarse">
            <Button size="sm" className="bg-secondary hover:bg-secondary/90 text-slate-900 font-bold border-none shadow-md px-6">
              Asociarse
            </Button>
          </Link>
        </div>

        {/* Mobile Toggle */}
        <button 
          className="md:hidden p-2 text-slate-600"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Nav */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-full left-0 w-full bg-white shadow-xl border-t md:hidden"
          >
            <div className="p-4 space-y-4">
              {navItems.map((item) => (
                <div key={item.name}>
                  <Link
                    href={item.href}
                    className="block text-lg font-semibold text-slate-900"
                    onClick={() => setIsOpen(false)}
                  >
                    {item.name}
                  </Link>
                  {item.children && (
                    <div className="pl-4 mt-2 space-y-2">
                      {item.children.map((child) => (
                        <Link
                          key={child.name}
                          href={child.href}
                          className="block text-slate-600"
                          onClick={() => setIsOpen(false)}
                        >
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div className="pt-4 border-t flex flex-col gap-3">
                {isLoggedIn ? (
                  <Button onClick={handleLogout} variant="outline" className="w-full h-12 text-red-500 font-bold border-red-100 bg-red-50">
                    Cerrar Sesión
                  </Button>
                ) : (
                  <Link href="/admin/login" onClick={() => setIsOpen(false)}>
                    <Button variant="outline" className="w-full h-12 text-slate-600 font-bold">Ingresar</Button>
                  </Link>
                )}
                <Link href="/asociarse" onClick={() => setIsOpen(false)}>
                  <Button className="w-full bg-primary h-12 font-bold">Asociarse</Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
