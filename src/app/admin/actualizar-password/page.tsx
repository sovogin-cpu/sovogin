"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock, Loader2, AlertCircle, CheckCircle2, ShieldCheck, ArrowLeft } from "lucide-react";
import { motion } from "framer-motion";

export default function ActualizarPasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function checkSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setHasValidSession(true);
        } else {
          setHasValidSession(false);
        }
      } catch (err) {
        setHasValidSession(false);
      } finally {
        setCheckingSession(false);
      }
    }

    checkSession();

    // Listen for auth state change (recovery event)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY" || session) {
          setHasValidSession(true);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    if (newPassword.length < 10) {
      setError("La contraseña debe tener al menos 10 caracteres.");
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Las contraseñas no coinciden. Por favor verifica los campos.");
      setLoading(false);
      return;
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      setSuccess(true);
      setTimeout(() => {
        router.push("/admin/login");
      }, 2500);
    } catch (err: any) {
      setError(
        err.message || "Ocurrió un error al actualizar la contraseña."
      );
    } finally {
      setLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-slate-500 font-medium text-sm">Verificando sesión de recuperación...</p>
        </div>
      </div>
    );
  }

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
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold tracking-tight text-slate-900 font-heading">
                Actualizar Contraseña
              </CardTitle>
              <CardDescription className="text-slate-500 font-medium">
                Crea una nueva contraseña segura para tu cuenta de administración (mínimo 10 caracteres).
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="px-8 pb-12">
            {!hasValidSession ? (
              <div className="space-y-6 text-center">
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100 flex flex-col items-center space-y-3 text-amber-700">
                  <AlertCircle className="w-10 h-10 text-amber-600" />
                  <div className="space-y-1">
                    <p className="font-bold text-base">Enlace caducado o inválido</p>
                    <p className="text-sm opacity-90 leading-relaxed">
                      No se encontró una sesión activa de recuperación. Es posible que el enlace haya expirado o ya haya sido utilizado.
                    </p>
                  </div>
                </div>

                <Link href="/admin/recuperar-password">
                  <Button className="w-full h-14 rounded-xl bg-primary text-white font-bold text-lg shadow-xl gap-2">
                    Solicitar nuevo enlace
                  </Button>
                </Link>
              </div>
            ) : success ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6 text-center"
              >
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex flex-col items-center space-y-3 text-emerald-700">
                  <CheckCircle2 className="w-10 h-10 text-emerald-600" />
                  <div className="space-y-1">
                    <p className="font-bold text-base">¡Contraseña Actualizada!</p>
                    <p className="text-sm opacity-90 leading-relaxed">
                      Tu contraseña ha sido cambiada correctamente. Serás redirigido al inicio de sesión en un momento...
                    </p>
                  </div>
                </div>

                <Link href="/admin/login">
                  <Button className="w-full h-14 rounded-xl bg-slate-900 text-white font-bold text-lg shadow-xl gap-2">
                    <ArrowLeft className="w-5 h-5" />
                    Ir al Inicio de Sesión
                  </Button>
                </Link>
              </motion.div>
            ) : (
              <form onSubmit={handleUpdatePassword} className="space-y-6">
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
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
                    Nueva Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                      type="password"
                      placeholder="Mínimo 10 caracteres"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="h-14 pl-12 rounded-xl border-slate-200 bg-white/50 focus-visible:ring-primary focus-visible:border-primary"
                      required
                      minLength={10}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
                    Confirmar Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <Input
                      type="password"
                      placeholder="Repite la nueva contraseña"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="h-14 pl-12 rounded-xl border-slate-200 bg-white/50 focus-visible:ring-primary focus-visible:border-primary"
                      required
                      minLength={10}
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
                      Guardando cambios...
                    </>
                  ) : (
                    "Guardar Nueva Contraseña"
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
