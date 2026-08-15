"use client";

import React, { useState } from "react";
import { AlertCircle, Loader2, X, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface BrebRejectDialogProps {
  isOpen: boolean;
  orderId: string;
  reference: string;
  customerName: string;
  eventTitle: string;
  onClose: () => void;
  onSuccess: () => void;
}

const QUICK_REASONS = [
  "Transferencia no encontrada en extracto bancario",
  "Monto transferido no coincide con la orden",
  "Comprobante ilegible o incompleto",
  "Referencia de pago no coincide",
];

export const BrebRejectDialog: React.FC<BrebRejectDialogProps> = ({
  isOpen,
  orderId,
  reference,
  customerName,
  eventTitle,
  onClose,
  onSuccess,
}) => {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectQuickReason = (text: string) => {
    setReason(text);
    if (error) setError(null);
  };

  const handleReject = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanReason = reason.trim();
    if (cleanReason.length < 5) {
      setError("Ingresa un motivo de rechazo de al menos 5 caracteres.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch("/api/admin/payments/breb/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          reason: cleanReason,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Ocurrió un error al rechazar la orden.");
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error("Error al rechazar pago Bre-B:", err);
      setError(
        err instanceof Error ? err.message : "Error al conectar con el servidor."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
              <Ban className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Rechazar Reporte Bre-B
              </h3>
              <p className="text-xs text-slate-500 font-mono">{reference}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Box */}
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-1 text-xs text-slate-600">
          <p>
            <strong>Asistente:</strong> {customerName}
          </p>
          <p>
            <strong>Evento:</strong> {eventTitle}
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleReject} className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Motivos Frecuentes:
            </Label>
            <div className="flex flex-wrap gap-2">
              {QUICK_REASONS.map((text) => (
                <button
                  key={text}
                  type="button"
                  onClick={() => handleSelectQuickReason(text)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-[11px] font-semibold text-slate-700 text-left transition-all active:scale-[0.98]"
                >
                  {text}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rejectReason" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Motivo Detallado del Rechazo *
            </Label>
            <Textarea
              id="rejectReason"
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError(null);
              }}
              placeholder="Explica la razón por la cual se rechaza este comprobante de transferencia..."
              className="rounded-2xl border-slate-200 text-sm focus:ring-red-500/20 focus:border-red-500"
            />
          </div>

          {error && (
            <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 flex items-center gap-2.5 text-red-700 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
              className="rounded-xl border-slate-200"
            >
              Cancelar
            </Button>

            <Button
              type="submit"
              disabled={submitting || reason.trim().length < 5}
              className="bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-red-600/10"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Rechazando...
                </>
              ) : (
                <>
                  <Ban className="w-4 h-4" />
                  Confirmar Rechazo
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
