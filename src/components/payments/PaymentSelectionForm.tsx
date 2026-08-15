"use client";

import React, { useState } from "react";
import {
  CreditCard,
  Building2,
  User,
  Mail,
  Smartphone,
  FileText,
  Lock,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BreBPaymentInstructions } from "./BreBPaymentInstructions";
import { cn } from "@/lib/utils";

export interface EventPricingTierOption {
  name: string;
  presencial?: number | null;
  virtual?: number | null;
}

interface PaymentSelectionFormProps {
  eventId: string;
  eventTitle: string;
  eventPrice: number;
  eventDate?: string;
  eventLocation?: string;
  className?: string;
  eventTiers?: EventPricingTierOption[];
}

const DOCUMENT_TYPES = [
  { value: "CC", label: "Cédula de Ciudadanía (CC)" },
  { value: "CE", label: "Cédula de Extranjería (CE)" },
  { value: "PAS", label: "Pasaporte (PAS)" },
  { value: "NIT", label: "Número de Identificación Tributaria (NIT)" },
  { value: "TI", label: "Tarjeta de Identidad (TI)" },
  { value: "PEP", label: "Permiso Especial de Permanencia (PEP)" },
  { value: "PPT", label: "Permiso por Protección Temporal (PPT)" },
  { value: "OTHER", label: "Otro Documento" },
];

export function PaymentSelectionForm({
  eventId,
  eventTitle,
  eventPrice,
  eventDate,
  eventLocation,
  className = "",
  eventTiers,
}: PaymentSelectionFormProps) {
  // Método de Pago Seleccionado: 'openpay' | 'breb'
  const [paymentMethod, setPaymentMethod] = useState<"openpay" | "breb">(
    "openpay"
  );

  // Selección de Categoría y Modalidad
  const hasTiers = Array.isArray(eventTiers) && eventTiers.length > 0;
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState(0);
  const [modality, setModality] = useState<"presencial" | "virtual">("presencial");

  // Form State
  const [formData, setFormData] = useState({
    customerName: "",
    customerLastName: "",
    customerEmail: "",
    customerPhone: "",
    customerDocumentType: "CC",
    customerDocumentNumber: "",
  });

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Bre-B State después de crear la orden
  const [brebData, setBrebData] = useState<{
    reference: string;
    amount: number;
    eventTitle: string;
    brebQrUrl: string;
  } | null>(null);

  // Cálculo informativo del precio para la interfaz
  const currentTier = hasTiers ? eventTiers[selectedCategoryIndex] : null;

  const isPresencialAvailable = hasTiers
    ? currentTier?.presencial !== undefined &&
      currentTier?.presencial !== null &&
      currentTier.presencial >= 0
    : true;

  const isVirtualAvailable = hasTiers
    ? currentTier?.virtual !== undefined &&
      currentTier?.virtual !== null &&
      currentTier.virtual >= 0
    : true;

  const effectivePrice = (() => {
    if (hasTiers && currentTier) {
      if (modality === "presencial" && isPresencialAvailable) {
        return Number(currentTier.presencial);
      }
      if (modality === "virtual" && isVirtualAvailable) {
        return Number(currentTier.virtual);
      }
    }
    return eventPrice;
  })();

  const handleCategorySelect = (index: number) => {
    setSelectedCategoryIndex(index);
    if (errorMessage) setErrorMessage(null);
    const targetTier = eventTiers ? eventTiers[index] : null;
    if (targetTier) {
      const presOk = targetTier.presencial !== undefined && targetTier.presencial !== null && targetTier.presencial >= 0;
      const virtOk = targetTier.virtual !== undefined && targetTier.virtual !== null && targetTier.virtual >= 0;

      if (modality === "presencial" && !presOk && virtOk) {
        setModality("virtual");
      } else if (modality === "virtual" && !virtOk && presOk) {
        setModality("presencial");
      }
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errorMessage) setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    const categoryName = hasTiers && currentTier ? currentTier.name : "General";

    try {
      if (paymentMethod === "openpay") {
        const response = await fetch("/api/payments/openpay/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: eventId,
            productType: "event",
            customerName: formData.customerName,
            customerLastName: formData.customerLastName,
            customerEmail: formData.customerEmail,
            customerPhone: formData.customerPhone || undefined,
            customerDocumentType: formData.customerDocumentType,
            customerDocumentNumber: formData.customerDocumentNumber,
            category: categoryName,
            modality,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.error || "Ocurrió un error al procesar el pago con Openpay."
          );
        }

        if (data.paymentUrl) {
          window.location.href = data.paymentUrl;
        } else {
          throw new Error("No se recibió el enlace de pago de Openpay.");
        }
      } else {
        const response = await fetch("/api/payments/breb/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            productId: eventId,
            productType: "event",
            customerName: formData.customerName,
            customerLastName: formData.customerLastName,
            customerEmail: formData.customerEmail,
            customerPhone: formData.customerPhone || undefined,
            customerDocumentType: formData.customerDocumentType,
            customerDocumentNumber: formData.customerDocumentNumber,
            category: categoryName,
            modality,
          }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.error || "Ocurrió un error al generar la orden Bre-B."
          );
        }

        setBrebData({
          reference: data.reference,
          amount: data.amount,
          eventTitle: data.eventTitle,
          brebQrUrl: data.brebQrUrl,
        });
      }
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Error al conectar con la pasarela de pagos."
      );
    } finally {
      setLoading(false);
    }
  };

  if (brebData) {
    return (
      <BreBPaymentInstructions
        reference={brebData.reference}
        amount={brebData.amount}
        eventTitle={brebData.eventTitle}
        brebQrUrl={brebData.brebQrUrl}
      />
    );
  }

  const formattedPrice = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(effectivePrice);

  return (
    <div
      className={`bg-white rounded-[2.5rem] p-6 md:p-10 border border-slate-100 shadow-xl space-y-8 ${className}`}
    >
      {/* Header Info */}
      <div className="space-y-3 pb-6 border-b border-slate-100">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 text-slate-800 text-xs font-bold rounded-full uppercase tracking-wider">
          <Lock className="w-3.5 h-3.5 text-slate-500" />
          Proceso de Pago e Inscripción
        </div>
        <h3 className="text-2xl md:text-3xl font-bold text-slate-900 font-heading">
          Registro para: {eventTitle}
        </h3>
        <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
          {eventDate && (
            <span className="text-sm text-slate-500 font-medium">
              Fecha: {eventDate}
            </span>
          )}
          {eventLocation && (
            <span className="text-sm text-slate-500 font-medium">
              Lugar: {eventLocation}
            </span>
          )}
          <div className="text-right">
            <span className="text-xs text-slate-400 font-bold uppercase tracking-widest block">
              Total a Pagar
            </span>
            <span className="text-2xl font-bold text-slate-900 font-heading">
              {formattedPrice}
            </span>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-100 flex items-start gap-3 text-red-600 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{errorMessage}</div>
        </div>
      )}

      {/* Formulario de Selección y Datos del Asistente */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* SECCIÓN 1: Selección de Categoría y Modalidad */}
        <div className="space-y-4 pb-6 border-b border-slate-100">
          <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            1. Categoría y Modalidad de Asistencia
          </h4>

          {/* Categorías Dinámicas del Evento */}
          {hasTiers && (
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Categoría de Participante *
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {eventTiers.map((cat, idx) => (
                  <button
                    key={cat.name || idx}
                    type="button"
                    onClick={() => handleCategorySelect(idx)}
                    className={cn(
                      "p-3.5 rounded-2xl border-2 transition-all font-bold text-xs text-center flex flex-col justify-center items-center gap-1 cursor-pointer",
                      selectedCategoryIndex === idx
                        ? "border-primary bg-primary/5 text-primary shadow-sm"
                        : "border-slate-200 hover:border-slate-300 text-slate-600 bg-white"
                    )}
                  >
                    <span>{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Selector de Modalidad (Presencial / Virtual) */}
          <div className="space-y-2 pt-2">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Modalidad de Asistencia *
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                disabled={!isPresencialAvailable}
                onClick={() => setModality("presencial")}
                className={cn(
                  "flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all font-bold text-sm cursor-pointer",
                  modality === "presencial" && isPresencialAvailable
                    ? "border-primary bg-primary/5 text-primary shadow-sm"
                    : isPresencialAvailable
                    ? "border-slate-200 hover:border-slate-300 text-slate-700 bg-white"
                    : "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed opacity-60"
                )}
              >
                <Building2 className="w-5 h-5" />
                <span>Presencial</span>
              </button>

              <button
                type="button"
                disabled={!isVirtualAvailable}
                onClick={() => setModality("virtual")}
                className={cn(
                  "flex items-center justify-center gap-3 p-4 rounded-2xl border-2 transition-all font-bold text-sm cursor-pointer",
                  modality === "virtual" && isVirtualAvailable
                    ? "border-primary bg-primary/5 text-primary shadow-sm"
                    : isVirtualAvailable
                    ? "border-slate-200 hover:border-slate-300 text-slate-700 bg-white"
                    : "border-slate-100 bg-slate-50 text-slate-300 cursor-not-allowed opacity-60"
                )}
              >
                <Video className="w-5 h-5" />
                <span>Virtual</span>
              </button>
            </div>
          </div>
        </div>

        {/* SECCIÓN 2: Datos Personales del Participante */}
        <div className="space-y-6">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              2. Datos del Participante
            </h4>
            <p className="text-xs text-slate-500">
              Ingresa la información personal requerida para la inscripción.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nombre */}
            <div className="space-y-2">
              <Label htmlFor="customerName" className="text-slate-700 font-bold">
                Nombres *
              </Label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  id="customerName"
                  name="customerName"
                  type="text"
                  required
                  value={formData.customerName}
                  onChange={handleChange}
                  placeholder="Ej. María"
                  className="h-12 pl-12 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white"
                />
              </div>
            </div>

            {/* Apellido */}
            <div className="space-y-2">
              <Label htmlFor="customerLastName" className="text-slate-700 font-bold">
                Apellidos *
              </Label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  id="customerLastName"
                  name="customerLastName"
                  type="text"
                  required
                  value={formData.customerLastName}
                  onChange={handleChange}
                  placeholder="Ej. Rodríguez"
                  className="h-12 pl-12 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Correo Electrónico */}
            <div className="space-y-2">
              <Label htmlFor="customerEmail" className="text-slate-700 font-bold">
                Correo Electrónico *
              </Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  id="customerEmail"
                  name="customerEmail"
                  type="email"
                  required
                  value={formData.customerEmail}
                  onChange={handleChange}
                  placeholder="ejemplo@correo.com"
                  className="h-12 pl-12 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white"
                />
              </div>
            </div>

            {/* Teléfono */}
            <div className="space-y-2">
              <Label htmlFor="customerPhone" className="text-slate-700 font-bold">
                Teléfono / Celular
              </Label>
              <div className="relative">
                <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  id="customerPhone"
                  name="customerPhone"
                  type="tel"
                  value={formData.customerPhone}
                  onChange={handleChange}
                  placeholder="300 123 4567"
                  className="h-12 pl-12 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tipo de Documento */}
            <div className="space-y-2">
              <Label
                htmlFor="customerDocumentType"
                className="text-slate-700 font-bold"
              >
                Tipo de Documento *
              </Label>
              <div className="relative">
                <FileText className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                <select
                  id="customerDocumentType"
                  name="customerDocumentType"
                  required
                  value={formData.customerDocumentType}
                  onChange={handleChange}
                  className="w-full h-12 pl-12 pr-4 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none cursor-pointer"
                >
                  {DOCUMENT_TYPES.map((doc) => (
                    <option key={doc.value} value={doc.value}>
                      {doc.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Número de Documento */}
            <div className="space-y-2">
              <Label
                htmlFor="customerDocumentNumber"
                className="text-slate-700 font-bold"
              >
                Número de Identificación *
              </Label>
              <div className="relative">
                <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  id="customerDocumentNumber"
                  name="customerDocumentNumber"
                  type="text"
                  required
                  value={formData.customerDocumentNumber}
                  onChange={handleChange}
                  placeholder="1234567890"
                  className="h-12 pl-12 rounded-xl border-slate-200 bg-slate-50/50 focus:bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECCIÓN 3: Selección de Método de Pago */}
        <div className="pt-4 space-y-3 border-t border-slate-100">
          <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            3. Método de Pago
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Opción Openpay */}
            <div
              onClick={() => setPaymentMethod("openpay")}
              className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                paymentMethod === "openpay"
                  ? "border-primary bg-primary/5 shadow-md"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  <span className="font-bold text-slate-900 text-sm">
                    Openpay (En línea)
                  </span>
                </div>
                {paymentMethod === "openpay" && (
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                )}
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Pago en línea con Tarjeta de Crédito, Débito o PSE. Confirmación automática e inmediata.
              </p>
            </div>

            {/* Opción Bre-B */}
            <div
              onClick={() => setPaymentMethod("breb")}
              className={`p-5 rounded-2xl border-2 cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                paymentMethod === "breb"
                  ? "border-blue-600 bg-blue-50/60 shadow-md"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  <span className="font-bold text-slate-900 text-sm">
                    Bre-B (Banco de Bogotá)
                  </span>
                </div>
                {paymentMethod === "breb" && (
                  <CheckCircle2 className="w-5 h-5 text-blue-600" />
                )}
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Transferencia bancaria escaneando el QR Oficial de Banco de Bogotá. Sujeto a verificación.
              </p>
            </div>
          </div>
        </div>

        {/* Botón de Acción */}
        <div className="pt-4">
          <Button
            type="submit"
            disabled={loading}
            className={`w-full h-14 font-extrabold text-lg rounded-2xl shadow-lg transition-all flex items-center justify-center gap-3 ${
              paymentMethod === "breb"
                ? "bg-blue-700 hover:bg-blue-800 text-white shadow-blue-900/10"
                : "bg-primary hover:bg-primary/90 text-white shadow-primary/20"
            }`}
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Procesando solicitud de pago...
              </>
            ) : paymentMethod === "breb" ? (
              <>
                Generar Instrucciones Bre-B ({formattedPrice})
                <Building2 className="w-5 h-5" />
              </>
            ) : (
              <>
                Proceder al Pago en Openpay ({formattedPrice})
                <CreditCard className="w-5 h-5" />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
