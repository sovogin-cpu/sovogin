import React from "react";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, PhoneCall } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PortalMembresiaInactivaPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 text-white">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 text-center space-y-6 shadow-2xl">
        <div className="w-16 h-16 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center justify-center mx-auto text-red-500">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold font-heading">
            Membresía en Estado Inactivo
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Tu expediente de asociado en SOVOGIN figura actualmente como <strong>Inactivo</strong>. El acceso a los recursos y beneficios gremiales del portal requiere estar al día.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 text-left space-y-2">
          <p className="font-bold text-white">¿Deseas renovar tu afiliación?</p>
          <p>
            Por favor ponte en contacto con la administración gremial para actualizar tus cuotas de sostenimiento y reactivar tu estado de membresía.
          </p>
        </div>

        <div className="pt-2 space-y-3">
          <a
            href="tel:+573162906133"
            className="w-full h-12 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg"
          >
            <PhoneCall className="w-4 h-4" />
            Llamar a Administración (316 290 6133)
          </a>

          <Link href="/">
            <Button
              variant="outline"
              className="w-full h-12 rounded-2xl border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-bold gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al Sitio Web
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
