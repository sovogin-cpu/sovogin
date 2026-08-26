"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock, Loader2, AlertCircle, CheckCircle2, KeyRound } from "lucide-react";
import { motion } from "framer-motion";

export default function PortalActualizarPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [hasValidSession, setHasValidSession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    let isMounted = true;

    async function verifyAuthSession() {
      try {
        const urlError = searchParams.get("error");
        if (urlError) {
          if (isMounted) {
            setHasValidSession(false);
            setCheckingSession(false);
          }
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();

        if (isMounted) {
          if (session?.user) {
            setHasValidSession(true);
          } else {
            setHasValidSession(false);
          }
          setCheckingSession(false);
        }
      } catch (err: unknown) {
        console.error("Error al comprobar sesión:", err);
        if (isMounted) {
          setHasValidSession(false);
          setCheckingSession(false);
        }
      }
    }

    void verifyAuthSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!isMounted) return;
      if (session?.user) {
        setHasValidSession(true);
        setCheckingSession(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, searchParams]);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      setLoading(false);
      return;
    }

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) throw updateError;

      setSuccess(true);
      setTimeout(() => {
        router.push("/portal");
        router.refresh();
      }, 2000);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Ocurrió un error al actualizar tu contraseña."
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
              <Lock className="w-8 h-8 text-white" />
            </div>
            <div className="space-y-2">
              <CardTitle className="text-3xl font-bold tracking-tight text-white font-heading">
                Establecer Contraseña
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs font-medium">
                Crea tu clave privada para acceder al Portal del Asociado SOVOGIN.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="px-8 pt-8 pb-12">
            {checkingSession ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-4 text-center">
                <Loader2 className="w-8 h-8 text-[#006666] animate-spin" />
                <p className="text-xs text-slate-400 font-medium">
                  Verificando enlace seguro y sesión del portal...
                </p>
              </div>
            ) : !hasValidSession ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6 text-center"
              >
                <div className="p-5 rounded-2xl bg-amber-950/40 border border-amber-800/60 flex flex-col items-center space-y-3 text-amber-200">
                  <AlertCircle className="w-10 h-10 text-amber-400 shrink-0" />
                  <div className="space-y-1">
                    <p className="font-bold text-base">Enlace No Válido o Expirado</p>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Este enlace de activación o recuperación ha expirado, ya fue utilizado o no posee una sesión activa.
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
              </motion.div>
            ) : success ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-800/80 flex flex-col items-center space-y-3 text-emerald-200 text-center"
              >
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                <div className="space-y-1">
                  <p className="font-bold text-base">¡Contraseña Actualizada!</p>
                  <p className="text-xs opacity-90">
                    Tu clave ha sido guardada. Redirigiendo al Portal del Asociado...
                  </p>
                </div>
              </motion.div>
            ) : (
              <form onSubmit={handleUpdatePassword} className="space-y-6">
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
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input
                      type="password"
                      placeholder="Nueva contraseña (mín. 6 caracteres)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-14 pl-12 rounded-2xl border-slate-800 bg-slate-950/60 text-white placeholder:text-slate-600 focus-visible:ring-[#006666] text-sm"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <Input
                      type="password"
                      placeholder="Confirma tu nueva contraseña"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
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
                      Guardando contraseña...
                    </>
                  ) : (
                    "Guardar Contraseña e Ingresar"
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <Link
            href="/portal/login"
            className="text-xs font-medium text-slate-500 hover:text-slate-300 transition-colors"
          >
            ← Ir al inicio de sesión
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
