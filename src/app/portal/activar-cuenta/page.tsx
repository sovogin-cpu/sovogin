import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ShieldCheck, AlertCircle, KeyRound } from "lucide-react";

interface ActivarCuentaPageProps {
  searchParams: Promise<{
    token_hash?: string;
    type?: string;
  }>;
}

/**
 * GET /portal/activar-cuenta
 * Prefetch-Safe Landing Page for Associate Account Activation and Password Recovery.
 *
 * IMPORTANT: This GET route NEVER performs any auth mutations, verifyOtp calls,
 * or token invalidations. Email prefetchers/scanners (Gmail, Outlook) can safely
 * GET this page without consuming the single-use token_hash.
 *
 * Human confirmation is triggered via explicit POST form submission to /auth/confirm.
 */
export default async function PortalActivarCuentaPage({ searchParams }: ActivarCuentaPageProps) {
  const { token_hash, type } = await searchParams;

  const isValidType = type === "invite" || type === "recovery";
  const hasValidParams = Boolean(token_hash && isValidType);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-[#006666]/10 blur-3xl rounded-l-full" />
      <div className="absolute bottom-0 left-0 w-1/3 h-1/2 bg-blue-600/10 blur-3xl rounded-r-full" />

      <div className="w-full max-w-md relative z-10">
        <Card className="border-slate-800 shadow-2xl rounded-[2.5rem] overflow-hidden bg-slate-900/90 text-white backdrop-blur-xl">
          <CardHeader className="pt-12 pb-8 text-center space-y-4 border-b border-slate-800/60">
            <div className="w-16 h-16 bg-[#006666] rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-[#006666]/30">
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold tracking-tight text-white font-heading">
                Portal del Asociado
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs font-medium">
                Asociación Vallecaucana de Obstetricia y Ginecología - SOVOGIN
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="px-8 pt-8 pb-12">
            {!hasValidParams ? (
              <div className="space-y-6 text-center">
                <div className="p-5 rounded-2xl bg-amber-950/40 border border-amber-800/60 flex flex-col items-center space-y-3 text-amber-200">
                  <AlertCircle className="w-10 h-10 text-amber-400 shrink-0" />
                  <div className="space-y-1">
                    <p className="font-bold text-base">Enlace No Válido o Incompleto</p>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      El enlace de activación no contiene los parámetros de seguridad requeridos. Por favor solicita un nuevo enlace desde el portal.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <Link href="/portal/recuperar-password">
                    <Button className="w-full h-12 rounded-2xl bg-[#006666] hover:bg-[#005555] text-white font-bold text-sm shadow-xl gap-2">
                      <KeyRound className="w-4 h-4" />
                      Solicitar un Nuevo Enlace
                    </Button>
                  </Link>

                  <Link
                    href="/portal/login"
                    className="block text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors pt-2"
                  >
                    ← Volver al inicio de sesión
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-6 text-center">
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white">
                    {type === "invite" ? "Activar Tu Cuenta" : "Restablecer Tu Contraseña"}
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Haz clic en el siguiente botón para validar tu acceso seguro al Portal del Asociado y establecer tu contraseña privada.
                  </p>
                </div>

                <form action="/auth/confirm" method="POST" className="space-y-4 pt-2">
                  <input type="hidden" name="token_hash" value={token_hash} />
                  <input type="hidden" name="type" value={type} />

                  <Button
                    type="submit"
                    className="w-full h-14 rounded-2xl bg-[#006666] hover:bg-[#005555] text-white font-bold text-base shadow-xl shadow-[#006666]/20 transition-all gap-2"
                  >
                    <ShieldCheck className="w-5 h-5" />
                    Continuar y Establecer Contraseña
                  </Button>
                </form>

                <div className="pt-4 border-t border-slate-800/60">
                  <Link
                    href="/portal/login"
                    className="text-xs font-medium text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    ← Ir al inicio de sesión
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
