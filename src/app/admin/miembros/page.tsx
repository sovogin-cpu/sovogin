"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Loader2,
  Edit2,
  Trash2,
  FileText,
  UserCheck,
  Mail,
  CheckCircle2,
  Send,
  CheckSquare,
  Square,
  AlertCircle,
  MailCheck,
  CreditCard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/utils/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";

import * as XLSX from "xlsx";
import { cn } from "@/lib/utils";
import { listDirectoryProfileSummaries } from "@/lib/directory/directory-repository";
import { AssociateDirectoryProfileSummary } from "@/lib/directory/types";
import { BulkInviteResponse } from "@/app/api/admin/associates/bulk-invite/route";

interface Associate {
  id: string;
  user_id?: string | null;
  full_name: string;
  email: string;
  document_number?: string | null;
  specialty?: string | null;
  status: string;
  created_at: string;
}

interface AssociateFormData {
  full_name: string;
  email: string;
  status: string;
  specialty: string;
  document_number: string;
}

interface ExcelRow {
  Nombre?: string;
  nombre?: string;
  FullName?: string;
  Email?: string;
  email?: string;
  Documento?: string;
  documento?: string;
  Cedula?: string;
  cedula?: string;
  Especialidad?: string;
  especialidad?: string;
  [key: string]: unknown;
}

export default function MembersAdmin() {
  const [associates, setAssociates] = useState<Associate[]>([]);
  const [directorySummaries, setDirectorySummaries] = useState<
    Record<string, AssociateDirectoryProfileSummary>
  >({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [invitingId, setInvitingId] = useState<string | null>(null);

  // Bulk invite states
  const [isBulkInviting, setIsBulkInviting] = useState(false);
  const [bulkResult, setBulkResult] = useState<BulkInviteResponse | null>(null);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  // Post import state
  const [postImportCount, setPostImportCount] = useState<number | null>(null);
  const [isPostImportModalOpen, setIsPostImportModalOpen] = useState(false);

  const supabase = useMemo(() => createClient(), []);

  const fetchAssociates = useCallback(async () => {
    try {
      const [assocRes, dirSummaries] = await Promise.all([
        supabase.from("associates").select("*").order("created_at", { ascending: false }),
        listDirectoryProfileSummaries(supabase),
      ]);

      if (assocRes.error) throw assocRes.error;
      setAssociates((assocRes.data as Associate[]) || []);

      const summaryMap: Record<string, AssociateDirectoryProfileSummary> = {};
      dirSummaries.forEach((s) => {
        summaryMap[s.associate_id] = s;
      });
      setDirectorySummaries(summaryMap);
    } catch (error: unknown) {
      console.error(
        "Error fetching associates:",
        error instanceof Error ? error.message : error
      );
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialAssociates() {
      try {
        const [assocRes, dirSummaries] = await Promise.all([
          supabase.from("associates").select("*").order("created_at", { ascending: false }),
          listDirectoryProfileSummaries(supabase),
        ]);

        if (assocRes.error) throw assocRes.error;
        if (isMounted) {
          setAssociates((assocRes.data as Associate[]) || []);

          const summaryMap: Record<string, AssociateDirectoryProfileSummary> = {};
          dirSummaries.forEach((s) => {
            summaryMap[s.associate_id] = s;
          });
          setDirectorySummaries(summaryMap);
        }
      } catch (error: unknown) {
        console.error(
          "Error fetching associates:",
          error instanceof Error ? error.message : error
        );
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadInitialAssociates();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  // Filtered associates list
  const filteredAssociates = useMemo(() => {
    if (!searchTerm.trim()) return associates;
    const term = searchTerm.toLowerCase().trim();
    return associates.filter(
      (a) =>
        a.full_name.toLowerCase().includes(term) ||
        a.email.toLowerCase().includes(term) ||
        (a.document_number && a.document_number.toLowerCase().includes(term)) ||
        (a.specialty && a.specialty.toLowerCase().includes(term))
    );
  }, [associates, searchTerm]);

  // Selection handlers
  const isAllVisibleSelected = useMemo(() => {
    if (filteredAssociates.length === 0) return false;
    return filteredAssociates.every((a) => selectedIds.includes(a.id));
  }, [filteredAssociates, selectedIds]);

  const toggleSelectAllVisible = () => {
    if (isAllVisibleSelected) {
      const visibleIdSet = new Set(filteredAssociates.map((a) => a.id));
      setSelectedIds(selectedIds.filter((id) => !visibleIdSet.has(id)));
    } else {
      const visibleIdSet = new Set(filteredAssociates.map((a) => a.id));
      const combined = new Set([...selectedIds, ...visibleIdSet]);
      setSelectedIds(Array.from(combined));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const clearSelection = () => {
    setSelectedIds([]);
  };

  // Single associate invitation
  const handleInviteAssociate = async (associate: Associate) => {
    try {
      setInvitingId(associate.id);
      const res = await fetch(`/api/admin/associates/${associate.id}/invite`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.error || "No se pudo enviar la invitación al portal.");
        return;
      }

      alert(data.message || "Invitación enviada exitosamente.");
      void fetchAssociates();
    } catch (err: unknown) {
      console.error("Error al invitar asociado:", err);
      alert("Error al conectar con el servidor.");
    } finally {
      setInvitingId(null);
    }
  };

  // Bulk portal invitation handler
  const handleBulkInvite = async (options: {
    associateIds?: string[];
    inviteAllUnlinked?: boolean;
  }) => {
    try {
      setIsBulkInviting(true);
      const res = await fetch("/api/admin/associates/bulk-invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(options),
      });

      const data: BulkInviteResponse = await res.json();

      if (!res.ok || !data.success) {
        alert((data as unknown as { error?: string }).error || "Error al procesar invitaciones masivas.");
        return;
      }

      setBulkResult(data);
      setIsBulkModalOpen(true);
      if (options.associateIds) {
        setSelectedIds([]);
      }
      void fetchAssociates();
    } catch (err: unknown) {
      console.error("Error en invitación masiva:", err);
      alert("Ocurrió un error inesperado al conectar con el servidor.");
    } finally {
      setIsBulkInviting(false);
    }
  };

  const [formData, setFormData] = useState<AssociateFormData>({
    full_name: "",
    email: "",
    status: "Activo",
    specialty: "",
    document_number: "",
  });

  function openCreateModal() {
    setEditingId(null);
    setFormData({
      full_name: "",
      email: "",
      status: "Activo",
      specialty: "",
      document_number: "",
    });
    setIsModalOpen(true);
  }

  function openEditModal(associate: Associate) {
    setEditingId(associate.id);
    setFormData({
      full_name: associate.full_name,
      email: associate.email,
      status: associate.status,
      specialty: associate.specialty || "",
      document_number: associate.document_number || "",
    });
    setIsModalOpen(true);
  }

  async function handleExcelUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return;

    setUploading(true);
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json<ExcelRow>(worksheet);

        const attendees = jsonData
          .map((row) => {
            const values = Object.values(row);
            const name =
              row.Nombre ||
              row.nombre ||
              row.FullName ||
              (typeof values[0] === "string" || typeof values[0] === "number"
                ? values[0]
                : "");
            const email =
              row.Email ||
              row.email ||
              (typeof values[1] === "string" || typeof values[1] === "number"
                ? values[1]
                : "");
            const doc =
              row.Documento ||
              row.documento ||
              row.Cedula ||
              row.cedula ||
              (typeof values[2] === "string" || typeof values[2] === "number"
                ? values[2]
                : "");
            const spec =
              row.Especialidad ||
              row.especialidad ||
              (typeof values[3] === "string" || typeof values[3] === "number"
                ? values[3]
                : "");

            return {
              full_name: name ? String(name).trim() : "Sin Nombre",
              email: email ? String(email).trim().toLowerCase() : "",
              document_number: doc ? String(doc).trim() : "",
              specialty: spec ? String(spec).trim() : "",
              status: "Activo",
            };
          })
          .filter((a) => a.email);

        const uniqueAttendees = Array.from(
          new Map(attendees.map((item) => [item.email, item])).values()
        );

        const { error } = await supabase
          .from("associates")
          .upsert(uniqueAttendees, { onConflict: "email" });

        if (error) {
          alert("Error de base de datos: " + error.message);
        } else {
          setPostImportCount(uniqueAttendees.length);
          setIsPostImportModalOpen(true);
          void fetchAssociates();
        }
      } catch (err: unknown) {
        alert(
          "Error al procesar el archivo Excel: " +
            (err instanceof Error ? err.message : String(err))
        );
      } finally {
        setUploading(false);
        e.target.value = "";
      }
    };

    reader.readAsArrayBuffer(file);
  }

  function exportToExcel() {
    const dataToExport = associates.map((a) => ({
      "Nombre Completo": a.full_name,
      "Documento / Cédula": a.document_number || "",
      "Correo Electrónico": a.email,
      Especialidad: a.specialty || "",
      Estado: a.status,
      "Acceso Portal": a.user_id ? "Cuenta vinculada" : "Sin acceso al Portal",
      "Fecha de Registro": new Date(a.created_at).toLocaleDateString(),
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Asociados");
    XLSX.writeFile(workbook, "Asociados_SOVOGIN.xlsx");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingId) {
        const { error } = await supabase
          .from("associates")
          .update(formData)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("associates").insert([formData]);
        if (error) throw error;
      }
      setIsModalOpen(false);
      void fetchAssociates();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error al procesar la solicitud";
      alert("Error: " + message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function deleteAssociate(id: string) {
    if (!confirm("¿Eliminar este asociado?")) return;
    try {
      const { error } = await supabase.from("associates").delete().eq("id", id);
      if (error) throw error;
      void fetchAssociates();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Error al eliminar el asociado";
      alert("Error: " + message);
    }
  }

  return (
    <div className="space-y-8">
      {/* Header & Main Actions */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-heading">
            Gestión de Asociados
          </h1>
          <p className="text-slate-500">
            Administra los médicos vinculados a SOVOGIN, invitaciones al Portal y perfiles del directorio médico.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          {/* Action: Invite All Unlinked */}
          <Button
            onClick={() => handleBulkInvite({ inviteAllUnlinked: true })}
            disabled={isBulkInviting}
            variant="outline"
            className="h-12 px-5 rounded-xl border-[#006666]/30 text-[#006666] bg-[#006666]/5 hover:bg-[#006666]/10 gap-2 font-bold shadow-xs"
            title="Envía la invitación al portal a todos los asociados activos que nunca han tenido cuenta vinculada"
          >
            {isBulkInviting ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#006666]" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            <span>Invitar todos sin cuenta</span>
          </Button>

          {/* Export Excel */}
          <Button
            onClick={exportToExcel}
            variant="outline"
            className="h-12 px-5 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 gap-2 font-bold shadow-xs"
          >
            <FileText className="w-5 h-5" />
            Exportar Excel
          </Button>

          {/* Import Excel */}
          <div className="relative">
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleExcelUpload}
              className="hidden"
              id="member-excel-upload"
            />
            <label
              htmlFor="member-excel-upload"
              className={cn(
                "flex items-center justify-center gap-2 h-12 px-5 rounded-xl bg-emerald-600 text-white font-bold text-sm cursor-pointer hover:bg-emerald-700 transition-all shadow-md shadow-emerald-200",
                uploading && "opacity-50 cursor-not-allowed"
              )}
            >
              {uploading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Carga Masiva Excel"
              )}
            </label>
          </div>

          {/* Create Associate Modal */}
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <Button
              type="button"
              onClick={openCreateModal}
              className="bg-primary hover:bg-primary/90 h-12 px-5 rounded-xl shadow-md shadow-primary/20 gap-2 font-bold"
            >
              <Plus className="w-5 h-5" />
              Nuevo Asociado
            </Button>
            <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] border-none shadow-2xl">
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold font-heading">
                  {editingId ? "Editar Asociado" : "Nuevo Asociado"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre Completo</Label>
                    <Input
                      required
                      value={formData.full_name}
                      onChange={(e) =>
                        setFormData({ ...formData, full_name: e.target.value })
                      }
                      placeholder="Dr. Nombre Apellido"
                      className="rounded-xl h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Documento / Cédula</Label>
                    <Input
                      value={formData.document_number}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          document_number: e.target.value,
                        })
                      }
                      placeholder="12345678"
                      className="rounded-xl h-12"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Correo Electrónico</Label>
                  <Input
                    required
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="correo@ejemplo.com"
                    className="rounded-xl h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Especialidad</Label>
                  <Input
                    value={formData.specialty}
                    onChange={(e) =>
                      setFormData({ ...formData, specialty: e.target.value })
                    }
                    placeholder="Ej: Ginecología y Obstetricia"
                    className="rounded-xl h-12"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-14 rounded-xl font-bold bg-primary text-white text-lg"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    "Guardar Asociado"
                  )}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search Bar & Selection Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Buscar por nombre, email, cédula o especialidad..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-12 rounded-xl border-slate-200 bg-white"
          />
        </div>

        {selectedIds.length > 0 && (
          <div className="flex items-center gap-3 bg-[#006666]/10 p-2 px-4 rounded-xl border border-[#006666]/20">
            <span className="text-xs font-bold text-[#006666]">
              {selectedIds.length} seleccionado(s)
            </span>
            <Button
              size="sm"
              onClick={() => handleBulkInvite({ associateIds: selectedIds })}
              disabled={isBulkInviting}
              className="h-9 px-3 bg-[#006666] hover:bg-[#004d4d] text-white text-xs font-bold rounded-lg gap-1.5"
            >
              {isBulkInviting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <MailCheck className="w-3.5 h-3.5" />
              )}
              <span>Invitar seleccionados</span>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={clearSelection}
              className="h-9 text-xs text-slate-500 hover:text-slate-800"
            >
              Limpiar
            </Button>
          </div>
        )}
      </div>

      {/* Table Container */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="w-12 pl-6 py-4">
                  <button
                    type="button"
                    onClick={toggleSelectAllVisible}
                    className="text-slate-400 hover:text-slate-700 transition-colors"
                    title={isAllVisibleSelected ? "Desmarcar visibles" : "Seleccionar visibles"}
                  >
                    {isAllVisibleSelected ? (
                      <CheckSquare className="w-5 h-5 text-[#006666]" />
                    ) : (
                      <Square className="w-5 h-5" />
                    )}
                  </button>
                </TableHead>
                <TableHead className="py-4">Nombre</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Estado Gremiat</TableHead>
                <TableHead>Acceso Portal</TableHead>
                <TableHead>Directorio Médico</TableHead>
                <TableHead className="text-right pr-8">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssociates.map((associate) => {
                const dirSummary = directorySummaries[associate.id];
                const isSelected = selectedIds.includes(associate.id);

                return (
                  <TableRow
                    key={associate.id}
                    className={cn(
                      "hover:bg-slate-50 transition-colors",
                      isSelected && "bg-[#006666]/5 hover:bg-[#006666]/10"
                    )}
                  >
                    <TableCell className="pl-6 py-6">
                      <button
                        type="button"
                        onClick={() => toggleSelectOne(associate.id)}
                        className="text-slate-400 hover:text-slate-700 transition-colors"
                      >
                        {isSelected ? (
                          <CheckSquare className="w-5 h-5 text-[#006666]" />
                        ) : (
                          <Square className="w-5 h-5" />
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="font-bold">
                      {associate.full_name}
                    </TableCell>
                    <TableCell className="text-slate-500 font-medium text-xs">
                      {associate.document_number || "-"}
                    </TableCell>
                    <TableCell className="text-slate-500 text-xs">
                      {associate.email}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                          associate.status === "Activo"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {associate.status}
                      </span>
                    </TableCell>
                    <TableCell>
                      {associate.user_id ? (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          Cuenta vinculada
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-amber-600" />
                          Sin acceso al Portal
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {dirSummary ? (
                        dirSummary.is_published ? (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Publicado
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            No publicado
                          </span>
                        )
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                          Sin perfil
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      <div className="flex items-center justify-end gap-2">
                        {/* Quick Action for Portal Invitation */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleInviteAssociate(associate)}
                          disabled={invitingId === associate.id || associate.status !== "Activo"}
                          className={`h-8 px-2.5 rounded-lg text-xs font-semibold gap-1.5 transition-colors ${
                            associate.status !== "Activo"
                              ? "text-slate-400 bg-slate-100 cursor-not-allowed opacity-65"
                              : associate.user_id
                              ? "text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                              : "text-[#006666] bg-[#006666]/10 hover:bg-[#006666]/20"
                          }`}
                          title={
                            associate.status !== "Activo"
                              ? "Membresía inactiva - Se requiere estar Activo para enviar invitación al Portal"
                              : associate.user_id
                              ? "Re-enviar acceso al Portal del Asociado"
                              : "Invitar al Portal del Asociado"
                          }
                        >
                          {invitingId === associate.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : associate.user_id ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Mail className="w-3.5 h-3.5" />
                          )}
                          <span>{associate.user_id ? "Re-enviar" : "Invitar"}</span>
                        </Button>

                        {/* Quick Action for Membership Ledger */}
                        <Link
                          href={`/admin/membresias/${associate.id}`}
                          className="p-2 rounded-lg text-slate-400 hover:text-[#006666] hover:bg-[#006666]/10 transition-colors"
                          title="Ver expediente contable y membresía"
                        >
                          <CreditCard className="w-4 h-4" />
                        </Link>

                        {/* Quick Action for Directory */}
                        <Link
                          href={
                            dirSummary
                              ? `/admin/directorio-medico?profileId=${dirSummary.id}`
                              : `/admin/directorio-medico?new=1&associateId=${associate.id}`
                          }
                          className="p-2 rounded-lg text-slate-400 hover:text-[#006666] hover:bg-emerald-50 transition-colors"
                          title={
                            dirSummary
                              ? "Editar perfil del Directorio Médico"
                              : "Crear perfil en Directorio Médico"
                          }
                        >
                          <UserCheck className="w-4 h-4" />
                        </Link>

                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditModal(associate)}
                          className="text-slate-400 hover:text-primary"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteAssociate(associate.id)}
                          className="text-slate-400 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredAssociates.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-12 text-slate-400 font-medium"
                  >
                    No se encontraron asociados con los criterios de búsqueda.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Post-Import Modal */}
      <Dialog open={isPostImportModalOpen} onOpenChange={setIsPostImportModalOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-[2rem] border-none shadow-2xl p-6">
          <DialogHeader className="space-y-3 text-center">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <DialogTitle className="text-2xl font-bold font-heading text-slate-900">
              Carga Masiva Exitosa
            </DialogTitle>
            <DialogDescription className="text-slate-600 text-sm">
              Se han procesado e importado correctamente <strong>{postImportCount}</strong> asociados desde el archivo Excel.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3 text-xs text-slate-500 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <p>• Los asociados importados han quedado registrados en la base de datos.</p>
            <p>• ¿Deseas enviarles las invitaciones para activar su cuenta en el Portal del Asociado ahora?</p>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              variant="outline"
              onClick={() => setIsPostImportModalOpen(false)}
              className="w-full sm:w-auto h-11 rounded-xl text-slate-600 font-semibold"
            >
              Más tarde
            </Button>
            <Button
              onClick={() => {
                setIsPostImportModalOpen(false);
                void handleBulkInvite({ inviteAllUnlinked: true });
              }}
              className="w-full sm:w-auto h-11 rounded-xl bg-[#006666] hover:bg-[#004d4d] text-white font-bold gap-2"
            >
              <Send className="w-4 h-4" />
              Enviar invitaciones al Portal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Invite Summary Modal */}
      <Dialog open={isBulkModalOpen} onOpenChange={setIsBulkModalOpen}>
        <DialogContent className="sm:max-w-[550px] rounded-[2rem] border-none shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
          <DialogHeader className="space-y-2">
            <div className="w-12 h-12 bg-[#006666]/10 text-[#006666] rounded-2xl flex items-center justify-center mb-2">
              <MailCheck className="w-6 h-6" />
            </div>
            <DialogTitle className="text-2xl font-bold font-heading text-slate-900">
              Resumen de Invitaciones Masivas
            </DialogTitle>
            <DialogDescription className="text-slate-600 text-sm">
              {bulkResult?.message || "Procesamiento de invitaciones al Portal completado."}
            </DialogDescription>
          </DialogHeader>

          {bulkResult && (
            <div className="space-y-4 pt-2">
              {/* Stat Cards Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-xl text-center">
                  <div className="text-2xl font-black text-emerald-700">{bulkResult.invited}</div>
                  <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mt-1">
                    Enviadas
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-100 p-3.5 rounded-xl text-center">
                  <div className="text-2xl font-black text-blue-700">{bulkResult.already_linked}</div>
                  <div className="text-[10px] font-bold text-blue-800 uppercase tracking-wider mt-1">
                    Ya Vinculadas
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-100 p-3.5 rounded-xl text-center">
                  <div className="text-2xl font-black text-amber-700">{bulkResult.missing_email + bulkResult.skipped_inactive}</div>
                  <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider mt-1">
                    Omitidos
                  </div>
                </div>

                <div className="bg-rose-50 border border-rose-100 p-3.5 rounded-xl text-center">
                  <div className="text-2xl font-black text-rose-700">{bulkResult.errors.length}</div>
                  <div className="text-[10px] font-bold text-rose-800 uppercase tracking-wider mt-1">
                    Errores
                  </div>
                </div>
              </div>

              {/* Errors List if any */}
              {bulkResult.errors.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4" />
                    Detalle de Errores ({bulkResult.errors.length})
                  </h4>
                  <div className="bg-rose-50/70 border border-rose-200 rounded-xl p-3 max-h-40 overflow-y-auto space-y-2 text-xs text-rose-900">
                    {bulkResult.errors.map((err, idx) => (
                      <div key={idx} className="border-b border-rose-200/60 pb-1.5 last:border-0 last:pb-0">
                        <span className="font-bold">{err.email || err.associate_id}: </span>
                        <span>{err.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-4">
            <Button
              onClick={() => setIsBulkModalOpen(false)}
              className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold"
            >
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
