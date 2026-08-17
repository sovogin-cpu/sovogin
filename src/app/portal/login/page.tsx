"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock, Mail, Loader2, AlertCircle, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { sanitizeRedirectUrl } from "@/lib/portal/redirect-sanitizer";

function PortalLoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
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

      const rawRedirect = searchParams?.get("redirectTo");
      const targetDestination = sanitizeRedirectUrl(rawRedirect);

      router.push(targetDestination);
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
    <Card className="bg-slate-900/90 border-slate-800 backdrop-blur-xl text-slate-100 shadow-2xl">
      <CardHeader className="space-y-3 text-center pb-6 border-b border-slate-800/80">
        <div className="mx-auto w-12 h-12 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <CardTitle className="text-2xl font-bold tracking-tight text-white">
            Portal del Asociado
          </CardTitle>
          <CardDescription className="text-slate-400 text-sm">
            Acceso exclusivo para miembros activos de SOVOGIN
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="pt-6">
        <form onSubmit={handleLogin} className="space-y-4">
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs font-medium flex items-center gap-2.5"
            >
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </motion.div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="medico@ejemplo.com"
                className="pl-10 bg-slate-950/60 border-slate-800 focus:border-teal-500 focus:ring-teal-500/20 text-slate-100 placeholder:text-slate-600 text-sm h-11 rounded-xl"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-300">
                Contraseña
              </label>
              <Link
                href="/portal/recuperar-password"
                className="text-xs text-teal-400 hover:text-teal-300 transition-colors font-medium"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="pl-10 bg-slate-950/60 border-slate-800 focus:border-teal-500 focus:ring-teal-500/20 text-slate-100 placeholder:text-slate-600 text-sm h-11 rounded-xl"
              />
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-11 bg-teal-600 hover:bg-teal-500 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg shadow-teal-900/20 mt-2"
          >
            {loading ? (
              <div className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Verificando...</span>
              </div>
            ) : (
              "Ingresar al Portal"
            )}
          </Button>

          <div className="pt-4 text-center border-t border-slate-800/80">
            <p className="text-xs text-slate-400">
              ¿Aún no eres miembro de SOVOGIN?{" "}
              <Link
                href="/asociarse"
                className="text-teal-400 hover:text-teal-300 font-semibold underline underline-offset-4"
              >
                Solicita tu afiliación
              </Link>
            </p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default function PortalLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 p-4 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-teal-500/10 blur-3xl rounded-l-full" />
      <div className="absolute bottom-0 left-0 w-1/3 h-1/2 bg-blue-600/10 blur-3xl rounded-r-full" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md relative z-10"
      >
        <Suspense fallback={
          <div className="p-8 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-teal-400" />
          </div>
        }>
          <PortalLoginForm />
        </Suspense>
      </motion.div>
    </div>
  );
}
