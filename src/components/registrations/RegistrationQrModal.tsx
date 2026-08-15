"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { QrCode, Printer, Loader2, RefreshCw } from "lucide-react";
import { Registration } from "@/lib/registrations/types";
import { RegistrationQrCode } from "@/components/check-in/RegistrationQrCode";

interface RegistrationQrModalProps {
  isOpen: boolean;
  onClose: () => void;
  registration: Registration | null;
}

export function RegistrationQrModal({
  isOpen,
  onClose,
  registration,
}: RegistrationQrModalProps) {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrGenerateToken = useCallback(async (regId: string) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/admin/check-in/generate-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationId: regId }),
      });

      const data = await res.json();
      if (res.ok && data.token) {
        setToken(data.token);
      } else {
        setError(data.error || "No se pudo obtener la credencial QR.");
      }
    } catch (err: unknown) {
      console.error("Error obteniendo token de credencial:", err);
      setError("Error de conexión con el servidor.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && registration?.id) {
      fetchOrGenerateToken(registration.id);
    } else {
      setToken(null);
      setError(null);
    }
  }, [isOpen, registration, fetchOrGenerateToken]);

  const handlePrint = () => {
    window.print();
  };

  if (!registration) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md rounded-3xl p-6 space-y-4 print:shadow-none print:border-none">
        <DialogHeader className="print:hidden">
          <DialogTitle className="text-lg font-bold flex items-center gap-2 text-slate-900 dark:text-white">
            <QrCode className="w-5 h-5 text-sky-600" />
            Credencial de Acreditación QR
          </DialogTitle>
        </DialogHeader>

        {/* Zona imprimible */}
        <div id="printable-qr-badge" className="flex flex-col items-center text-center space-y-4 py-2">
          <div>
            <h3 className="text-xl font-extrabold text-slate-900 dark:text-white">
              {registration.full_name}
            </h3>
            <p className="text-xs font-semibold text-slate-500 mt-1">
              {registration.events?.title || "Evento SOVOGIN"}
            </p>
            <div className="flex justify-center gap-2 mt-2">
              <span className="bg-sky-100 text-sky-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                {registration.category || "Participante"}
              </span>
              <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
                {registration.modality || "Presencial"}
              </span>
            </div>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center gap-2 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-sky-600" />
              <span className="text-xs font-medium">Generando credencial segura...</span>
            </div>
          ) : error ? (
            <div className="py-6 text-center space-y-3">
              <p className="text-xs font-semibold text-red-600">{error}</p>
              <Button
                size="sm"
                onClick={() => registration?.id && fetchOrGenerateToken(registration.id)}
                variant="outline"
                className="gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reintentar
              </Button>
            </div>
          ) : token ? (
            <RegistrationQrCode token={token} size={200} />
          ) : null}
        </div>

        <DialogFooter className="print:hidden pt-2 flex flex-col sm:flex-row gap-2">
          {token && (
            <Button
              type="button"
              onClick={handlePrint}
              variant="outline"
              className="w-full sm:w-auto gap-2 border-slate-300 font-bold"
            >
              <Printer className="w-4 h-4" /> Imprimir Credencial
            </Button>
          )}
          <Button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto bg-slate-900 text-white font-bold"
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
