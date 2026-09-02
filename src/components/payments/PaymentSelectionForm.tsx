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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BreBPaymentInstructions } from "./BreBPaymentInstructions";
import { cn } from "@/lib/utils";
import {
  normalizePricingTiersToV2,
  formatCOP,
  MODALITY_SENTINEL,
  EventPricingTierV2,
} from "@/lib/payments/event-pricing";

export interface EventPricingTierOption {
  name: string;
  price?: number;
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
  const [paymentMethod, setPaymentMethod] = useState<"openpay" | "breb">("openpay");

  const normalizedTiers = normalizePricingTiersToV2({ tiers: eventTiers });
  const hasTiers = normalizedTiers.length > 0;
  const [selectedCategoryIndex, setSelectedCategoryIndex] = useState(0);

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

  const [brebData, setBrebData] = useState<{
    reference: string;
    amount: number;
    eventTitle: string;
    brebQrUrl: string;
  } | null>(null);

  const currentTier = hasTiers ? normalizedTiers[selectedCategoryIndex] : null;
  const effectivePrice = currentTier ? currentTier.price : eventPrice;

  const handleCategorySelect = (index: number) => {
    setSelectedCategoryIndex(index);
    if (errorMessage) setErrorMessage(null);
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
            modality: MODALITY_SENTINEL,
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
            modality: MODALITY_SENTINEL,
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

  const formattedPrice = formatCOP(effectivePrice);

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
        {/* SECCIÓN 1: Selección de Tipo de Inscripción */}
        {hasTiers && (
          <div className="space-y-4 pb-6 border-b border-slate-100">
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
              1. Seleccione su Tipo de Inscripción
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {normalizedTiers.map((cat, idx) => (
                <button
                  key={cat.name || idx}
                  type="button"
                  onClick={() => handleCategorySelect(idx)}
                  className={cn(
                    "p-4 rounded-2xl border-2 transition-all font-bold text-sm flex items-center justify-between gap-3 cursor-pointer",
                    selectedCategoryIndex === idx
                      ? "border-primary bg-primary/5 text-primary shadow-sm"
                      : "border-slate-200 hover:border-slate-300 text-slate-700 bg-white"
                  )}
                >
                  <span className="truncate">{cat.name}</span>
                  <span className="font-extrabold shrink-0 text-primary">
                    {formatCOP(cat.price)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* SECCIÓN 2: Datos Personales del Asistente */}
        <div className="space-y-6">
          <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            {hasTiers ? "2. Datos del Asistente" : "1. Datos del Asistente"}
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="customerName" className="text-xs font-bold text-slate-600">
                Nombres *
              </Label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="customerName"
                  name="customerName"
                  required
                  value={formData.customerName}
                  onChange={handleChange}
                  placeholder="Ej: María Camila"
                  className="pl-10 h-12 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerLastName" className="text-xs font-bold text-slate-600">
                Apellidos *
              </Label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="customerLastName"
                  name="customerLastName"
                  required
                  value={formData.customerLastName}
                  onChange={handleChange}
                  placeholder="Ej: Rodríguez Gómez"
                  className="pl-10 h-12 rounded-xl"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="customerEmail" className="text-xs font-bold text-slate-600">
                Correo Electrónico *
              </Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="customerEmail"
                  name="customerEmail"
                  type="email"
                  required
                  value={formData.customerEmail}
                  onChange={handleChange}
                  placeholder="ejemplo@correo.com"
                  className="pl-10 h-12 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerPhone" className="text-xs font-bold text-slate-600">
                Teléfono Celular
              </Label>
              <div className="relative">
                <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="customerPhone"
                  name="customerPhone"
                  type="tel"
                  value={formData.customerPhone}
                  onChange={handleChange}
                  placeholder="300 123 4567"
                  className="pl-10 h-12 rounded-xl"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="customerDocumentType" className="text-xs font-bold text-slate-600">
                Tipo de Documento *
              </Label>
              <div className="relative">
                <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                <select
                  id="customerDocumentType"
                  name="customerDocumentType"
                  value={formData.customerDocumentType}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 h-12 rounded-xl border border-slate-200 bg-white text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                >
                  {DOCUMENT_TYPES.map((dt) => (
                    <option key={dt.value} value={dt.value}>
                      {dt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerDocumentNumber" className="text-xs font-bold text-slate-600">
                Número de Documento *
              </Label>
              <div className="relative">
                <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  id="customerDocumentNumber"
                  name="customerDocumentNumber"
                  required
                  value={formData.customerDocumentNumber}
                  onChange={handleChange}
                  placeholder="Sin puntos ni guiones"
                  className="pl-10 h-12 rounded-xl"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECCIÓN 3: Selección de Método de Pago */}
        <div className="space-y-4 pt-6 border-t border-slate-100">
          <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            {hasTiers ? "3. Método de Pago" : "2. Método de Pago"}
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Opción 1: Openpay */}
            <button
              type="button"
              onClick={() => setPaymentMethod("openpay")}
              className={cn(
                "p-5 rounded-2xl border-2 transition-all flex flex-col justify-between text-left space-y-3 cursor-pointer",
                paymentMethod === "openpay"
                  ? "border-primary bg-primary/5 text-slate-900 shadow-md"
                  : "border-slate-200 hover:border-slate-300 text-slate-600 bg-white"
              )}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2.5">
                  <CreditCard className="w-5 h-5 text-primary" />
                  <span className="font-bold text-sm">Tarjetas y PSE</span>
                </div>
                {paymentMethod === "openpay" && (
                  <CheckCircle2 className="w-5 h-5 text-primary fill-primary/20" />
                )}
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Tarjeta de Crédito, Débito PSE y más mediante Openpay.
              </p>
            </button>

            {/* Opción 2: Bre-B QR */}
            <button
              type="button"
              onClick={() => setPaymentMethod("breb")}
              className={cn(
                "p-5 rounded-2xl border-2 transition-all flex flex-col justify-between text-left space-y-3 cursor-pointer",
                paymentMethod === "breb"
                  ? "border-primary bg-primary/5 text-slate-900 shadow-md"
                  : "border-slate-200 hover:border-slate-300 text-slate-600 bg-white"
              )}
            >
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2.5">
                  <Building2 className="w-5 h-5 text-primary" />
                  <span className="font-bold text-sm">Transferencia QR Bre-B</span>
                </div>
                {paymentMethod === "breb" && (
                  <CheckCircle2 className="w-5 h-5 text-primary fill-primary/20" />
                )}
              </div>
              <p className="text-xs text-slate-500 leading-relaxed">
                Transferencia inmediata escaneando Código QR de Bre-B.
              </p>
            </button>
          </div>
        </div>

        {/* Botón de Envío */}
        <Button
          type="submit"
          disabled={loading}
          className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-lg shadow-xl shadow-primary/20 transition-transform active:scale-[0.99] gap-2"
        >
          {loading ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : (
            <>
              <Lock className="w-5 h-5" />
              {paymentMethod === "openpay"
                ? `Pagar ${formattedPrice} con Openpay`
                : `Generar QR Bre-B por ${formattedPrice}`}
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
