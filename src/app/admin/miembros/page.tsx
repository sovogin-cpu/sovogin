"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Search, Plus, Loader2, Edit2, Trash2, FileText, UserCheck, Mail, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/utils/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

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

  const [formData, setFormData] = useState<AssociateFormData>({
    full_name: "",
    email: "",
    status: "Activo",
    specialty: "",
    document_number: "",
  });

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
    if (!e.target.files) return;

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
          alert(`Se procesaron ${uniqueAttendees.length} asociados correctamente.`);
          void fetchAssociates();
        }
      } catch (err: unknown) {
        alert(
          "Error al procesar el archivo Excel: " +
            (err instanceof Error ? err.message : String(err))
        );
      } finally {
        setUploading(false);
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-heading">
            Gestión de Asociados
          </h1>
          <p className="text-slate-500">
            Administra los médicos vinculados a SOVOGIN y sus perfiles del directorio publicable.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            onClick={exportToExcel}
            variant="outline"
            className="h-12 px-6 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 gap-2 font-bold shadow-sm"
          >
            <FileText className="w-5 h-5" />
            Exportar Excel
          </Button>

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
                "flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-emerald-500 text-white font-bold text-sm cursor-pointer hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200",
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

          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <Button
              type="button"
              onClick={openCreateModal}
              className="bg-primary hover:bg-primary/90 h-12 px-6 rounded-xl shadow-lg shadow-primary/20 gap-2 font-bold"
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

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Buscar por nombre o email..."
            className="pl-12 h-12 rounded-xl border-slate-200"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="pl-8 py-4">Nombre</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Especialidad</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Directorio Médico</TableHead>
                <TableHead className="text-right pr-8">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {associates.map((associate) => {
                const dirSummary = directorySummaries[associate.id];

                return (
                  <TableRow
                    key={associate.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <TableCell className="font-bold pl-8 py-6">
                      {associate.full_name}
                    </TableCell>
                    <TableCell className="text-slate-500 font-medium">
                      {associate.document_number || "-"}
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {associate.email}
                    </TableCell>
                    <TableCell className="text-sm">
                      {associate.specialty}
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
                          <span>{associate.user_id ? "Portal Activo" : "Invitar"}</span>
                        </Button>

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
              {associates.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-12 text-slate-400 font-medium"
                  >
                    No hay asociados registrados todavía.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
