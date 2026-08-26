"use client";

import React, { useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { KeyRound, Mail, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

export default function PortalRecuperarPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const redirectUrl = `${window.location.origin}/auth/callback?next=/portal/actualizar-password`;

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: redirectUrl,
        }
      );

      if (resetError) throw resetError;

      setSuccess(true);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al enviar el correo de recuperación."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-[#006666]/10 blur-3xl rounded-l-full" />
      <div className="absolute bottom-0 left-0 w-1/3 h-1/2 bg-blue-600/10 blur-3xl rounded-r-full" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="border-slate-800 shadow-2xl rounded-[2.5rem] overflow-hidden bg-slate-900/90 text-white backdrop-blur-xl">
          <CardHeader className="pt-12 pb-8 text-center space-y-4 border-b border-slate-800/60">
            <div className="w-16 h-16 bg-[#006666] rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-[#006666]/30">
              <KeyRound className="w-8 h-8 text-white" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold tracking-tight text-white font-heading">
                Recuperar Acceso
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs font-medium">
                Ingresa el correo electrónico asociado a tu membresía SOVOGIN.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="px-8 pt-8 pb-12">
            {success ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6 text-center"
              >
                <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-800/80 flex flex-col items-center space-y-3 text-emerald-200">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                  <div className="space-y-1">
                    <p className="font-bold text-base">¡Enlace Enviado!</p>
                    <p className="text-xs opacity-90 leading-relaxed">
                      Hemos enviado un enlace seguro a <span className="font-semibold text-white">{email}</span>. Revisa tu bandeja de entrada o spam.
                    </p>
                  </div>
                </div>

                <Link href="/portal/login">
                  <Button className="w-full h-14 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-base shadow-xl gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Volver al Login del Portal
                  </Button>
                </Link>
              </motion.div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-6">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-4 rounded-2xl bg-red-950/60 border border-red-800/80 flex items-center gap-3 text-red-200 text-xs font-medium"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                    <span>{error}</span>
                  </motion.div>
                )}

                <div className="space-y-2">
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input
                      type="email"
                      placeholder="correo@ejemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-14 pl-12 rounded-2xl border-slate-800 bg-slate-950/60 text-white placeholder:text-slate-600 focus-visible:ring-[#006666] text-sm"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-14 rounded-2xl bg-[#006666] hover:bg-[#005555] text-white font-bold text-base shadow-xl shadow-[#006666]/20 transition-all"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Enviando enlace...
                    </>
                  ) : (
                    "Enviar Enlace de Recuperación"
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <Link
            href="/portal/login"
            className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio de sesión
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
