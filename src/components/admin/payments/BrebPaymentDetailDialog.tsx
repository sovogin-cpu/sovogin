"use client";

import React, { useState } from "react";
import {
  X,
  CheckCircle2,
  Ban,
  Building2,
  User,
  Mail,
  Smartphone,
  CreditCard,
  Calendar,
  AlertCircle,
  Loader2,
  Clock,
  ShieldCheck,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrebRejectDialog } from "./BrebRejectDialog";

export interface PaymentOrderRecord {
  id: string;
  reference: string;
  product_type: string;
  product_id?: string | null;
  product_name: string;
  customer_name: string;
  customer_last_name: string;
  customer_email: string;
  customer_phone?: string | null;
  customer_document_type?: string | null;
  customer_document_number?: string | null;
  amount: number;
  currency: string;
  status: string;
  payment_method: string;
  category?: string | null;
  modality?: string | null;
  breb_reported_at?: string | null;
  breb_verified_at?: string | null;
  breb_verified_by?: string | null;
  breb_rejection_reason?: string | null;
  breb_transaction_reference?: string | null;
  registration_id?: string | null;
  created_at: string;
}

interface BrebPaymentDetailDialogProps {
  isOpen: boolean;
  order: PaymentOrderRecord | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const BrebPaymentDetailDialog: React.FC<
  BrebPaymentDetailDialogProps
> = ({ isOpen, order, onClose, onSuccess }) => {
  const [bankRefInput, setBankRefInput] = useState("");
  const [approving, setApproving] = useState(false);
  const [showConfirmApprove, setShowConfirmApprove] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !order) return null;

  const fullName = `${order.customer_name || ""} ${order.customer_last_name || ""}`.trim() || "Asistente";
  const formattedAmount = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(order.amount);

  const formattedDate = new Date(order.created_at).toLocaleString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const formattedReportedAt = order.breb_reported_at
    ? new Date(order.breb_reported_at).toLocaleString("es-CO", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "No registrado";

  const handleApproveSubmit = async () => {
    try {
      setApproving(true);
      setErrorMessage(null);

      const res = await fetch("/api/admin/payments/breb/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: order.id,
          brebTransactionReference: bankRefInput.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(
          data.error || "Ocurrió un error al aprobar la orden Bre-B."
        );
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error("Error al aprobar pago Bre-B:", err);
      setErrorMessage(
        err instanceof Error ? err.message : "Error al conectar con el servidor."
      );
    } finally {
      setApproving(false);
    }
  };

  const isPendingVerification = order.status === "pending_verification";

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-2xl w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 text-blue-700 flex items-center justify-center">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                  Conciliación de Pago Bre-B
                </span>
                <h3 className="text-xl font-bold text-slate-900 font-heading">
                  Referencia: {order.reference}
                </h3>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={approving}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Alert Message */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-start gap-3 text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Grid de Datos del Participante y Evento */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Columna 1: Participante */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Datos del Asistente
              </span>

              <div className="flex items-center gap-2.5 text-sm font-bold text-slate-800">
                <User className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{fullName}</span>
              </div>

              <div className="flex items-center gap-2.5 text-xs text-slate-600">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <span>{order.customer_email}</span>
              </div>

              {order.customer_phone && (
                <div className="flex items-center gap-2.5 text-xs text-slate-600">
                  <Smartphone className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>{order.customer_phone}</span>
                </div>
              )}

              <div className="flex items-center gap-2.5 text-xs text-slate-600">
                <CreditCard className="w-4 h-4 text-slate-400 shrink-0" />
                <span>
                  {order.customer_document_type || "CC"}:{" "}
                  {order.customer_document_number || "No registrado"}
                </span>
              </div>
            </div>

            {/* Columna 2: Evento y Tarifa */}
            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 space-y-3">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                Detalle del Registro
              </span>

              <div className="space-y-1">
                <span className="text-xs text-slate-500 block font-medium">Evento:</span>
                <span className="text-sm font-bold text-slate-900 leading-tight block">
                  {order.product_name}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200">
                <span className="text-slate-500 font-medium">Categoría:</span>
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <Tag className="w-3 h-3 text-slate-400" />
                  {order.category || "General"}
                </span>
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 font-medium">Modalidad:</span>
                <span className="font-bold text-slate-800 uppercase text-[11px] px-2 py-0.5 bg-slate-200/60 rounded-md">
                  {order.modality || "presencial"}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-200">
                <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                  Monto Exacto:
                </span>
                <span className="text-xl font-extrabold text-slate-900 font-heading">
                  {formattedAmount}
                </span>
              </div>
            </div>
          </div>

          {/* Tiempos de Reporte */}
          <div className="bg-blue-50/60 border border-blue-100 p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs text-blue-900">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Orden creada: <strong>{formattedDate}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>Reportado por usuario: <strong>{formattedReportedAt}</strong></span>
            </div>
          </div>

          {/* Estado de Reclamación / Rechazo Previo */}
          {order.breb_rejection_reason && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-2xl text-xs text-red-800 space-y-1">
              <strong className="block text-red-900 uppercase font-bold tracking-wider">
                Motivo del Rechazo Previo:
              </strong>
              <p>{order.breb_rejection_reason}</p>
            </div>
          )}

          {/* Paso de Confirmación de Aprobación */}
          {showConfirmApprove ? (
            <div className="bg-emerald-50 border-2 border-emerald-300 p-5 rounded-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-start gap-3">
                <ShieldCheck className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Confirmar Aprobación de Pago Bre-B
                  </h4>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Confirma que verificaste en el extracto bancario de Banco de Bogotá que el abono por <strong>{formattedAmount}</strong> fue efectivamente recibido.
                  </p>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="bankRef" className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Número de Transacción Bancaria (Opcional):
                </Label>
                <Input
                  id="bankRef"
                  type="text"
                  value={bankRefInput}
                  onChange={(e) => setBankRefInput(e.target.value)}
                  placeholder="Ej. BOG-987654321"
                  className="h-10 text-xs rounded-xl bg-white border-slate-200 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={approving}
                  onClick={() => setShowConfirmApprove(false)}
                  className="rounded-xl border-slate-200 text-xs font-bold"
                >
                  Regresar
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={approving}
                  onClick={handleApproveSubmit}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-md shadow-emerald-600/10 flex items-center gap-2"
                >
                  {approving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Procesando Aprobación...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Confirmar y Crear Inscripción
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            /* Botones de Acción Principal */
            <div className="pt-2 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={approving}
                className="rounded-xl border-slate-200 text-xs font-bold"
              >
                Cerrar Detalle
              </Button>

              {isPendingVerification && (
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowRejectModal(true)}
                    disabled={approving}
                    className="border-red-200 text-red-600 hover:bg-red-50 font-bold rounded-xl text-xs flex items-center gap-2"
                  >
                    <Ban className="w-4 h-4" />
                    Rechazar
                  </Button>

                  <Button
                    type="button"
                    onClick={() => setShowConfirmApprove(true)}
                    disabled={approving}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/10"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Aprobar Pago Bre-B
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal Secundario de Rechazo */}
      <BrebRejectDialog
        isOpen={showRejectModal}
        orderId={order.id}
        reference={order.reference}
        customerName={fullName}
        eventTitle={order.product_name}
        onClose={() => setShowRejectModal(false)}
        onSuccess={() => {
          onSuccess();
          onClose();
        }}
      />
    </>
  );
};
