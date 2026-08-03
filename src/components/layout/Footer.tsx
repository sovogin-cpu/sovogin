import React from "react";
import Link from "next/link";
import { Globe, Mail, Phone, MapPin } from "lucide-react";

export interface FooterSettings {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  description?: string;
}

export interface FooterProps {
  settings?: FooterSettings | null;
}

export function Footer({ settings }: FooterProps) {
  const brandName = settings?.name || "SOVOGIN";
  const email = settings?.email || "info@sovogin.org";
  const phone = settings?.phone || "+57 (601) 123 4567";
  const address = settings?.address || "Calle 100 #15-32, Bogotá";
  const description = settings?.description || "Sociedad de Ginecología y Obstetricia. Dedicados a la excelencia académica y el bienestar de la mujer en Colombia.";

  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Logo & About */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img src="/img/logo.png" alt={`${brandName} Logo`} className="h-10 w-auto brightness-0 invert" />
              <span className="text-white font-bold text-xl tracking-tight">{brandName}</span>
            </div>
            <p className="text-sm leading-relaxed text-slate-400">
              {description}
            </p>
            <div className="flex items-center gap-4 pt-2">
              <Link href="#" className="hover:text-primary transition-colors"><Globe className="w-5 h-5" /></Link>
              <Link href="#" className="hover:text-primary transition-colors"><Globe className="w-5 h-5" /></Link>
              <Link href="#" className="hover:text-primary transition-colors"><Globe className="w-5 h-5" /></Link>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-bold mb-6">Enlaces Rápidos</h4>
            <ul className="space-y-3 text-sm">
              <li><Link href="/asociacion" className="hover:text-primary transition-colors">Sobre Nosotros</Link></li>
              <li><Link href="/simposios" className="hover:text-primary transition-colors">Eventos</Link></li>
              <li><Link href="/recursos" className="hover:text-primary transition-colors">Recursos Académicos</Link></li>
              <li><Link href="/contacto" className="hover:text-primary transition-colors">Contacto</Link></li>
            </ul>
          </div>

          {/* Members */}
          <div>
            <h4 className="text-white font-bold mb-6">Para Miembros</h4>
            <ul className="space-y-3 text-sm">
              <li><Link href="/recursos" className="hover:text-primary transition-colors">Portal de Miembros</Link></li>
              <li><Link href="/asociarse" className="hover:text-primary transition-colors">Requisitos de Admisión</Link></li>
              <li><Link href="/asociarse" className="hover:text-primary transition-colors">Beneficios de Asociado</Link></li>
              <li><Link href="/recursos" className="hover:text-primary transition-colors">Descarga de Certificados</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-bold mb-6">Contacto</h4>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-primary shrink-0" />
                <span>{address}</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-primary shrink-0" />
                <span>{phone}</span>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-primary shrink-0" />
                <span>{email}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} {brandName}. Todos los derechos reservados.</p>
          <div className="flex gap-6">
            <Link href="/privacidad" className="hover:text-slate-300">Política de Privacidad</Link>
            <Link href="/terminos" className="hover:text-slate-300">Términos y Condiciones</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
