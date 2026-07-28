"use client";

import React, { useState } from "react";
import { 
  CreditCard, 
  User, 
  Mail, 
  Smartphone, 
  FileText, 
  Lock, 
  Loader2, 
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface OpenpayRegistrationFormProps {
  eventId: string;
  eventTitle: string;
  eventPrice: number;
  eventDate?: string;
  eventLocation?: string;
  className?: string;
  onSuccess?: (response: { reference: string; paymentUrl: string }) => void;
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

export function OpenpayRegistrationForm({
  eventId,
  eventTitle,
  eventPrice,
  eventDate,
  eventLocation,
  className = "",
  onSuccess
}: OpenpayRegistrationFormProps) {
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

    try {
      const response = await fetch("/api/payments/openpay/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: eventId,
          productType: "event",
          customerName: formData.customerName,
          customerLastName: formData.customerLastName,
          customerEmail: formData.customerEmail,
          customerPhone: formData.customerPhone || undefined,
          customerDocumentType: formData.customerDocumentType,
          customerDocumentNumber: formData.customerDocumentNumber,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "Ocurrió un error al procesar la solicitud de pago.");
      }

      if (onSuccess) {
        onSuccess(data);
      }

      if (data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        throw new Error("No se recibió el enlace de pago de Openpay.");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Error al conectar con la pasarela de pagos.");
      setLoading(false);
    }
  };

  return (
    <div className={`bg-white rounded-[2.5rem] p-8 md:p-12 border border-slate-100 shadow-xl space-y-8 ${className}`}>
      {/* Header Info */}
      <div className="space-y-3 pb-6 border-b border-slate-100">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full uppercase tracking-wider">
          <CreditCard className="w-3.5 h-3.5" />
          Pago seguro con Openpay
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
            <span className="text-xs text-slate-400 font-bold uppercase tracking-widest block">Total</span>
            <span className="text-2xl font-bold text-slate-900 font-heading">
              ${new Intl.NumberFormat("es-CO").format(eventPrice)} COP
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

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
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
                placeholder="Ej. Rodriguez"
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
            <Label htmlFor="customerDocumentType" className="text-slate-700 font-bold">
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
            <Label htmlFor="customerDocumentNumber" className="text-slate-700 font-bold">
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

        {/* Submit Button */}
        <div className="pt-4">
          <Button
            type="submit"
            disabled={loading}
            className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-bold text-lg rounded-2xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Procesando solicitud de pago...
              </>
            ) : (
              <>
                Proceder al Pago en Openpay
                <CreditCard className="w-5 h-5" />
              </>
            )}
          </Button>
        </div>

        {/* Trust Badges */}
        <div className="flex items-center justify-center gap-2 text-xs text-slate-400 pt-2">
          <Lock className="w-3.5 h-3.5" />
          <span>Transacción cifrada y protegida por Openpay Colombia.</span>
        </div>
      </form>
    </div>
  );
}

export default OpenpayRegistrationForm;
