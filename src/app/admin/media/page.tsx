"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  FolderOpen,
  Plus,
  Loader2,
  AlertCircle,
  FileText,
  Eye,
  X,
  Edit2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";
import {
  MediaCategory,
  MediaFilterState,
  MediaItem,
} from "@/lib/media/types";
import {
  listMediaCategories,
  listMediaItems,
  archiveMediaItem,
  updateMediaItem,
} from "@/lib/media/media-repository";
import { MediaFilters } from "@/components/media/MediaFilters";
import { MediaCard } from "@/components/media/MediaCard";
import { MediaUploadDialog } from "@/components/media/MediaUploadDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialFilters: MediaFilterState = {
  searchQuery: "",
  categoryId: "all",
  status: "active",
  visibility: "all",
  mediaType: "all",
};

export default function MediaLibraryAdminPage() {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [categories, setCategories] = useState<MediaCategory[]>([]);
  const [filters, setFilters] = useState<MediaFilterState>(initialFilters);

  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);

  // Preview State
  const [previewItem, setPreviewItem] = useState<{ item: MediaItem; url: string } | null>(null);

  // Edit Metadata State
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);
  const [editTitle, setEditTitle] = useState<string>("");
  const [editDescription, setEditDescription] = useState<string>("");
  const [editAltText, setEditAltText] = useState<string>("");
  const [editCategoryId, setEditCategoryId] = useState<string>("");
  const [isSubmittingEdit, setIsSubmittingEdit] = useState<boolean>(false);

  const supabase = useMemo(() => createClient(), []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMessage(null);

      const [catsData, itemsData] = await Promise.all([
        listMediaCategories(supabase),
        listMediaItems(supabase, filters),
      ]);

      setCategories(catsData);
      setItems(itemsData);
    } catch (err: unknown) {
      console.error("Error loading media library:", err);
      const msg = err instanceof Error ? err.message : "Error al cargar los datos de la biblioteca multimedia.";
      setErrorMessage(msg);
    } finally {
      setLoading(false);
    }
  }, [supabase, filters]);

  useEffect(() => {
    let isMounted = true;

    async function initialize() {
      await loadData();
      if (!isMounted) return;
    }

    void initialize();

    return () => {
      isMounted = false;
    };
  }, [loadData]);

  const handleResetFilters = () => {
    setFilters(initialFilters);
  };

  const handleArchive = async (item: MediaItem) => {
    if (!confirm(`¿Estás seguro de que deseas archivar "${item.title}"?`)) return;

    try {
      await archiveMediaItem(supabase, item.id);
      void loadData();
    } catch (err: unknown) {
      console.error("Error archiving media item:", err);
      alert("Error al archivar el elemento.");
    }
  };

  const handlePreview = (item: MediaItem, signedUrl: string) => {
    setPreviewItem({ item, url: signedUrl });
  };

  const handleOpenEdit = (item: MediaItem) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditDescription(item.description || "");
    setEditAltText(item.alt_text || "");
    setEditCategoryId(item.category_id || "");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      setIsSubmittingEdit(true);
      await updateMediaItem(supabase, editingItem.id, {
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        alt_text: editAltText.trim() || null,
        category_id: editCategoryId || null,
      });

      setEditingItem(null);
      void loadData();
    } catch (err: unknown) {
      console.error("Error updating media item:", err);
      alert("Error al guardar las modificaciones.");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleUploadSuccess = () => {
    void loadData();
  };

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-heading">
            Biblioteca Multimedia
          </h1>
          <p className="text-slate-500 text-sm">
            Gestión centralizada de imágenes, documentos y archivos digitales de SOVOGIN.
          </p>
        </div>

        <Button
          onClick={() => setIsUploadOpen(true)}
          className="bg-primary hover:bg-primary/90 h-12 px-6 rounded-xl shadow-lg shadow-primary/20 gap-2 font-bold text-sm"
        >
          <Plus className="w-5 h-5" />
          Subir Archivo
        </Button>
      </div>

      {/* Filters Section */}
      <MediaFilters
        filters={filters}
        categories={categories}
        onChange={setFilters}
        onReset={handleResetFilters}
      />

      {/* Error State */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-100 flex items-start gap-3 text-red-600 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1 font-medium">{errorMessage}</div>
        </div>
      )}

      {/* Main Content Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-sm font-medium text-slate-500">Cargando biblioteca multimedia...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-[2.5rem] p-16 text-center border border-slate-100 shadow-sm space-y-4 max-w-xl mx-auto">
          <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <FolderOpen className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-xl font-bold text-slate-800 font-heading">
              No se encontraron archivos multimedia
            </h3>
            <p className="text-sm text-slate-500">
              No hay elementos que coincidan con los criterios de búsqueda o no se ha subido ningún archivo aún.
            </p>
          </div>
          <Button
            onClick={() => setIsUploadOpen(true)}
            variant="outline"
            className="rounded-xl h-11 border-primary text-primary font-bold gap-2"
          >
            <Plus className="w-4 h-4" /> Subir primer archivo
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {items.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              onPreview={handlePreview}
              onArchive={handleArchive}
              onEdit={handleOpenEdit}
            />
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <MediaUploadDialog
        isOpen={isUploadOpen}
        onOpenChange={setIsUploadOpen}
        categories={categories}
        onSuccess={handleUploadSuccess}
      />

      {/* Preview Dialog */}
      {previewItem && (
        <Dialog open={!!previewItem} onOpenChange={() => setPreviewItem(null)}>
          <DialogContent className="sm:max-w-[750px] rounded-[2.5rem] border-none shadow-2xl overflow-hidden p-0 bg-slate-950 text-white">
            <div className="p-6 border-b border-slate-800 flex items-center justify-between">
              <div className="space-y-0.5">
                <h3 className="font-bold text-lg">{previewItem.item.title}</h3>
                <p className="text-xs text-slate-400 font-mono">
                  {previewItem.item.original_filename} • {previewItem.item.mime_type}
                </p>
              </div>
              <button
                onClick={() => setPreviewItem(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 flex items-center justify-center min-h-[300px] max-h-[60vh] overflow-auto bg-slate-900/50">
              {previewItem.item.mime_type.startsWith("image/") ? (
                <img
                  src={previewItem.url}
                  alt={previewItem.item.alt_text || previewItem.item.title}
                  className="max-h-[50vh] w-auto object-contain rounded-2xl shadow-xl"
                />
              ) : (
                <div className="text-center space-y-4 py-8">
                  <FileText className="w-16 h-16 text-primary mx-auto opacity-80" />
                  <div className="space-y-2">
                    <p className="text-sm text-slate-300">
                      Vista previa no disponible en reproductor para este tipo de documento.
                    </p>
                    <a
                      href={previewItem.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white font-bold text-sm rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20"
                    >
                      <Eye className="w-4 h-4" /> Abrir Documento Seguro
                    </a>
                  </div>
                </div>
              )}
            </div>

            {previewItem.item.description && (
              <div className="p-6 bg-slate-900 border-t border-slate-800 text-xs text-slate-400">
                <strong className="text-slate-300 block mb-1">Descripción:</strong>
                {previewItem.item.description}
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Metadata Dialog */}
      {editingItem && (
        <Dialog open={!!editingItem} onOpenChange={() => setEditingItem(null)}>
          <DialogContent className="sm:max-w-[550px] rounded-[2.5rem] border-none shadow-2xl p-8">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold font-heading flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-primary" />
                Editar Metadatos del Archivo
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSaveEdit} className="space-y-6 pt-4">
              <div className="space-y-2">
                <Label htmlFor="editTitle" className="text-slate-700 font-bold">
                  Título *
                </Label>
                <Input
                  id="editTitle"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="h-12 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="editCategory" className="text-slate-700 font-bold">
                  Categoría
                </Label>
                <select
                  id="editCategory"
                  value={editCategoryId}
                  onChange={(e) => setEditCategoryId(e.target.value)}
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

              {editingItem.mime_type.startsWith("image/") && (
                <div className="space-y-2">
                  <Label htmlFor="editAltText" className="text-slate-700 font-bold">
                    Texto alternativo (Alt text)
                  </Label>
                  <Input
                    id="editAltText"
                    value={editAltText}
                    onChange={(e) => setEditAltText(e.target.value)}
                    className="h-12 rounded-xl"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="editDescription" className="text-slate-700 font-bold">
                  Descripción
                </Label>
                <Textarea
                  id="editDescription"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="min-h-[90px] rounded-xl resize-none"
                />
              </div>

              <div className="pt-2 flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingItem(null)}
                  disabled={isSubmittingEdit}
                  className="w-1/3 h-12 rounded-xl font-bold"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingEdit || !editTitle.trim()}
                  className="w-2/3 h-12 rounded-xl font-bold bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20"
                >
                  {isSubmittingEdit ? <Loader2 className="w-5 h-5 animate-spin" /> : "Guardar Cambios"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
