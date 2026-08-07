"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Loader2,
  Trash2,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  UserPlus,
  Edit2,
  Ban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import * as XLSX from "xlsx";

import {
  Registration,
  RegistrationEventItem,
  RegistrationFilterState,
} from "@/lib/registrations/types";
import {
  formatCopCurrency,
  formatRegistrationOriginLabel,
  formatRegistrationPaymentStatusLabel,
  formatRegistrationStatusLabel,
  maskDocument,
} from "@/lib/registrations/registration-utils";
import {
  cancelRegistration,
  deleteRegistrationRecord,
  listEventsForAdminRegistration,
  listRegistrationsAdmin,
} from "@/lib/registrations/registration-repository";

import { RegistrationOriginBadge } from "@/components/registrations/RegistrationOriginBadge";
import { RegistrationFilters } from "@/components/registrations/RegistrationFilters";
import { RegistrationDialog } from "@/components/registrations/RegistrationDialog";

const DEFAULT_FILTERS: RegistrationFilterState = {
  eventId: "all",
  status: "all",
  paymentStatus: "all",
  origin: "all",
  modality: "all",
  searchQuery: "",
};

export default function RegistrationsAdmin() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [events, setEvents] = useState<RegistrationEventItem[]>([]);
  const [filters, setFilters] = useState<RegistrationFilterState>(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRegistration, setEditingRegistration] = useState<Registration | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [regsData, eventsData] = await Promise.all([
        listRegistrationsAdmin(supabase, filters),
        listEventsForAdminRegistration(supabase),
      ]);
      setRegistrations(regsData);
      setEvents(eventsData);
    } catch (error: unknown) {
      console.error("Error al cargar inscritos:", error instanceof Error ? error.message : error);
    } finally {
      setLoading(false);
    }
  }, [supabase, filters]);

  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        setLoading(true);
        const [regsData, eventsData] = await Promise.all([
          listRegistrationsAdmin(supabase, filters),
          listEventsForAdminRegistration(supabase),
        ]);
        if (isMounted) {
          setRegistrations(regsData);
          setEvents(eventsData);
        }
      } catch (error: unknown) {
        console.error("Error al inicializar inscritos:", error);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void init();

    return () => {
      isMounted = false;
    };
  }, [supabase, filters]);

  const handleOpenCreateDialog = () => {
    setEditingRegistration(null);
    setDialogOpen(true);
  };

  const handleOpenEditDialog = (reg: Registration) => {
    setEditingRegistration(reg);
    setDialogOpen(true);
  };

  const handleCancelRegistration = async (reg: Registration) => {
    if (reg.status === "cancelled") return;
    if (!confirm(`¿Deseas cancelar la inscripción de "${reg.full_name}"?`)) return;

    try {
      await cancelRegistration(supabase, reg.id);
      void loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al cancelar inscripción";
      alert("Error: " + message);
    }
  };

  const handleDeleteRegistration = async (reg: Registration) => {
    if (!confirm(`¿Eliminar permanentemente la inscripción de "${reg.full_name}"?`)) return;

    try {
      await deleteRegistrationRecord(supabase, reg.id);
      void loadData();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al eliminar la inscripción";
      alert("Error: " + message);
    }
  };

  const exportToExcel = () => {
    const dataToExport = registrations.map((r) => ({
      Participante: r.full_name,
      Email: r.email,
      Documento: maskDocument(r.customer_document_type, r.document_number),
      Telefono: r.phone || "-",
      Evento: r.events?.title || "Evento General",
      Monto: r.amount || 0,
      Modalidad: r.modality || "presencial",
      Categoria: r.category || "-",
      EstadoInscripcion: formatRegistrationStatusLabel(r.status),
      EstadoPago: formatRegistrationPaymentStatusLabel(r.payment_status),
      Referencia: r.payment_reference || r.payment_id || "-",
      Origen: formatRegistrationOriginLabel(r.origin),
      Fecha: new Date(r.paid_at || r.created_at).toLocaleString(),
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inscritos");
    XLSX.writeFile(workbook, "Inscritos_Eventos_SOVOGIN.xlsx");
  };

  return (
    <div className="space-y-8">
      {/* Top Bar Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white font-heading">
            Gestión de Inscritos
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Administra inscripciones automáticas (Openpay) y registros manuales (Invitados, Cortesías, Ponentes, Patrocinadores).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={exportToExcel}
            variant="outline"
            className="h-12 px-5 rounded-2xl border-slate-200 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 gap-2 font-bold shadow-sm"
          >
            <FileText className="w-4 h-4" />
            Exportar Excel
          </Button>

          <Button
            onClick={handleOpenCreateDialog}
            className="h-12 px-6 rounded-2xl bg-[#006666] hover:bg-[#004d4d] text-white font-bold gap-2 shadow-lg shadow-emerald-900/10"
          >
            <UserPlus className="w-5 h-5" />
            <span>Nuevo Inscrito</span>
          </Button>
        </div>
      </div>

      {/* Advanced Filters */}
      <RegistrationFilters
        filters={filters}
        events={events}
        onChange={setFilters}
        onReset={() => setFilters(DEFAULT_FILTERS)}
      />

      {/* Registrations Table */}
      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-[#006666]" />
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/50 dark:bg-slate-800/40">
              <TableRow className="border-slate-100 dark:border-slate-800 h-16">
                <TableHead className="pl-8 text-slate-900 dark:text-white font-bold">
                  Participante
                </TableHead>
                <TableHead className="text-slate-900 dark:text-white font-bold">
                  Evento
                </TableHead>
                <TableHead className="text-slate-900 dark:text-white font-bold">
                  Origen / Modalidad
                </TableHead>
                <TableHead className="text-slate-900 dark:text-white font-bold">
                  Monto / Referencia
                </TableHead>
                <TableHead className="text-slate-900 dark:text-white font-bold">
                  Estado
                </TableHead>
                <TableHead className="text-right pr-8 text-slate-900 dark:text-white font-bold">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {registrations.length > 0 ? (
                registrations.map((r) => (
                  <TableRow
                    key={r.id}
                    className="border-slate-50 dark:border-slate-800/60 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors h-20"
                  >
                    <TableCell className="pl-8">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">
                          {r.full_name}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          {r.email}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Doc: {maskDocument(r.customer_document_type, r.document_number)}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <span className="font-medium text-slate-700 dark:text-slate-300 text-xs">
                        {r.events?.title || "Evento General"}
                      </span>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col gap-1.5 items-start">
                        <RegistrationOriginBadge origin={r.origin} />
                        <span className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md capitalize font-medium">
                          {r.modality || "presencial"}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 dark:text-white text-xs">
                          {formatCopCurrency(r.amount)}
                        </span>
                        {r.payment_reference && (
                          <span className="text-[10px] font-mono text-slate-400">
                            Ref: {r.payment_reference}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-500 font-medium">
                          Pago: {formatRegistrationPaymentStatusLabel(r.payment_status)}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
                        {r.status === "confirmed" ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        ) : r.status === "pending" ? (
                          <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                        )}
                        <span
                          className={`text-[10px] font-bold uppercase ${
                            r.status === "confirmed"
                              ? "text-emerald-700 dark:text-emerald-400"
                              : r.status === "pending"
                              ? "text-amber-700 dark:text-amber-400"
                              : "text-red-700 dark:text-red-400"
                          }`}
                        >
                          {formatRegistrationStatusLabel(r.status)}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell className="text-right pr-8">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Editar inscripción"
                          onClick={() => handleOpenEditDialog(r)}
                          className="h-9 w-9 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>

                        {r.status !== "cancelled" && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Cancelar inscripción"
                            onClick={() => handleCancelRegistration(r)}
                            className="h-9 w-9 rounded-xl text-slate-400 hover:text-amber-600"
                          >
                            <Ban className="w-4 h-4" />
                          </Button>
                        )}

                        <Button
                          variant="ghost"
                          size="icon"
                          title="Eliminar inscripción"
                          onClick={() => handleDeleteRegistration(r)}
                          className="h-9 w-9 rounded-xl text-slate-400 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-20 text-slate-400 dark:text-slate-500 text-sm"
                  >
                    No se encontraron inscritos con los filtros seleccionados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Creation / Editing Dialog */}
      <RegistrationDialog
        key={editingRegistration ? editingRegistration.id : dialogOpen ? "dialog-new" : "dialog-closed"}
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={loadData}
        registrationToEdit={editingRegistration}
        events={events}
      />
    </div>
  );
}
