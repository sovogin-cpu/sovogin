"use client";

import React, { useState } from "react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Lock, AlertCircle } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

interface MemberVerificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerified: (url: string) => void;
  targetUrl: string;
  eventId?: string;
}

export function MemberVerificationModal({ 
  isOpen, 
  onClose, 
  onVerified, 
  targetUrl,
  eventId 
}: MemberVerificationModalProps) {
  const [credentials, setCredentials] = useState({ email: "", document: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 1. Check if they are an active associate
      const { data: associate } = await supabase
        .from('associates')
        .select('*')
        .eq('email', credentials.email.toLowerCase())
        .eq('document_number', credentials.document.trim())
        .eq('status', 'Activo')
        .single();

      if (associate) {
        sessionStorage.setItem("member_access", "granted");
        window.dispatchEvent(new Event("member-login-change"));
        onVerified(targetUrl);
        return;
      }

      // 2. If not associate, check if they are registered for THIS event
      if (eventId) {
        const { data: registration } = await supabase
          .from('registrations')
          .select('*')
          .eq('event_id', eventId)
          .eq('email', credentials.email.toLowerCase())
          .eq('document_number', credentials.document.trim())
          .eq('status', 'confirmed')
          .single();

        if (registration) {
          onVerified(targetUrl);
          return;
        }
      }

      setError("No se encontró una membresía activa o registro confirmado para este evento.");
    } catch (err) {
      setError("Error al verificar credenciales. Por favor intente de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px] rounded-[2rem] border-none shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold font-heading flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Lock className="w-5 h-5 text-primary" />
            </div>
            Acceso Privado
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          <p className="text-slate-500 text-sm">
            Para ingresar al evento en vivo, debe ser un **Asociado Activo** o haber completado su **Inscripción**.
          </p>

          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <Input 
                id="email"
                type="email" 
                required
                placeholder="ejemplo@correo.com"
                value={credentials.email}
                onChange={e => setCredentials({...credentials, email: e.target.value})}
                className="rounded-xl h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc">Número de Documento</Label>
              <Input 
                id="doc"
                type="text" 
                required
                placeholder="12345678"
                value={credentials.document}
                onChange={e => setCredentials({...credentials, document: e.target.value})}
                className="rounded-xl h-12"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 text-red-600 text-xs flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              disabled={loading} 
              className="w-full h-14 rounded-xl bg-primary text-white font-bold text-lg shadow-lg shadow-primary/20"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verificar y Entrar"}
            </Button>
          </form>

          <div className="pt-4 text-center">
             <p className="text-xs text-slate-400">
               ¿No estás inscrito? <a href={`/simposios/${eventId}/registro`} className="text-primary font-bold hover:underline">Regístrate ahora</a>
             </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
