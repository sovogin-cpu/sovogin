"use client";

import React, { useState, useEffect } from "react";
import {
  FileText,
  UploadCloud,
  Loader2,
  Trash2,
  RefreshCw,
  Power,
  FileCheck,
  FileX,
  Plus,
  Search,
  CheckCircle2,
  AlertCircle,
  Database,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface RagDocument {
  id: string;
  name: string;
  originalFilename: string;
  storagePath: string;
  fileType: string;
  mimeType: string;
  fileSize: number;
  category: string | null;
  description: string | null;
  status: "uploaded" | "processing" | "ready" | "failed";
  isActive: boolean;
  chunkCount: number;
  processingError: string | null;
  createdAt: string;
  updatedAt: string;
}

export function DocumentLibrary() {
  const [documents, setDocuments] = useState<RagDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [reprocessingId, setReprocessingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Formulario de Subida
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customName, setCustomName] = useState("");
  const [category, setCategory] = useState("General");
  const [description, setDescription] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  async function fetchDocuments() {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/chatbot/documents");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al obtener la lista de documentos.");
      }

      setDocuments(data.documents || []);
    } catch (err: any) {
      console.error("Error al cargar documentos:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleUploadSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile) {
      setFormError("Por favor selecciona un archivo para subir.");
      return;
    }

    if (selectedFile.size > 15 * 1024 * 1024) {
      setFormError("El archivo supera el límite de 15 MB.");
      return;
    }

    setIsUploading(true);
    setFormError(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      if (customName.trim()) formData.append("name", customName.trim());
      if (category.trim()) formData.append("category", category.trim());
      if (description.trim()) formData.append("description", description.trim());

      const res = await fetch("/api/admin/chatbot/documents", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Fallo en la ingesta del documento.");
      }

      setIsUploadOpen(false);
      setSelectedFile(null);
      setCustomName("");
      setCategory("General");
      setDescription("");
      fetchDocuments();
    } catch (err: any) {
      setFormError(err.message || "Error al subir el documento.");
    } finally {
      setIsUploading(false);
    }
  }

  async function toggleActiveStatus(doc: RagDocument) {
    try {
      setTogglingId(doc.id);
      const res = await fetch(`/api/admin/chatbot/documents/${doc.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !doc.isActive }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al cambiar estado.");

      setDocuments((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, isActive: data.document.isActive } : d))
      );
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setTogglingId(null);
    }
  }

  async function handleReprocess(docId: string) {
    try {
      setReprocessingId(docId);
      const res = await fetch(`/api/admin/chatbot/documents/${docId}/reprocess`, {
        method: "POST",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al reprocesar el documento.");

      fetchDocuments();
    } catch (err: any) {
      alert("Error en reprocesamiento: " + err.message);
    } finally {
      setReprocessingId(null);
    }
  }

  async function handleDelete(docId: string, name: string) {
    if (!confirm(`¿Eliminar el documento "${name}"? Se eliminará de Storage y se destruirán sus fragmentos vectoriales.`)) {
      return;
    }

    try {
      setDeletingId(docId);
      const res = await fetch(`/api/admin/chatbot/documents/${docId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al eliminar el documento.");

      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setDeletingId(null);
    }
  }

  const filteredDocs = documents.filter((doc) => {
    const query = searchQuery.toLowerCase();
    return (
      doc.name.toLowerCase().includes(query) ||
      doc.originalFilename.toLowerCase().includes(query) ||
      (doc.category && doc.category.toLowerCase().includes(query))
    );
  });

  const totalReady = documents.filter((d) => d.status === "ready").length;
  const totalChunks = documents.reduce((acc, d) => acc + (d.chunkCount || 0), 0);
  const totalFailed = documents.filter((d) => d.status === "failed").length;

  function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  return (
    <div className="space-y-8">
      {/* Resumen RAG Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden border border-slate-100">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-2xl font-bold text-slate-900 font-heading">{documents.length}</h4>
              <p className="text-slate-500 text-xs font-medium">Documentos Totales</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden border border-slate-100">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-2xl font-bold text-slate-900 font-heading">{totalReady}</h4>
              <p className="text-slate-500 text-xs font-medium">Documentos Listos (Ready)</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden border border-slate-100">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-600 shrink-0">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-2xl font-bold text-slate-900 font-heading">{totalChunks}</h4>
              <p className="text-slate-500 text-xs font-medium">Vectores (Chunks 768d)</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden border border-slate-100">
          <CardContent className="p-6 flex items-center gap-4">
            <div className="w-12 h-12 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-600 shrink-0">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-2xl font-bold text-slate-900 font-heading">{totalFailed}</h4>
              <p className="text-slate-500 text-xs font-medium">Con Error / Fallidos</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cabecera y Botón Subir */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 font-heading">Biblioteca Documental RAG</h2>
          <p className="text-slate-500 text-sm">
            Sube manuales, estatutos y archivos para la base de conocimiento vectorial del chatbot.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar documento..."
              className="pl-9 rounded-xl h-11 border-slate-200"
            />
          </div>

          <Button
            onClick={() => setIsUploadOpen(true)}
            className="bg-primary hover:bg-primary/90 h-11 px-5 rounded-xl shadow-md gap-2 font-bold shrink-0 text-white"
          >
            <UploadCloud className="w-5 h-5" />
            Subir Documento
          </Button>
        </div>
      </div>

      {/* Modal de Subida de Archivos */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="sm:max-w-[550px] rounded-3xl border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold font-heading">
              Subir Documento a la Biblioteca RAG
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleUploadSubmit} className="space-y-5 pt-2">
            {formError && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-xs font-medium flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <div className="space-y-2">
              <Label>Archivo Documental *</Label>
              <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center bg-slate-50 hover:bg-slate-100/50 transition-colors">
                <Input
                  type="file"
                  required
                  accept=".pdf,.docx,.doc,.xlsx,.xls,.csv,.txt,.md"
                  onChange={(e) => {
                    const file = e.target.files?.[0] || null;
                    setSelectedFile(file);
                    if (file && !customName) {
                      setCustomName(file.name.replace(/\.[^/.]+$/, ""));
                    }
                  }}
                  className="hidden"
                  id="rag-file-input"
                />
                <label htmlFor="rag-file-input" className="cursor-pointer space-y-2 block">
                  <UploadCloud className="w-10 h-10 text-primary mx-auto opacity-70" />
                  {selectedFile ? (
                    <p className="text-sm font-bold text-slate-800">{selectedFile.name}</p>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-slate-700">Haz clic para seleccionar un archivo</p>
                      <p className="text-xs text-slate-400">PDF, DOCX, DOC, XLSX, XLS, CSV, TXT, MD (Máx 15 MB)</p>
                    </>
                  )}
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nombre Visible</Label>
                <Input
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Ej: Estatutos Internos 2026"
                  className="rounded-xl h-11"
                />
              </div>

              <div className="space-y-2">
                <Label>Categoría</Label>
                <Input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Ej: Normativa, Convenios"
                  className="rounded-xl h-11"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descripción Breve (Opcional)</Label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Breve resumen del contenido..."
                className="w-full min-h-[90px] p-3 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/20 text-xs"
              />
            </div>

            <Button
              type="submit"
              disabled={isUploading}
              className="w-full h-12 rounded-xl font-bold bg-primary text-white text-base shadow-lg shadow-primary/20"
            >
              {isUploading ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin" /> Procesando e Indexando Chunks...
                </span>
              ) : (
                "Subir e Indexar Documento"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Tabla / Lista de Documentos */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredDocs.map((doc) => (
            <Card
              key={doc.id}
              className={`border-none shadow-sm rounded-2xl bg-white border border-slate-100 overflow-hidden transition-all ${
                !doc.isActive ? "opacity-60 bg-slate-50/50" : ""
              }`}
            >
              <CardContent className="p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                      doc.status === "ready"
                        ? "bg-emerald-50 text-emerald-600"
                        : doc.status === "processing"
                        ? "bg-amber-50 text-amber-600"
                        : doc.status === "failed"
                        ? "bg-rose-50 text-rose-600"
                        : "bg-blue-50 text-blue-600"
                    }`}
                  >
                    {doc.status === "ready" && <FileCheck className="w-6 h-6" />}
                    {doc.status === "processing" && <Loader2 className="w-6 h-6 animate-spin" />}
                    {doc.status === "failed" && <FileX className="w-6 h-6" />}
                    {doc.status === "uploaded" && <FileText className="w-6 h-6" />}
                  </div>

                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-slate-900 text-base">{doc.name}</h4>

                      {/* Estado Badge */}
                      {doc.status === "ready" && (
                        <span className="text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Listo ({doc.chunkCount} chunks)
                        </span>
                      )}

                      {doc.status === "processing" && (
                        <span className="text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" /> Procesando
                        </span>
                      )}

                      {doc.status === "failed" && (
                        <span className="text-[10px] font-extrabold uppercase bg-rose-100 text-rose-800 px-2 py-0.5 rounded-md inline-flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Error
                        </span>
                      )}

                      {doc.category && (
                        <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                          {doc.category}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 font-mono">
                      {doc.originalFilename} • {formatBytes(doc.fileSize)} •{" "}
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </p>

                    {doc.description && (
                      <p className="text-xs text-slate-600 line-clamp-1">{doc.description}</p>
                    )}

                    {doc.processingError && doc.status === "failed" && (
                      <div className="mt-2 p-2 rounded-lg bg-rose-50 border border-rose-100 text-rose-700 text-[11px] font-mono">
                        ⚠️ Error: {doc.processingError}
                      </div>
                    )}
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                  {/* Switch Activo / Inactivo */}
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={togglingId === doc.id}
                    onClick={() => toggleActiveStatus(doc)}
                    className={`h-9 px-3 rounded-xl text-xs font-bold gap-1.5 ${
                      doc.isActive
                        ? "text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100"
                        : "text-slate-500 bg-slate-100 border-slate-200 hover:bg-slate-200"
                    }`}
                  >
                    {togglingId === doc.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Power className="w-3.5 h-3.5" />
                    )}
                    {doc.isActive ? "Activo" : "Inactivo"}
                  </Button>

                  {/* Reprocesar */}
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={reprocessingId === doc.id}
                    onClick={() => handleReprocess(doc.id)}
                    title="Reprocesar embeddings desde Storage"
                    className="h-9 w-9 rounded-xl border-slate-200 text-slate-600 hover:text-primary hover:border-primary/30"
                  >
                    {reprocessingId === doc.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </Button>

                  {/* Eliminar */}
                  <Button
                    variant="outline"
                    size="icon"
                    disabled={deletingId === doc.id}
                    onClick={() => handleDelete(doc.id, doc.name)}
                    title="Eliminar documento y vectores"
                    className="h-9 w-9 rounded-xl border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200"
                  >
                    {deletingId === doc.id ? (
                      <Loader2 className="w-4 h-4 animate-spin text-rose-600" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}

          {filteredDocs.length === 0 && (
            <div className="text-center py-16 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-100">
              <Database className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-bold font-heading text-base">No hay documentos registrados</p>
              <p className="text-slate-400 text-xs mt-1">
                Sube tu primer archivo para habilitar el motor de búsqueda semántica RAG.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
