"use client";

import React, { useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { KeyRound, Mail, Loader2, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

export default function RecuperarPasswordPage() {
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
      const redirectUrl = `${window.location.origin}/admin/actualizar-password`;

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: redirectUrl,
        }
      );

      if (resetError) throw resetError;

      setSuccess(true);
    } catch (err: any) {
      setError(
        err.message || "Ocurrió un error al enviar el correo de recuperación."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 relative overflow-hidden">
      {/* Abstract Background Decor */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-primary/5 blur-3xl rounded-l-full" />
      <div className="absolute bottom-0 left-0 w-1/3 h-1/2 bg-secondary/5 blur-3xl rounded-r-full" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white/80 backdrop-blur-xl">
          <CardHeader className="pt-12 pb-8 text-center space-y-4">
            <div className="w-16 h-16 bg-primary rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-primary/20">
              <KeyRound className="w-8 h-8 text-white" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold tracking-tight text-slate-900 font-heading">
                Recuperar Contraseña
              </CardTitle>
              <CardDescription className="text-slate-500 font-medium">
                Ingresa tu correo institucional registrado para recibir las instrucciones de restablecimiento.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="px-8 pb-12">
            {success ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6 text-center"
              >
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex flex-col items-center space-y-3 text-emerald-700">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                  <div className="space-y-1">
                    <p className="font-bold text-base">¡Correo Enviado!</p>
                    <p className="text-sm opacity-90 leading-relaxed">
                      Hemos enviado un enlace seguro a <span className="font-semibold">{email}</span>. Revisa tu bandeja de entrada o carpeta de spam.
                    </p>
                  </div>
                </div>

                <Link href="/admin/login">
                  <Button className="w-full h-14 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-lg shadow-xl gap-2">
                    <ArrowLeft className="w-5 h-5" />
                    Volver a Iniciar Sesión
                  </Button>
                </Link>
              </motion.div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-6">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="p-4 rounded-xl bg-red-50 border border-red-100 flex items-center gap-3 text-red-600 text-sm font-medium"
                  >
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    {error}
                  </motion.div>
                )}

                <div className="space-y-2">
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                      type="email"
                      placeholder="correo@ejemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-14 pl-12 rounded-xl border-slate-200 bg-white/50 focus-visible:ring-primary focus-visible:border-primary"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-14 rounded-xl bg-primary hover:bg-primary/90 text-white font-bold text-lg shadow-xl shadow-primary/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
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
            href="/admin/login"
            className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver al inicio de sesión
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
