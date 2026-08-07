"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import {
  CreateManualRegistrationDTO,
  Registration,
  RegistrationEventItem,
  RegistrationOrigin,
  RegistrationPaymentStatus,
  RegistrationStatus,
} from "@/lib/registrations/types";
import { cleanEmail } from "@/lib/registrations/registration-utils";
import { findPossibleDuplicateRegistration } from "@/lib/registrations/registration-repository";

interface RegistrationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  registrationToEdit?: Registration | null;
  events: RegistrationEventItem[];
}

export function RegistrationDialog({
  isOpen,
  onClose,
  onSaved,
  registrationToEdit,
  events,
}: RegistrationDialogProps) {
  const isEditing = Boolean(registrationToEdit);
  const isOpenpayOrigin = registrationToEdit?.origin === "openpay";

  const [eventId, setEventId] = useState(
    () => registrationToEdit?.event_id || (events.length > 0 ? events[0].id : "")
  );
  const [fullName, setFullName] = useState(() => registrationToEdit?.full_name || "");
  const [email, setEmail] = useState(() => registrationToEdit?.email || "");
  const [phone, setPhone] = useState(() => registrationToEdit?.phone || "");
  const [docType, setDocType] = useState(() => registrationToEdit?.customer_document_type || "CC");
  const [docNumber, setDocNumber] = useState(() => registrationToEdit?.document_number || "");
  const [modality, setModality] = useState(() => registrationToEdit?.modality || "presencial");
  const [category, setCategory] = useState(() => registrationToEdit?.category || "");
  const [origin, setOrigin] = useState<RegistrationOrigin>(
    () => (registrationToEdit?.origin as RegistrationOrigin) || "invited"
  );
  const [status, setStatus] = useState<RegistrationStatus>(
    () => (registrationToEdit?.status as RegistrationStatus) || "confirmed"
  );
  const [paymentStatus, setPaymentStatus] = useState<RegistrationPaymentStatus>(
    () => (registrationToEdit?.payment_status as RegistrationPaymentStatus) || "not_required"
  );
  const [amount, setAmount] = useState<number>(
    () => (typeof registrationToEdit?.amount === "number" ? registrationToEdit.amount : 0)
  );

  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Apply business default rules when origin changes (only when creating or editing manual)
  const handleOriginChange = (newOrigin: RegistrationOrigin) => {
    setOrigin(newOrigin);

    if (
      newOrigin === "invited" ||
      newOrigin === "courtesy" ||
      newOrigin === "speaker" ||
      newOrigin === "sponsor"
    ) {
      setStatus("confirmed");
      setPaymentStatus("not_required");
      setAmount(0);

      if (!category) {
        if (newOrigin === "invited") setCategory("Invitado");
        if (newOrigin === "courtesy") setCategory("Cortesía");
        if (newOrigin === "speaker") setCategory("Ponente");
        if (newOrigin === "sponsor") setCategory("Patrocinador");
      }
    } else if (newOrigin === "admin_manual") {
      setStatus("confirmed");
      if (!category) setCategory("Registro Manual");
    }
  };

  const handlePaymentStatusChange = (newPaymentStatus: RegistrationPaymentStatus) => {
    setPaymentStatus(newPaymentStatus);
    if (newPaymentStatus === "not_required") {
      setAmount(0);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Basic Validations
    if (!eventId) {
      setErrorMessage("Debes seleccionar un evento.");
      return;
    }

    if (!fullName.trim()) {
      setErrorMessage("El nombre completo es obligatorio.");
      return;
    }

    const cleanEmailVal = cleanEmail(email);
    if (!cleanEmailVal || !cleanEmailVal.includes("@")) {
      setErrorMessage("Ingresa un correo electrónico válido.");
      return;
    }

    if (amount < 0 || Number.isNaN(amount)) {
      setErrorMessage("El monto debe ser igual o mayor a cero.");
      return;
    }

    setSaving(true);

    try {
      const supabase = createClient();

      // Check for duplicate registration
      const duplicate = await findPossibleDuplicateRegistration(
        supabase,
        eventId,
        docNumber,
        cleanEmailVal,
        registrationToEdit?.id
      );

      if (duplicate) {
        setErrorMessage(
          "Ya existe una inscripción para esta persona en el evento seleccionado."
        );
        setSaving(false);
        return;
      }

      if (isEditing && registrationToEdit) {
        // Perform update
        const updates: Partial<Registration> = {
          event_id: eventId,
          full_name: fullName.trim(),
          email: cleanEmailVal,
          phone: phone.trim() || null,
          customer_document_type: docType,
          document_number: docNumber.trim() || null,
          modality,
          category: category.trim() || null,
          status,
        };

        // Only allow updating financial fields if NOT openpay
        if (!isOpenpayOrigin) {
          updates.origin = origin;
          updates.payment_status = paymentStatus;
          updates.amount = paymentStatus === "not_required" ? 0 : amount;
          if (paymentStatus === "paid" && !registrationToEdit.paid_at) {
            updates.paid_at = new Date().toISOString();
          }
        }

        const { error } = await supabase
          .from("registrations")
          .update(updates)
          .eq("id", registrationToEdit.id);

        if (error) throw error;
      } else {
        // Create new manual registration
        const dto: CreateManualRegistrationDTO = {
          event_id: eventId,
          full_name: fullName.trim(),
          email: cleanEmailVal,
          phone: phone.trim() || null,
          customer_document_type: docType,
          document_number: docNumber.trim() || null,
          amount: paymentStatus === "not_required" ? 0 : amount,
          modality,
          category: category.trim() || (origin === "invited" ? "Invitado" : origin === "courtesy" ? "Cortesía" : origin === "speaker" ? "Ponente" : origin === "sponsor" ? "Patrocinador" : "Registro Manual"),
          origin: origin as "invited" | "courtesy" | "speaker" | "sponsor" | "admin_manual",
          status,
          payment_status: paymentStatus,
        };

        const payload = {
          event_id: dto.event_id,
          full_name: dto.full_name,
          email: dto.email,
          phone: dto.phone,
          customer_document_type: dto.customer_document_type,
          document_number: dto.document_number,
          amount: dto.amount,
          modality: dto.modality,
          category: dto.category,
          status: dto.status,
          payment_status: dto.payment_status,
          origin: dto.origin,
          payment_order_id: null,
          payment_reference: null,
          openpay_transaction_id: null,
          authorization_code: null,
          paid_at: dto.payment_status === "paid" ? new Date().toISOString() : null,
        };

        const { error } = await supabase.from("registrations").insert([payload]);
        if (error) throw error;
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      console.error("Error guardando inscripción:", err);
      const msg = err instanceof Error ? err.message : "Error al guardar inscripción";
      setErrorMessage(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 sm:p-8">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold font-heading text-slate-900 dark:text-white">
            {isEditing
              ? isOpenpayOrigin
                ? "Editar Inscripción (Openpay Protegido)"
                : "Editar Inscripción Manual"
              : "Nuevo Inscrito Manual"}
          </DialogTitle>
        </DialogHeader>

        {errorMessage && (
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-start gap-3 my-2">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
            <span className="leading-relaxed font-medium">{errorMessage}</span>
          </div>
        )}

        {isOpenpayOrigin && (
          <div className="p-3.5 rounded-2xl bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 text-xs my-1">
            <span className="font-bold block mb-0.5">Registro procesado por Openpay:</span>
            Los datos financieros (Monto, Estado de pago, Origen) están protegidos y no pueden ser alterados manualmente.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Event selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              Evento *
            </Label>
            {events.length === 0 ? (
              <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs font-medium">
                No hay eventos registrados disponibles. Registra un evento antes de crear inscripciones.
              </div>
            ) : (
              <select
                className="w-full h-11 px-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                required
              >
                <option value="" disabled>
                  Seleccionar evento...
                </option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Full Name & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Nombre Completo *
              </Label>
              <Input
                placeholder="Nombre del participante"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="h-11 rounded-2xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Correo Electrónico *
              </Label>
              <Input
                type="email"
                placeholder="correo@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11 rounded-2xl"
              />
            </div>
          </div>

          {/* Document Type & Number */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Tipo Documento
              </Label>
              <select
                className="w-full h-11 px-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
              >
                <option value="CC">Cédula (CC)</option>
                <option value="CE">Cédula Extranjería (CE)</option>
                <option value="PASAPORTE">Pasaporte</option>
                <option value="NIT">NIT</option>
                <option value="OTRO">Otro</option>
              </select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Número Documento
              </Label>
              <Input
                placeholder="Ej. 123456789"
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                className="h-11 rounded-2xl"
              />
            </div>
          </div>

          {/* Phone & Modality */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Teléfono
              </Label>
              <Input
                placeholder="+57 300 000 0000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-11 rounded-2xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Modalidad *
              </Label>
              <select
                className="w-full h-11 px-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={modality}
                onChange={(e) => setModality(e.target.value)}
              >
                <option value="presencial">Presencial</option>
                <option value="virtual">Virtual</option>
              </select>
            </div>
          </div>

          {/* Origin & Category */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Origen del Registro *
              </Label>
              <select
                className="w-full h-11 px-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
                value={origin}
                disabled={isOpenpayOrigin}
                onChange={(e) => handleOriginChange(e.target.value as RegistrationOrigin)}
              >
                {isOpenpayOrigin ? (
                  <option value="openpay">Openpay (Automático)</option>
                ) : (
                  <>
                    <option value="invited">Invitado</option>
                    <option value="courtesy">Cortesía</option>
                    <option value="speaker">Ponente</option>
                    <option value="sponsor">Patrocinador</option>
                    <option value="admin_manual">Registro Administrativo</option>
                  </>
                )}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Categoría
              </Label>
              <Input
                placeholder="Ej. VIP, Medico, Estudiante"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-11 rounded-2xl"
              />
            </div>
          </div>

          {/* Registration Status & Payment Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Estado Inscripción *
              </Label>
              <select
                className="w-full h-11 px-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                value={status}
                onChange={(e) => setStatus(e.target.value as RegistrationStatus)}
              >
                <option value="confirmed">Confirmado</option>
                <option value="pending">Pendiente</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Estado de Pago *
              </Label>
              <select
                className="w-full h-11 px-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-60"
                value={paymentStatus}
                disabled={isOpenpayOrigin}
                onChange={(e) => handlePaymentStatusChange(e.target.value as RegistrationPaymentStatus)}
              >
                <option value="not_required">No requiere pago</option>
                <option value="paid">Pagado</option>
                <option value="pending">Pendiente</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Monto (COP)
              </Label>
              <Input
                type="number"
                min={0}
                placeholder="0"
                value={amount}
                disabled={isOpenpayOrigin || paymentStatus === "not_required"}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="h-11 rounded-2xl disabled:opacity-60"
              />
            </div>
          </div>

          <DialogFooter className="pt-4 flex gap-3 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={saving}
              className="h-11 px-5 rounded-2xl"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="h-11 px-6 rounded-2xl bg-[#006666] hover:bg-[#004d4d] text-white font-bold gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isEditing ? "Guardar Cambios" : "Crear Inscrito"}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
