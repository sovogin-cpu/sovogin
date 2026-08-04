"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { FolderKanban, Search, X, Check, ExternalLink, Image as ImageIcon } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { createSignedMediaUrl, listMediaItems } from "@/lib/media/media-repository";
import { MediaItem } from "@/lib/media/types";
import { classifyMediaType } from "@/lib/media/file-utils";

interface DoctorProfileMediaSelectorProps {
  selectedMediaId: string | null;
  onSelectMediaId: (id: string | null) => void;
}

export const DoctorProfileMediaSelector: React.FC<DoctorProfileMediaSelectorProps> = ({
  selectedMediaId,
  onSelectMediaId,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<Record<string, string>>({});
  const [tempSelectedId, setTempSelectedId] = useState<string | null>(selectedMediaId);

  const handleOpenModal = () => {
    setTempSelectedId(selectedMediaId);
    setLoading(true);
    setIsOpen(true);
  };

  useEffect(() => {
    let isMounted = true;

    if (isOpen) {
      const supabase = createClient();
      listMediaItems(supabase, {
        status: "active",
        searchQuery,
        mediaType: "image",
      })
        .then(async (items) => {
          if (!isMounted) return;
          setMediaItems(items);

          const urlMap: Record<string, string> = {};
          for (const item of items.slice(0, 30)) {
            if (classifyMediaType(item.mime_type) === "image") {
              try {
                const signed = await createSignedMediaUrl(supabase, item.storage_path, 3600);
                urlMap[item.id] = signed;
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
          console.error("Error al cargar imágenes para perfil médico:", err);
          if (isMounted) setLoading(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen, searchQuery]);

  const handleConfirm = () => {
    onSelectMediaId(tempSelectedId);
    setIsOpen(false);
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
        Fotografía de Perfil (Media Library)
      </label>

      <div className="flex items-center gap-3">
        {selectedMediaId && previewUrls[selectedMediaId] ? (
          <div className="relative w-16 h-16 rounded-xl border border-slate-200 overflow-hidden bg-slate-100 group shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrls[selectedMediaId]}
              alt="Foto seleccionada"
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => onSelectMediaId(null)}
              className="absolute inset-0 bg-slate-900/60 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
              title="Quitar foto"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="w-16 h-16 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-400 shrink-0">
            <ImageIcon className="w-5 h-5 mb-0.5" />
            <span className="text-[9px]">Sin foto</span>
          </div>
        )}

        <div className="space-y-1">
          <button
            type="button"
            onClick={handleOpenModal}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200 flex items-center gap-1.5"
          >
            <FolderKanban className="w-3.5 h-3.5 text-[#006666]" />
            <span>{selectedMediaId ? "Cambiar Fotografía" : "Elegir de Biblioteca"}</span>
          </button>
          <Link
            href="/admin/media"
            target="_blank"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-[#006666] hover:underline"
          >
            <span>Subir nueva imagen a Biblioteca</span>
            <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Selection Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-sm">
                Seleccionar Fotografía de Perfil
              </h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar imagen por título..."
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006666]"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 min-h-[250px]">
              {loading ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  Cargando fotos de la biblioteca...
                </div>
              ) : mediaItems.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  No hay imágenes activas en la biblioteca.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {mediaItems.map((item) => {
                    const isSelected = tempSelectedId === item.id;
                    return (
                      <div
                        key={item.id}
                        onClick={() =>
                          setTempSelectedId(isSelected ? null : item.id)
                        }
                        className={`relative rounded-xl border p-2 bg-white cursor-pointer transition-all ${
                          isSelected
                            ? "border-[#006666] ring-2 ring-[#006666]/30 shadow-md"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div
                          className={`absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center z-10 ${
                            isSelected
                              ? "bg-[#006666] text-white"
                              : "bg-white/80 border border-slate-300 text-transparent"
                          }`}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                        <div className="h-24 w-full bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center mb-1">
                          {previewUrls[item.id] ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={previewUrls[item.id]}
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="w-6 h-6 text-slate-400" />
                          )}
                        </div>
                        <p className="text-[11px] font-bold text-slate-800 truncate">
                          {item.title}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 flex items-center justify-end gap-2 bg-white">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#006666] hover:bg-[#004d4d] rounded-lg shadow-sm"
              >
                Confirmar Fotografía
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
