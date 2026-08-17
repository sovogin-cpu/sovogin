"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock, Mail, Loader2, AlertCircle, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

export default function PortalLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (authError) {
        throw new Error(
          authError.message === "Invalid login credentials"
            ? "Credenciales incorrectas. Verifica tu correo y contraseña."
            : authError.message
        );
      }

      router.push("/portal");
      router.refresh();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Error inesperado al iniciar sesión."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-teal-500/10 blur-3xl rounded-l-full" />
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
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-teal-400 uppercase tracking-widest block">
                Plataforma Privada Gremiada
              </span>
              <CardTitle className="text-3xl font-extrabold tracking-tight text-white font-heading">
                Portal del Asociado
              </CardTitle>
              <CardDescription className="text-slate-300 text-xs font-medium">
                Ingresa con tu correo y contraseña de miembro SOVOGIN
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-8 pt-8 pb-12">
            <form onSubmit={handleLogin} className="space-y-6">
              {error && (
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-4 rounded-2xl bg-red-950/80 border border-red-800 flex items-center gap-3 text-red-200 text-xs font-medium"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{error}</span>
                </motion.div>
              )}

              <div className="space-y-2">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="email"
                    placeholder="correo@ejemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-14 pl-12 rounded-2xl border-slate-800 bg-slate-950/80 text-white placeholder:text-slate-400 focus-visible:ring-teal-500 text-sm"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="password"
                    placeholder="Tu contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-14 pl-12 rounded-2xl border-slate-800 bg-slate-950/80 text-white placeholder:text-slate-400 focus-visible:ring-teal-500 text-sm"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-14 rounded-2xl bg-[#006666] hover:bg-[#005555] text-white font-bold text-base shadow-xl shadow-[#006666]/20 transition-all hover:scale-[1.01] active:scale-[0.99] focus:ring-2 focus:ring-teal-500"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Validando sesión...
                  </>
                ) : (
                  "Ingresar al Portal"
                )}
              </Button>
            </form>

            <div className="text-center mt-6">
              <Link
                href="/portal/recuperar-password"
                className="text-xs font-medium text-slate-400 hover:text-teal-300 transition-colors underline underline-offset-4"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="text-center mt-6">
          <Link
            href="/"
            className="text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
          >
            ← Volver a Sovogin.org
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
