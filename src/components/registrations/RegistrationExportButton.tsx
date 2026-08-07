"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import { Registration } from "@/lib/registrations/types";
import {
  formatRegistrationCheckInMethodLabel,
  formatRegistrationOriginLabel,
  formatRegistrationPaymentStatusLabel,
  formatRegistrationStatusLabel,
  maskDocument,
  slugifyEventTitle,
} from "@/lib/registrations/registration-utils";

interface RegistrationExportButtonProps {
  registrations: Registration[];
  selectedEventTitle?: string;
}

export function RegistrationExportButton({
  registrations,
  selectedEventTitle,
}: RegistrationExportButtonProps) {
  const handleExport = () => {
    if (!registrations || registrations.length === 0) {
      alert("No hay registros para exportar con los filtros actuales.");
      return;
    }

    const dataToExport = registrations.map((r) => ({
      Evento: r.events?.title || "Evento General",
      Nombre: r.full_name,
      Email: r.email,
      Telefono: r.phone || "—",
      TipoDocumento: r.customer_document_type || "CC",
      Documento: maskDocument(r.customer_document_type, r.document_number),
      Modalidad: r.modality || "presencial",
      Categoria: r.category || "—",
      Origen: formatRegistrationOriginLabel(r.origin),
      EstadoInscripcion: formatRegistrationStatusLabel(r.status),
      EstadoPago: formatRegistrationPaymentStatusLabel(r.payment_status),
      Monto: r.amount || 0,
      Referencia: r.payment_reference || r.payment_id || "—",
      CheckIn: r.checked_in_at ? "Sí" : "No",
      FechaCheckIn: r.checked_in_at
        ? new Date(r.checked_in_at).toLocaleString("es-CO")
        : "—",
      MetodoCheckIn: formatRegistrationCheckInMethodLabel(r.check_in_method),
      FechaInscripcion: r.created_at
        ? new Date(r.created_at).toLocaleString("es-CO")
        : "—",
      FechaPago: r.paid_at
        ? new Date(r.paid_at).toLocaleString("es-CO")
        : "—",
    }));

    const dateStr = new Date().toISOString().split("T")[0];
    const eventSlug = slugifyEventTitle(selectedEventTitle);
    const fileName = `inscritos-${eventSlug}-${dateStr}.xlsx`;

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inscritos");
    XLSX.writeFile(workbook, fileName);
  };

  return (
    <Button
      onClick={handleExport}
      variant="outline"
      className="h-12 px-5 rounded-2xl border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 gap-2 font-bold shadow-sm"
    >
      <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
      <span>Exportar Excel</span>
    </Button>
  );
}
