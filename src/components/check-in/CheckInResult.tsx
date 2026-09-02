"use client";

import React from "react";
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, Clock, User, Calendar, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export type CheckInResultStatus =
  | "success"
  | "already_checked_in"
  | "pending"
  | "cancelled"
  | "event_mismatch"
  | "invalid_qr"
  | "error";

export interface CheckInResultData {
  status: CheckInResultStatus;
  fullName?: string;
  eventTitle?: string;
  category?: string;
  modality?: string;
  checkedInAt?: string;
  message?: string;
  actualEventTitle?: string;
}

interface CheckInResultProps {
  data: CheckInResultData;
  onReset: () => void;
}

export const CheckInResult: React.FC<CheckInResultProps> = ({ data, onReset }) => {
  const formatTime = (isoString?: string) => {
    if (!isoString) return "";
    try {
      return format(new Date(isoString), "hh:mm a", { locale: es });
    } catch {
      return isoString;
    }
  };

  // 1. INGRESO REGISTRADO EXITOSAMENTE
  if (data.status === "success") {
    return (
      <div className="w-full max-w-md bg-emerald-500 text-white rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-14 h-14 text-white" />
        </div>

        <div>
          <span className="bg-emerald-700/60 text-emerald-100 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
            ✓ INGRESO REGISTRADO
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold mt-3 tracking-tight">
            {data.fullName}
          </h2>
        </div>

        <div className="w-full bg-emerald-600/60 backdrop-blur-sm rounded-2xl p-4 text-left space-y-2 text-sm">
          <div className="flex items-center justify-between border-b border-emerald-500/40 pb-2">
            <span className="text-emerald-200 flex items-center gap-1.5 font-medium">
              <Calendar className="w-4 h-4" /> Evento
            </span>
            <span className="font-semibold text-white truncate max-w-[200px]">
              {data.eventTitle}
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-emerald-500/40 pb-2">
            <span className="text-emerald-200 flex items-center gap-1.5 font-medium">
              <Tag className="w-4 h-4" /> Categoría / Modalidad
            </span>
            <span className="font-semibold text-white capitalize">
              {data.category} {data.modality && data.modality !== "registration_type" ? `(${data.modality})` : ""}
            </span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="text-emerald-200 flex items-center gap-1.5 font-medium">
              <Clock className="w-4 h-4" /> Hora de Ingreso
            </span>
            <span className="font-bold text-white text-base">
              {formatTime(data.checkedInAt)}
            </span>
          </div>
        </div>

        <Button
          onClick={onReset}
          className="w-full bg-white hover:bg-emerald-50 text-emerald-800 font-extrabold text-lg h-14 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95"
        >
          <RefreshCw className="w-5 h-5" /> Escanear Siguiente
        </Button>
      </div>
    );
  }

  // 2. YA HABÍA INGRESADO PREVIAMENTE
  if (data.status === "already_checked_in") {
    return (
      <div className="w-full max-w-md bg-amber-500 text-slate-900 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="w-20 h-20 bg-amber-600/30 rounded-full flex items-center justify-center">
          <AlertTriangle className="w-14 h-14 text-slate-900" />
        </div>

        <div>
          <span className="bg-amber-700/30 text-slate-950 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
            ⚠ YA REGISTRADO
          </span>
          <h2 className="text-2xl sm:text-3xl font-extrabold mt-3 tracking-tight">
            {data.fullName}
          </h2>
        </div>

        <div className="w-full bg-amber-600/30 rounded-2xl p-4 text-left space-y-2 text-sm text-slate-950">
          <div className="flex items-center justify-between border-b border-amber-600/40 pb-2">
            <span className="flex items-center gap-1.5 font-semibold text-slate-800">
              <Calendar className="w-4 h-4" /> Evento
            </span>
            <span className="font-bold truncate max-w-[200px]">
              {data.eventTitle}
            </span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <span className="flex items-center gap-1.5 font-semibold text-slate-800">
              <Clock className="w-4 h-4" /> Ingresó previamente
            </span>
            <span className="font-extrabold text-base">
              {formatTime(data.checkedInAt)}
            </span>
          </div>
        </div>

        <Button
          onClick={onReset}
          className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-lg h-14 rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95"
        >
          <RefreshCw className="w-5 h-5" /> Escanear Siguiente
        </Button>
      </div>
    );
  }

  // 3. EVENT MISMATCH (Esta inscripción pertenece a otro evento)
  if (data.status === "event_mismatch") {
    return (
      <div className="w-full max-w-md bg-rose-600 text-white rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
          <XCircle className="w-14 h-14 text-white" />
        </div>

        <div>
          <span className="bg-rose-800/70 text-rose-100 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
            EVENTO INCORRECTO
          </span>
          <h2 className="text-xl sm:text-2xl font-bold mt-3">
            Esta inscripción pertenece a otro evento.
          </h2>
          {data.fullName && (
            <p className="text-sm font-semibold text-rose-100 mt-1">
              Participante: {data.fullName}
            </p>
          )}
          {data.actualEventTitle && (
            <p className="text-xs text-rose-200 mt-1">
              Evento correcto: {data.actualEventTitle}
            </p>
          )}
        </div>

        <Button
          onClick={onReset}
          className="w-full bg-white hover:bg-rose-50 text-rose-900 font-extrabold text-lg h-14 rounded-2xl shadow-lg flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-5 h-5" /> Intentar de nuevo
        </Button>
      </div>
    );
  }

  // 4. INSCRIPCIÓN PENDIENTE O CANCELADA
  if (data.status === "pending" || data.status === "cancelled") {
    const isPending = data.status === "pending";
    return (
      <div className="w-full max-w-md bg-red-700 text-white rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
          <XCircle className="w-14 h-14 text-white" />
        </div>

        <div>
          <span className="bg-red-900/80 text-red-100 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
            {isPending ? "INSCRIPCIÓN PENDIENTE" : "INSCRIPCIÓN CANCELADA"}
          </span>
          <h2 className="text-2xl font-bold mt-3">
            {data.fullName || "Participante"}
          </h2>
          <p className="text-sm text-red-200 mt-2">
            {isPending
              ? "El pago o estado de la inscripción aún no ha sido confirmado. No registrar ingreso."
              : "La inscripción se encuentra anulada o cancelada. No registrar ingreso."}
          </p>
        </div>

        <Button
          onClick={onReset}
          className="w-full bg-white hover:bg-red-50 text-red-950 font-extrabold text-lg h-14 rounded-2xl shadow-lg flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-5 h-5" /> Continuar
        </Button>
      </div>
    );
  }

  // 5. CÓDIGO QR NO VÁLIDO O ERROR GENERAL
  return (
    <div className="w-full max-w-md bg-slate-800 text-white rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center space-y-5 animate-in fade-in zoom-in-95 duration-200">
      <div className="w-20 h-20 bg-slate-700 rounded-full flex items-center justify-center">
        <XCircle className="w-14 h-14 text-slate-300" />
      </div>

      <div>
        <span className="bg-slate-700 text-slate-200 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider">
          CÓDIGO NO RECONOCIDO
        </span>
        <h2 className="text-xl font-bold mt-3">
          Código QR no válido o no reconocido.
        </h2>
        <p className="text-xs text-slate-400 mt-2">
          Verifica que la credencial corresponda a SOVOGIN o intenta con el código manual.
        </p>
      </div>

      <Button
        onClick={onReset}
        className="w-full bg-slate-100 hover:bg-white text-slate-900 font-extrabold text-lg h-14 rounded-2xl shadow-lg flex items-center justify-center gap-2"
      >
        <RefreshCw className="w-5 h-5" /> Intentar de nuevo
      </Button>
    </div>
  );
};
