"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  Clock,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  Building2,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface BreBPaymentInstructionsProps {
  reference: string;
  amount: number;
  eventTitle: string;
  brebQrUrl: string;
  initialStatus?: string;
  onReportSuccess?: () => void;
}

export const BreBPaymentInstructions: React.FC<
  BreBPaymentInstructionsProps
> = ({
  reference,
  amount,
  eventTitle,
  brebQrUrl,
  initialStatus = "pending",
  onReportSuccess,
}) => {
  const [status, setStatus] = useState<string>(initialStatus);
  const [reporting, setReporting] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const [copiedAmount, setCopiedAmount] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const formattedAmount = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);

  const handleCopyRef = () => {
    navigator.clipboard.writeText(reference);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handleCopyAmount = () => {
    navigator.clipboard.writeText(amount.toString());
    setCopiedAmount(true);
    setTimeout(() => setCopiedAmount(false), 2000);
  };

  const handleReportPayment = async () => {
    try {
      setReporting(true);
      setErrorMessage(null);

      const res = await fetch("/api/payments/breb/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setStatus("pending_verification");
        if (onReportSuccess) onReportSuccess();
      } else {
        setErrorMessage(
          data.error || "Ocurrió un error al reportar la transferencia."
        );
      }
    } catch (err: unknown) {
      console.error("Error al reportar pago Bre-B:", err);
      setErrorMessage(
        "Error de conexión con el servidor. Intenta de nuevo."
      );
    } finally {
      setReporting(false);
    }
  };

  const isPendingVerification = status === "pending_verification";

  return (
    <div className="w-full bg-white rounded-[2.5rem] p-6 sm:p-10 border border-slate-200 shadow-xl space-y-6">
      {/* Header Badge */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-blue-50 text-blue-800 text-xs font-bold rounded-full border border-blue-200">
          <Building2 className="w-4 h-4 text-blue-600" />
          <span>Pago por Transferencia QR — Banco de Bogotá (Bre-B)</span>
        </div>
        <span className="text-xs text-slate-400 font-medium">SOVOGIN MID</span>
      </div>

      {/* Event Info */}
      <div className="space-y-1">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
          Inscripción para
        </span>
        <h3 className="text-2xl font-bold text-slate-900 font-heading">
          {eventTitle}
        </h3>
      </div>

      {/* Main Container QR + Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-slate-50 p-6 rounded-3xl border border-slate-100">
        {/* QR Oficial Banco de Bogotá */}
        <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl shadow-sm border border-slate-200 text-center space-y-3">
          <div className="relative w-48 h-48 sm:w-56 sm:h-56 bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center">
            {/* Imagen del QR Oficial */}
            <img
              src={brebQrUrl}
              alt="QR Oficial Banco de Bogotá SOVOGIN"
              className="w-full h-full object-contain p-2"
              onError={(e) => {
                // Fallback visual si la imagen del QR no carga
                (e.target as HTMLImageElement).src =
                  "https://placehold.co/300x300/003366/ffffff?text=QR+Banco+de+Bogota";
              }}
            />
          </div>
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Código QR Oficial Banco de Bogotá
          </span>
        </div>

        {/* Informes y Monto */}
        <div className="space-y-5">
          {/* Monto exacto */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
              Monto Exacto a Transferir
            </span>
            <div className="flex items-center justify-between">
              <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-heading">
                {formattedAmount}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCopyAmount}
                className="h-8 px-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                {copiedAmount ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Referencia SOVOGIN */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block">
              Referencia SOVOGIN
            </span>
            <div className="flex items-center justify-between">
              <span className="text-base font-mono font-bold text-slate-900 break-all">
                {reference}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCopyRef}
                className="h-8 px-2 text-xs font-semibold text-slate-600 hover:text-slate-900 shrink-0"
              >
                {copiedRef ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Pasos */}
          <div className="text-xs text-slate-600 space-y-2">
            <div className="font-bold text-slate-800 uppercase tracking-wider">
              Instrucciones de Pago:
            </div>
            <ol className="list-decimal list-inside space-y-1 text-slate-600 font-medium">
              <li>Abre la aplicación móvil de tu entidad bancaria.</li>
              <li>Selecciona la opción **Escanear QR** o transferir a Bre-B.</li>
              <li>Transfiere el monto exacto: **{formattedAmount}**.</li>
              <li>Ingresa la referencia **{reference}** en el concepto.</li>
              <li>Al finalizar la transferencia, presiona el botón de confirmación.</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-center gap-3 text-red-700 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Action Area: Pending Verification vs Report Button */}
      {isPendingVerification ? (
        <div className="bg-amber-50 border-2 border-amber-300 p-6 rounded-3xl text-center space-y-3 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-700">
            <Clock className="w-8 h-8" />
          </div>
          <div>
            <span className="bg-amber-200 text-amber-900 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
              Reporte Recibido — En Verificación
            </span>
            <h4 className="text-lg font-bold text-slate-900 mt-2">
              Tu reporte de transferencia ha sido registrado
            </h4>
            <p className="text-xs text-slate-600 max-w-lg mx-auto mt-1">
              El equipo administrativo de SOVOGIN verificará el abono mediante extracto bancario. Una vez verificado, tu inscripción será confirmada y se te notificará por correo.
            </p>
          </div>
          <div className="pt-2 flex items-center justify-center gap-2 text-xs font-semibold text-slate-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Referencia guardada: {reference}</span>
          </div>
        </div>
      ) : (
        <div className="pt-2 space-y-3">
          <Button
            type="button"
            onClick={handleReportPayment}
            disabled={reporting}
            className="w-full h-16 bg-blue-700 hover:bg-blue-800 text-white font-extrabold text-lg rounded-2xl shadow-xl shadow-blue-900/10 flex items-center justify-center gap-3 transition-all active:scale-[0.99]"
          >
            {reporting ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Registrando reporte de pago...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-6 h-6" />
                Ya realicé el pago
              </>
            )}
          </Button>
          <p className="text-center text-[11px] text-slate-400 font-medium">
            Al presionar este botón informas que realizaste la transferencia para su posterior verificación.
          </p>
        </div>
      )}
    </div>
  );
};
