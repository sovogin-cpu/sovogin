"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Registration } from "@/lib/registrations/types";
import {
  formatCopCurrency,
  formatRegistrationCheckInMethodLabel,
  formatRegistrationOriginLabel,
  maskDocument,
} from "@/lib/registrations/registration-utils";
import { RegistrationStatusBadge } from "./RegistrationStatusBadge";
import { PaymentStatusBadge } from "./PaymentStatusBadge";
import { RegistrationOriginBadge } from "./RegistrationOriginBadge";
import { RegistrationCheckInBadge } from "./RegistrationCheckInBadge";
import { User, Calendar, CreditCard, ShieldCheck, UserCheck, QrCode } from "lucide-react";

interface RegistrationDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  registration: Registration | null;
  onOpenQrModal?: (registration: Registration) => void;
}

export function RegistrationDetailDialog({
  isOpen,
  onClose,
  registration,
  onOpenQrModal,
}: RegistrationDetailDialogProps) {
  if (!registration) return null;

  const isOpenpay = registration.origin === "openpay";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:p-8 space-y-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold font-heading text-slate-900 dark:text-white flex items-center justify-between gap-4">
            <span>Detalle de Inscripción</span>
            <RegistrationOriginBadge origin={registration.origin} />
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 text-sm">
          {/* Section A: Participante */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wider">
              <User className="w-4 h-4 text-emerald-600" />
              <span>Datos del Participante</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block">Nombre Completo:</span>
                <span className="font-bold text-slate-900 dark:text-white text-sm">
                  {registration.full_name || "—"}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block">Correo Electrónico:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {registration.email || "—"}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block">Documento:</span>
                <span className="font-mono text-slate-800 dark:text-slate-200">
                  {maskDocument(
                    registration.customer_document_type,
                    registration.document_number
                  )}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block">Teléfono:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {registration.phone || "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Section B: Evento & Modalidad */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wider">
              <Calendar className="w-4 h-4 text-blue-600" />
              <span>Información del Evento</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div className="sm:col-span-2">
                <span className="text-slate-500 block">Evento:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {registration.events?.title || "Evento General"}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block">Modalidad:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 capitalize">
                  {registration.modality || "presencial"}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block">Categoría:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {registration.category || "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Section C: Inscripción & Estado */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-purple-600" />
              <span>Estado de la Inscripción</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block mb-1">Estado Inscripción:</span>
                <RegistrationStatusBadge status={registration.status} />
              </div>

              <div>
                <span className="text-slate-500 block">Origen:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {formatRegistrationOriginLabel(registration.origin)}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block">Fecha Registro:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {registration.created_at
                    ? new Date(registration.created_at).toLocaleString("es-CO")
                    : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Section D: Check-in de Asistencia */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wider">
              <UserCheck className="w-4 h-4 text-emerald-600" />
              <span>Ingreso y Acreditación (Check-in)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block mb-1">Estado Check-in:</span>
                <RegistrationCheckInBadge checkedInAt={registration.checked_in_at} />
              </div>

              <div>
                <span className="text-slate-500 block">Fecha / Hora Ingreso:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {registration.checked_in_at
                    ? new Date(registration.checked_in_at).toLocaleString("es-CO")
                    : "—"}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block">Método de Check-in:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {formatRegistrationCheckInMethodLabel(registration.check_in_method)}
                </span>
              </div>
            </div>
          </div>

          {/* Section E: Información Financiera y Pago */}
          <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wider">
              <CreditCard className="w-4 h-4 text-amber-600" />
              <span>Información de Pago</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block mb-1">Estado de Pago:</span>
                <PaymentStatusBadge paymentStatus={registration.payment_status} />
              </div>

              <div>
                <span className="text-slate-500 block">Monto Registrado:</span>
                <span className="font-extrabold text-slate-900 dark:text-white">
                  {formatCopCurrency(registration.amount)}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block">Referencia Pago:</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {registration.payment_reference || "—"}
                </span>
              </div>

              <div>
                <span className="text-slate-500 block">Fecha de Pago:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {registration.paid_at
                    ? new Date(registration.paid_at).toLocaleString("es-CO")
                    : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Section F: Openpay Details (ONLY if origin = openpay) */}
          {isOpenpay && (
            <div className="p-5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 space-y-3">
              <div className="flex items-center gap-2 font-bold text-blue-900 dark:text-blue-200 text-xs uppercase tracking-wider">
                <CreditCard className="w-4 h-4 text-blue-600" />
                <span>Metadatos Pasarela Openpay</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-blue-700 dark:text-blue-300 block">
                    ID Transacción Openpay:
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {registration.openpay_transaction_id || "—"}
                  </span>
                </div>

                <div>
                  <span className="text-blue-700 dark:text-blue-300 block">
                    Código de Autorización:
                  </span>
                  <span className="font-mono font-bold text-slate-900 dark:text-white">
                    {registration.authorization_code || "—"}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="pt-2 flex flex-col sm:flex-row gap-2">
          <Button
            type="button"
            onClick={() => onOpenQrModal && onOpenQrModal(registration)}
            variant="outline"
            className="w-full sm:w-auto h-11 px-5 rounded-2xl border-sky-300 text-sky-700 hover:bg-sky-50 font-bold flex items-center justify-center gap-2"
          >
            <QrCode className="w-4 h-4 text-sky-600" /> Credencial QR
          </Button>
          <Button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto h-11 px-6 rounded-2xl bg-slate-900 dark:bg-slate-700 text-white font-bold"
          >
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

