import React from "react";
import Link from "next/link";
import { ShieldAlert, ArrowLeft, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PortalNoAutorizadoPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 text-white">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 text-center space-y-6 shadow-2xl">
        <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto text-amber-500">
          <ShieldAlert className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold font-heading">
            Acceso No Vinculado
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Tu cuenta de usuario se encuentra autenticada, pero aún no está vinculada a un registro activo de asociado en SOVOGIN.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 text-left space-y-2">
          <p className="font-bold text-white">¿Eres médico asociado de SOVOGIN?</p>
          <p>
            Comunícate con la secretaría de la Asociación para solicitar tu invitación de activación al correo registrado en tu expediente gremial.
          </p>
        </div>

        <div className="pt-2 space-y-3">
          <a
            href="mailto:info@sovogin.org"
            className="w-full h-12 rounded-2xl bg-[#006666] hover:bg-[#005555] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg"
          >
            <Mail className="w-4 h-4" />
            Contactar a SOVOGIN (info@sovogin.org)
          </a>

          <Link href="/">
            <Button
              variant="outline"
              className="w-full h-12 rounded-2xl border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-bold gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver al Inicio Pública
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
