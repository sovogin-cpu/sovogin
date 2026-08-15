"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Loader2,
  Trash2,
  UserPlus,
  Edit2,
  Ban,
  Eye,
  QrCode,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";
import { RegistrationQrModal } from "@/components/registrations/RegistrationQrModal";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  Registration,
  RegistrationEventItem,
  RegistrationFilterState,
} from "@/lib/registrations/types";
import {
  calculateRegistrationStats,
  formatCopCurrency,
  maskDocument,
} from "@/lib/registrations/registration-utils";
import {
  cancelRegistration,
  deleteRegistrationRecord,
  listEventsForAdminRegistration,
  listRegistrationsAdmin,
} from "@/lib/registrations/registration-repository";

import { RegistrationOriginBadge } from "@/components/registrations/RegistrationOriginBadge";
import { RegistrationStatusBadge } from "@/components/registrations/RegistrationStatusBadge";
import { PaymentStatusBadge } from "@/components/registrations/PaymentStatusBadge";
import { RegistrationCheckInBadge } from "@/components/registrations/RegistrationCheckInBadge";
import { RegistrationCheckInButton } from "@/components/registrations/RegistrationCheckInButton";
import { RegistrationCheckInStats } from "@/components/registrations/RegistrationCheckInStats";
import { RegistrationFilters } from "@/components/registrations/RegistrationFilters";
import { RegistrationDialog } from "@/components/registrations/RegistrationDialog";
import { RegistrationDetailDialog } from "@/components/registrations/RegistrationDetailDialog";
import { RegistrationExportButton } from "@/components/registrations/RegistrationExportButton";
import { RegistrationStats } from "@/components/registrations/RegistrationStats";

const DEFAULT_FILTERS: RegistrationFilterState = {
  eventId: "all",
  status: "all",
  paymentStatus: "all",
  origin: "all",
  modality: "all",
  category: "all",
  checkInStatus: "all",
  searchQuery: "",
};

export default function RegistrationsAdmin() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [events, setEvents] = useState<RegistrationEventItem[]>([]);
  const [filters, setFilters] = useState<RegistrationFilterState>(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [createEditDialogOpen, setCreateEditDialogOpen] = useState(false);
  const [editingRegistration, setEditingRegistration] = useState<Registration | null>(null);

  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedDetailRegistration, setSelectedDetailRegistration] = useState<Registration | null>(null);

  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedQrRegistration, setSelectedQrRegistration] = useState<Registration | null>(null);

  const handleOpenQrModal = (reg: Registration) => {
    setSelectedQrRegistration(reg);
    setQrModalOpen(true);
  };

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

  // Extract unique categories for filtering dropdown
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    for (const r of registrations) {
      if (r.category && r.category.trim()) {
        set.add(r.category.trim());
      }
    }
    return Array.from(set).sort();
  }, [registrations]);

  // Calculate Dashboard Statistics from current loaded dataset
  const stats = useMemo(() => {
    return calculateRegistrationStats(registrations);
  }, [registrations]);

  const selectedEventTitle = useMemo(() => {
    if (filters.eventId === "all") return undefined;
    const found = events.find((e) => e.id === filters.eventId);
    return found?.title;
  }, [events, filters.eventId]);

  const handleOpenCreateDialog = () => {
    setEditingRegistration(null);
    setCreateEditDialogOpen(true);
  };

  const handleOpenEditDialog = (reg: Registration) => {
    setEditingRegistration(reg);
    setCreateEditDialogOpen(true);
  };

  const handleOpenDetailDialog = (reg: Registration) => {
    setSelectedDetailRegistration(reg);
    setDetailDialogOpen(true);
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

  return (
    <div className="space-y-8">
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white font-heading">
            Gestión de Inscritos
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Administra inscripciones automáticas (Openpay), registros manuales y acreditación en sitio (Check-in).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link href="/admin/check-in">
            <Button
              className="h-12 px-6 rounded-2xl bg-sky-700 hover:bg-sky-800 text-white font-bold gap-2 shadow-lg shadow-sky-950/10"
            >
              <QrCode className="w-5 h-5" />
              <span>Escanear QR</span>
            </Button>
          </Link>

          <RegistrationExportButton
            registrations={registrations}
            selectedEventTitle={selectedEventTitle}
          />

          <Button
            onClick={handleOpenCreateDialog}
            className="h-12 px-6 rounded-2xl bg-[#006666] hover:bg-[#004d4d] text-white font-bold gap-2 shadow-lg shadow-emerald-900/10"
          >
            <UserPlus className="w-5 h-5" />
            <span>Nuevo Inscrito</span>
          </Button>
        </div>
      </div>

      {/* Dashboard KPI Stats Cards */}
      <RegistrationStats stats={stats} selectedEventTitle={selectedEventTitle} />

      {/* Check-in Attendance KPI Cards */}
      <RegistrationCheckInStats stats={stats} />

      {/* Advanced Filters */}
      <RegistrationFilters
        filters={filters}
        events={events}
        availableCategories={availableCategories}
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
                  Categoría / Modalidad
                </TableHead>
                <TableHead className="text-slate-900 dark:text-white font-bold">
                  Origen / Pago
                </TableHead>
                <TableHead className="text-slate-900 dark:text-white font-bold">
                  Acreditación (Check-in)
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
                      <div className="flex flex-col gap-1 items-start">
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          {r.category || "—"}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md capitalize font-medium">
                          {r.modality || "presencial"}
                        </span>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col gap-1.5 items-start">
                        <RegistrationOriginBadge origin={r.origin} />
                        <div className="flex items-center gap-2">
                          <PaymentStatusBadge paymentStatus={r.payment_status} />
                          <span className="font-bold text-slate-900 dark:text-white text-xs">
                            {formatCopCurrency(r.amount)}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <div className="flex flex-col gap-1.5 items-start">
                        <RegistrationCheckInBadge checkedInAt={r.checked_in_at} />
                        <RegistrationCheckInButton registration={r} onSuccess={loadData} />
                      </div>
                    </TableCell>

                    <TableCell>
                      <RegistrationStatusBadge status={r.status} />
                    </TableCell>

                    <TableCell className="text-right pr-8">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Credencial QR"
                          onClick={() => handleOpenQrModal(r)}
                          className="h-9 w-9 rounded-xl text-slate-400 hover:text-sky-600 dark:hover:text-sky-400"
                        >
                          <QrCode className="w-4 h-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          title="Ver detalle completo"
                          onClick={() => handleOpenDetailDialog(r)}
                          className="h-9 w-9 rounded-xl text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>

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
                    colSpan={7}
                    className="text-center py-20 text-slate-400 dark:text-slate-500 text-sm"
                  >
                    No hay inscritos para los filtros seleccionados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Creation / Editing Dialog */}
      <RegistrationDialog
        key={editingRegistration ? editingRegistration.id : createEditDialogOpen ? "dialog-new" : "dialog-closed"}
        isOpen={createEditDialogOpen}
        onClose={() => setCreateEditDialogOpen(false)}
        onSaved={loadData}
        registrationToEdit={editingRegistration}
        events={events}
      />

      {/* Detail Dialog */}
      <RegistrationDetailDialog
        key={selectedDetailRegistration ? `detail-${selectedDetailRegistration.id}` : "detail-closed"}
        isOpen={detailDialogOpen}
        onClose={() => setDetailDialogOpen(false)}
        registration={selectedDetailRegistration}
        onOpenQrModal={handleOpenQrModal}
      />

      {/* QR Credential Modal */}
      <RegistrationQrModal
        key={selectedQrRegistration ? `qr-${selectedQrRegistration.id}` : "qr-closed"}
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        registration={selectedQrRegistration}
      />
    </div>
  );
}
