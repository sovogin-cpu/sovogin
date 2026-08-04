"use client";

import React, { useEffect, useState } from "react";
import {
  Image as ImageIcon,
  FolderKanban,
  Search,
  X,
  Check,
  FileText,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import {
  createSignedMediaUrl,
  listMediaCategories,
  listMediaItems,
} from "@/lib/media/media-repository";
import { MediaCategory, MediaItem, MediaTypeFilter } from "@/lib/media/types";
import { classifyMediaType } from "@/lib/media/file-utils";

interface FeaturedMediaSelectorProps {
  mode?: "single" | "multiple";
  selectedMediaId?: string | null;
  selectedMediaIds?: string[];
  onSelectSingle?: (mediaId: string | null, item?: MediaItem) => void;
  onSelectMultiple?: (mediaIds: string[], items?: MediaItem[]) => void;
  allowedType?: "image" | "document" | "all";
  buttonLabel?: string;
}

export const FeaturedMediaSelector: React.FC<FeaturedMediaSelectorProps> = ({
  mode = "single",
  selectedMediaId = null,
  selectedMediaIds = [],
  onSelectSingle,
  onSelectMultiple,
  allowedType = "all",
  buttonLabel,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [categories, setCategories] = useState<MediaCategory[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [typeFilter, setTypeFilter] = useState<MediaTypeFilter>(
    allowedType === "image" ? "image" : allowedType === "document" ? "document" : "all"
  );

  // Preview URLs mapping
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [selectedItems, setSelectedItems] = useState<MediaItem[]>([]);
  const [tempSingleId, setTempSingleId] = useState<string | null>(selectedMediaId);
  const [tempMultipleIds, setTempMultipleIds] = useState<string[]>(selectedMediaIds);

  const handleOpenModal = () => {
    setTempSingleId(selectedMediaId);
    setTempMultipleIds(selectedMediaIds || []);
    setLoading(true);
    setIsOpen(true);
  };

  useEffect(() => {
    let isMounted = true;

    if (isOpen) {
      const supabase = createClient();
      Promise.all([
        listMediaItems(supabase, {
          status: "active",
          visibility: "all",
          searchQuery,
          categoryId: categoryId === "all" ? undefined : categoryId,
          mediaType: typeFilter,
        }),
        listMediaCategories(supabase),
      ])
        .then(async ([items, cats]) => {
          if (!isMounted) return;
          setMediaItems(items);
          setCategories(cats);

          const urlMap: Record<string, string> = {};
          for (const item of items.slice(0, 30)) {
            if (classifyMediaType(item.mime_type) === "image") {
              try {
                const url = await createSignedMediaUrl(supabase, item.storage_path, 3600);
                urlMap[item.id] = url;
              } catch {
                // Ignore
              }
            }
          }
          if (isMounted) {
            setPreviewUrls(urlMap);
            setLoading(false);
          }
        })
        .catch((err) => {
          console.error("Error al cargar elementos multimedia:", err);
          if (isMounted) setLoading(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, searchQuery, categoryId, typeFilter]);

  // Load single preview item for trigger button
  useEffect(() => {
    let isMounted = true;
    if (selectedMediaId && mode === "single") {
      const supabase = createClient();
      supabase
        .from("media_items")
        .select("*, media_categories(id, name, slug)")
        .eq("id", selectedMediaId)
        .maybeSingle()
        .then(async ({ data }) => {
          if (data && isMounted) {
            const item = data as MediaItem;
            setSelectedItems([item]);
            if (classifyMediaType(item.mime_type) === "image") {
              try {
                const signed = await createSignedMediaUrl(supabase, item.storage_path, 3600);
                if (isMounted) {
                  setPreviewUrls((prev) => ({ ...prev, [item.id]: signed }));
                }
              } catch {
                // Ignore
              }
            }
          }
        });
    }
    return () => {
      isMounted = false;
    };
  }, [selectedMediaId, mode]);

  const handleToggleSelect = (item: MediaItem) => {
    if (mode === "single") {
      setTempSingleId((prev) => (prev === item.id ? null : item.id));
    } else {
      setTempMultipleIds((prev) =>
        prev.includes(item.id)
          ? prev.filter((id) => id !== item.id)
          : [...prev, item.id]
      );
    }
  };

  const handleApplySelection = () => {
    if (mode === "single") {
      const selectedObj = mediaItems.find((i) => i.id === tempSingleId);
      if (onSelectSingle) {
        onSelectSingle(tempSingleId, selectedObj);
      }
    } else {
      const selectedObjs = mediaItems.filter((i) => tempMultipleIds.includes(i.id));
      if (onSelectMultiple) {
        onSelectMultiple(tempMultipleIds, selectedObjs);
      }
    }
    setIsOpen(false);
  };

  const currentSingleItem = selectedItems.find((i) => i.id === selectedMediaId);

  return (
    <div className="space-y-2">
      {/* Trigger Button */}
      {mode === "single" ? (
        <div className="flex items-center gap-3">
          {selectedMediaId && currentSingleItem ? (
            <div className="relative w-20 h-20 rounded-xl border border-slate-200 overflow-hidden bg-slate-100 flex items-center justify-center group shrink-0">
              {previewUrls[selectedMediaId] ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={previewUrls[selectedMediaId]}
                  alt={currentSingleItem.alt_text || currentSingleItem.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <FileText className="w-8 h-8 text-slate-400" />
              )}
              <button
                type="button"
                onClick={() => onSelectSingle && onSelectSingle(null)}
                className="absolute inset-0 bg-slate-900/60 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                title="Quitar selección"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <div className="w-20 h-20 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-400 shrink-0">
              <ImageIcon className="w-6 h-6 mb-1" />
              <span className="text-[10px]">Sin archivo</span>
            </div>
          )}

          <div className="flex-1 space-y-1">
            <button
              type="button"
              onClick={handleOpenModal}
              className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200 flex items-center gap-2"
            >
              <FolderKanban className="w-4 h-4 text-[#006666]" />
              <span>{buttonLabel || (selectedMediaId ? "Cambiar de la Biblioteca" : "Seleccionar de la Biblioteca")}</span>
            </button>
            {selectedMediaId && currentSingleItem && (
              <p className="text-xs text-slate-500 truncate max-w-xs font-mono">
                {currentSingleItem.original_filename}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <button
            type="button"
            onClick={handleOpenModal}
            className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200 flex items-center gap-2"
          >
            <FolderKanban className="w-4 h-4 text-[#006666]" />
            <span>
              {buttonLabel || `Seleccionar imágenes (${selectedMediaIds.length} seleccionadas)`}
            </span>
          </button>
        </div>
      )}

      {/* Selector Modal Dialog */}
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FolderKanban className="w-5 h-5 text-[#006666]" />
                <h3 className="font-bold text-slate-900 text-base">
                  Biblioteca Multimedia (media-library)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Bar */}
            <div className="p-4 border-b border-slate-100 bg-white grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar archivo por nombre..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006666]"
                />
              </div>

              {allowedType === "all" && (
                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as MediaTypeFilter)}
                  className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006666] font-medium"
                >
                  <option value="all">Todos los tipos</option>
                  <option value="image">Imágenes</option>
                  <option value="document">Documentos / Adjuntos</option>
                </select>
              )}

              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006666] font-medium"
              >
                <option value="all">Todas las categorías</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Media Grid Content */}
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 min-h-[300px]">
              {loading ? (
                <div className="p-12 text-center text-slate-500 text-sm">
                  Cargando archivos multimedia...
                </div>
              ) : mediaItems.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-sm">
                  No se encontraron archivos en la biblioteca activa.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {mediaItems.map((item) => {
                    const isImage = classifyMediaType(item.mime_type) === "image";
                    const isSelected =
                      mode === "single"
                        ? tempSingleId === item.id
                        : tempMultipleIds.includes(item.id);

                    return (
                      <div
                        key={item.id}
                        onClick={() => handleToggleSelect(item)}
                        className={`relative rounded-xl border p-2 bg-white cursor-pointer transition-all flex flex-col justify-between group ${
                          isSelected
                            ? "border-[#006666] ring-2 ring-[#006666]/30 shadow-md"
                            : "border-slate-200 hover:border-slate-300 shadow-sm"
                        }`}
                      >
                        {/* Selection Badge */}
                        <div
                          className={`absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center z-10 transition-colors ${
                            isSelected
                              ? "bg-[#006666] text-white"
                              : "bg-white/80 border border-slate-300 text-transparent"
                          }`}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>

                        {/* Thumbnail / Icon */}
                        <div className="h-28 w-full bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center mb-2">
                          {isImage && previewUrls[item.id] ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={previewUrls[item.id]}
                              alt={item.alt_text || item.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <FileText className="w-8 h-8 text-slate-400" />
                          )}
                        </div>

                        {/* Title & Info */}
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-slate-800 truncate">
                            {item.title}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono truncate">
                            {item.original_filename}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-white flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                {mode === "single"
                  ? tempSingleId
                    ? "1 elemento seleccionado"
                    : "Ningún elemento seleccionado"
                  : `${tempMultipleIds.length} elementos seleccionados`}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleApplySelection}
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#006666] hover:bg-[#004d4d] rounded-lg transition-colors shadow-sm"
                >
                  Confirmar Selección
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
