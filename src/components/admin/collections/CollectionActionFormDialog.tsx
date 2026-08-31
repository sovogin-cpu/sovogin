"use client";

import React, { useState } from "react";
import { Loader2, PlusCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { parseBogotaDateTimeToUtcIso } from "@/lib/collections/collections-service";

interface CollectionActionFormDialogProps {
  associateId: string;
  associateName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CollectionActionFormDialog({
  associateId,
  associateName,
  open,
  onOpenChange,
  onSuccess,
}: CollectionActionFormDialogProps) {
  const [channel, setChannel] = useState("phone");
  const [actionType, setActionType] = useState("follow_up");
  const [resultStatus, setResultStatus] = useState("contacted");
  const [notes, setNotes] = useState("");
  const [promisedPaymentDate, setPromisedPaymentDate] = useState("");
  const [promisedPaymentAmount, setPromisedPaymentAmount] = useState("");
  const [nextFollowUpAt, setNextFollowUpAt] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const resetForm = () => {
    setChannel("phone");
    setActionType("follow_up");
    setResultStatus("contacted");
    setNotes("");
    setPromisedPaymentDate("");
    setPromisedPaymentAmount("");
    setNextFollowUpAt("");
    setErrorMsg(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!associateId) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      // Deterministic conversion forcing Colombia Time (America/Bogota, UTC-5)
      const formattedFollowUpIso = parseBogotaDateTimeToUtcIso(nextFollowUpAt);

      const payload = {
        channel,
        action_type: actionType,
        result_status: resultStatus,
        notes: notes.trim() || null,
        promised_payment_date: promisedPaymentDate || null,
        promised_payment_amount: promisedPaymentAmount
          ? Number(promisedPaymentAmount)
          : null,
        next_follow_up_at: formattedFollowUpIso,
      };

      const res = await fetch(`/api/admin/collections/${associateId}/actions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo registrar la gestión de cobranza.");
      }

      resetForm();
      onOpenChange(false);
      onSuccess();
    } catch (err: unknown) {
      console.error("Error al registrar gestión:", err);
      setErrorMsg(
        err instanceof Error ? err.message : "Error al registrar la gestión de cobranza."
      );
    } fontally: {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!isSubmitting) {
          setErrorMsg(null);
          onOpenChange(v);
        }
      }}
    >
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-blue-600" />
            Registrar Gestión de Cobranza
          </DialogTitle>
          <p className="text-xs text-slate-500">
            Asociado: <strong className="text-slate-800">{associateName}</strong>
          </p>
        </DialogHeader>

        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-lg text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-sm mt-2">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Canal */}
            <div>
              <Label className="text-xs font-semibold text-slate-700">Canal *</Label>
              <select
                value={channel}
                onChange={(e) => setChannel(e.target.value)}
                disabled={isSubmitting}
                className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-md text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="phone">Teléfono / Llamada</option>
                <option value="whatsapp">WhatsApp</option>
                <option value="email">Correo Electrónico</option>
                <option value="in_person">Presencial</option>
                <option value="system">Sistema</option>
                <option value="other">Otro</option>
              </select>
            </div>

            {/* Tipo de Acción */}
            <div>
              <Label className="text-xs font-semibold text-slate-700">Tipo de Gestión *</Label>
              <select
                value={actionType}
                onChange={(e) => setActionType(e.target.value)}
                disabled={isSubmitting}
                className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-md text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="follow_up">Seguimiento General</option>
                <option value="initial_reminder">Recordatorio Inicial</option>
                <option value="payment_notice">Aviso de Pago</option>
                <option value="payment_promise">Promesa de Pago</option>
                <option value="dispute">Disputa / Objeción</option>
                <option value="escalation">Escalamiento</option>
                <option value="note">Nota Interna</option>
              </select>
            </div>

            {/* Resultado */}
            <div>
              <Label className="text-xs font-semibold text-slate-700">Resultado *</Label>
              <select
                value={resultStatus}
                onChange={(e) => setResultStatus(e.target.value)}
                disabled={isSubmitting}
                className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-md text-xs focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="contacted">Contactado</option>
                <option value="no_answer">Sin Respuesta</option>
                <option value="promise_agreed">Compromiso Acordado</option>
                <option value="disputed">En Disputa</option>
                <option value="pending">Pendiente</option>
              </select>
            </div>
          </div>

          {/* Notas de la Gestión */}
          <div>
            <Label className="text-xs font-semibold text-slate-700">Observaciones / Notas</Label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Escribe un resumen detallado de la conversación o acuerdo logrado..."
              rows={3}
              disabled={isSubmitting}
              className="w-full mt-1 px-3 py-2 bg-white border border-slate-200 rounded-md text-xs focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
          </div>

          {/* Promesa de Pago Opcional */}
          <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-lg space-y-3">
            <h5 className="text-xs font-bold text-emerald-800">Promesa de Pago (Opcional)</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-[11px] text-emerald-700">Fecha de Pago Prometida</Label>
                <Input
                  type="date"
                  value={promisedPaymentDate}
                  onChange={(e) => setPromisedPaymentDate(e.target.value)}
                  disabled={isSubmitting}
                  className="h-8 text-xs mt-1 bg-white"
                />
              </div>

              <div>
                <Label className="text-[11px] text-emerald-700">Monto Prometido (COP)</Label>
                <Input
                  type="number"
                  placeholder="ej. 250000"
                  value={promisedPaymentAmount}
                  onChange={(e) => setPromisedPaymentAmount(e.target.value)}
                  disabled={isSubmitting}
                  className="h-8 text-xs mt-1 bg-white"
                />
              </div>
            </div>
          </div>

          {/* Próximo Seguimiento Opcional */}
          <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-lg">
            <Label className="text-xs font-bold text-blue-800">Programar Próximo Seguimiento (Opcional)</Label>
            <Input
              type="datetime-local"
              value={nextFollowUpAt}
              onChange={(e) => setNextFollowUpAt(e.target.value)}
              disabled={isSubmitting}
              className="h-8 text-xs mt-1 bg-white"
            />
          </div>

          {/* Botones de Acción */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Guardando...
                </>
              ) : (
                "Guardar Gestión"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
