"use client";

import React, { useState, useMemo } from "react";
import {
  Upload,
  AlertCircle,
  Loader2,
  FileUp,
  Image as ImageIcon,
  AlertTriangle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MediaCategory, MediaItem, MediaVisibility } from "@/lib/media/types";
import {
  calculateSha256,
  extractFileExtension,
  generateStoragePath,
  getImageDimensions,
  isValidMimeType,
  sanitizeFilename,
  validateFileSize,
  MAX_FILE_SIZE_BYTES,
  formatBytes,
} from "@/lib/media/file-utils";
import { createClient } from "@/utils/supabase/client";
import { findMediaByHash, createMediaItem } from "@/lib/media/media-repository";

interface MediaUploadDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  categories: MediaCategory[];
  onSuccess: (newItem: MediaItem) => void;
}

export function MediaUploadDialog({
  isOpen,
  onOpenChange,
  categories,
  onSuccess,
}: MediaUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [altText, setAltText] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [visibility, setVisibility] = useState<MediaVisibility>("public");

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [duplicateItem, setDuplicateItem] = useState<MediaItem | null>(null);
  const [forceDuplicateUpload, setForceDuplicateUpload] = useState<boolean>(false);

  const supabase = useMemo(() => createClient(), []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] || null;
    setErrorMessage(null);
    setDuplicateItem(null);
    setForceDuplicateUpload(false);

    if (!selected) {
      setFile(null);
      return;
    }

    if (!isValidMimeType(selected.type)) {
      setErrorMessage(
        "Tipo de archivo no permitido. Solo se permiten imágenes (PNG, JPG, WEBP) y documentos (PDF, Office, TXT). Los archivos SVG no están permitidos en esta versión."
      );
      setFile(null);
      return;
    }

    if (!validateFileSize(selected.size)) {
      setErrorMessage(
        `El archivo excede el tamaño máximo permitido de ${formatBytes(MAX_FILE_SIZE_BYTES)} (10 MB).`
      );
      setFile(null);
      return;
    }

    setFile(selected);
    if (!title) {
      const nameWithoutExt = selected.name.substring(0, selected.name.lastIndexOf(".")) || selected.name;
      setTitle(nameWithoutExt);
    }
  };

  const resetForm = () => {
    setFile(null);
    setTitle("");
    setDescription("");
    setAltText("");
    setCategoryId("");
    setVisibility("public");
    setErrorMessage(null);
    setDuplicateItem(null);
    setForceDuplicateUpload(false);
    setLoading(false);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const processUpload = async () => {
    if (!file) {
      setErrorMessage("Debes seleccionar un archivo.");
      return;
    }

    if (!title.trim()) {
      setErrorMessage("El título del archivo es obligatorio.");
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    let uploadedPath: string | null = null;

    try {
      // 1. Calculate SHA-256 Hash
      const hash = await calculateSha256(file);

      // 2. Duplicate Check
      if (!forceDuplicateUpload) {
        const existing = await findMediaByHash(supabase, hash);
        if (existing) {
          setDuplicateItem(existing);
          setLoading(false);
          return;
        }
      }

      // 3. Obtain user identity
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // 4. Generate Storage Path
      const sanitizedName = sanitizeFilename(file.name);
      const storagePath = generateStoragePath(sanitizedName);

      // 5. Image dimensions if applicable
      const dimensions = await getImageDimensions(file);

      // 6. Upload to private bucket 'media-library'
      const { error: uploadError } = await supabase.storage
        .from("media-library")
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) throw uploadError;
      uploadedPath = storagePath;

      // 7. Insert DB record into media_items
      const newItem = await createMediaItem(supabase, {
        title: title.trim(),
        description: description.trim() || null,
        alt_text: file.type.startsWith("image/") ? altText.trim() || null : null,
        original_filename: file.name,
        storage_bucket: "media-library",
        storage_path: storagePath,
        public_url: null, // Private bucket: public_url stays null
        mime_type: file.type,
        file_extension: extractFileExtension(file.name),
        file_size_bytes: file.size,
        width: dimensions?.width || null,
        height: dimensions?.height || null,
        sha256_hash: hash,
        category_id: categoryId || null,
        uploaded_by: user?.id || null,
        status: "active",
        visibility,
      });

      onSuccess(newItem);
      handleClose();
    } catch (err: unknown) {
      console.error("Error during media upload:", err);

      // Rollback upload if insert failed
      if (uploadedPath) {
        try {
          await supabase.storage.from("media-library").remove([uploadedPath]);
        } catch (cleanupErr) {
          console.error("Failed to cleanup orphan object:", cleanupErr);
        }
      }

      const msg = err instanceof Error ? err.message : "Ocurrió un error al subir el archivo multimedia.";
      setErrorMessage(`Error en la carga: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDuplicateUpload = () => {
    setForceDuplicateUpload(true);
    setDuplicateItem(null);
    void processUpload();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[650px] rounded-[2.5rem] border-none shadow-2xl overflow-y-auto max-h-[90vh] p-8">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold font-heading flex items-center gap-3">
            <Upload className="w-6 h-6 text-primary" />
            Subir Archivo a la Biblioteca
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-100 flex items-start gap-3 text-red-600 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Duplicate Warning Dialog / Alert */}
          {duplicateItem ? (
            <div className="p-6 rounded-3xl bg-amber-50 border border-amber-200 space-y-4">
              <div className="flex items-start gap-3 text-amber-800">
                <AlertTriangle className="w-6 h-6 shrink-0 text-amber-600 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-bold text-base">¡Archivo duplicado detectado!</h4>
                  <p className="text-xs leading-relaxed text-amber-700">
                    Un archivo con el mismo contenido (SHA-256) ya se encuentra registrado bajo el título:{" "}
                    <strong className="underline">{duplicateItem.title}</strong> ({duplicateItem.original_filename}).
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDuplicateItem(null)}
                  className="flex-1 rounded-xl h-11 border-amber-300 text-amber-900 font-bold text-xs"
                >
                  Cancelar Carga
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmDuplicateUpload}
                  className="flex-1 rounded-xl h-11 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
                >
                  Subir de todos modos
                </Button>
              </div>
            </div>
          ) : (
            <>
              {/* File Drop Area */}
              <div className="space-y-2">
                <Label className="text-slate-700 font-bold">Seleccionar Archivo *</Label>
                <div className="border-2 border-dashed border-slate-200 rounded-3xl p-6 bg-slate-50/50 flex flex-col items-center justify-center text-center space-y-3 hover:bg-slate-50 transition-colors">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                    <FileUp className="w-6 h-6" />
                  </div>
                  {file ? (
                    <div className="space-y-1">
                      <p className="font-bold text-slate-800 text-sm">{file.name}</p>
                      <p className="text-xs text-slate-400 font-mono">
                        {file.type} • {formatBytes(file.size)}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-slate-600">
                        Haz clic o arrastra un archivo aquí
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Imágenes (PNG, JPG, WEBP) o Documentos (PDF, DOCX, XLSX). Máx 10 MB.
                      </p>
                    </div>
                  )}
                  <Input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
                    onChange={handleFileSelect}
                    className="cursor-pointer h-10 text-xs max-w-xs"
                  />
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title" className="text-slate-700 font-bold">
                    Título descriptivo *
                  </Label>
                  <Input
                    id="title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ej. Afiche Oficial Simposio 2026"
                    className="h-12 rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="category" className="text-slate-700 font-bold">
                      Categoría
                    </Label>
                    <select
                      id="category"
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
                    >
                      <option value="">Sin categoría</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="visibility" className="text-slate-700 font-bold">
                      Visibilidad *
                    </Label>
                    <select
                      id="visibility"
                      value={visibility}
                      onChange={(e) => setVisibility(e.target.value as MediaVisibility)}
                      className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-800 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer"
                    >
                      <option value="public">Pública (Accesible vía Signed URL)</option>
                      <option value="private">Privada (Restringida a administración)</option>
                    </select>
                  </div>
                </div>

                {file && file.type.startsWith("image/") && (
                  <div className="space-y-2">
                    <Label htmlFor="altText" className="text-slate-700 font-bold flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-primary" />
                      Texto alternativo (Alt text)
                    </Label>
                    <Input
                      id="altText"
                      value={altText}
                      onChange={(e) => setAltText(e.target.value)}
                      placeholder="Descripción accesible para personas con discapacidad visual"
                      className="h-12 rounded-xl"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="description" className="text-slate-700 font-bold">
                    Descripción / Notas internas
                  </Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Detalles sobre el contenido, autor, versión o contexto de uso..."
                    className="min-h-[90px] rounded-xl resize-none"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={loading}
                  className="w-1/3 h-14 rounded-2xl font-bold border-slate-200 text-slate-600"
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={() => void processUpload()}
                  disabled={loading || !file || !title.trim()}
                  className="w-2/3 h-14 rounded-2xl font-bold bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 flex items-center justify-center gap-2 text-base"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" /> Procesando y subiendo...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" /> Subir a la Biblioteca
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
