"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { GalleryBlock } from "@/lib/content/types";
import { MediaItem } from "@/lib/media/types";
import { BlockPropertiesProps } from "@/lib/content/editor-types";
import { PropertySection } from "./PropertySection";
import { PropertyField } from "./PropertyField";
import { MediaSelectorDialog } from "@/components/media-selector/MediaSelectorDialog";
import {
  createSignedMediaUrls,
  getSelectableMediaItemsByIds,
} from "@/lib/media/media-repository";
import { deduplicateMediaIds } from "@/lib/media/media-selector-utils";
import { ArrowUp, ArrowDown, FolderKanban, Trash2, Image as ImageIcon } from "lucide-react";

export function GalleryProperties({
  block,
  onChange,
}: BlockPropertiesProps<GalleryBlock>) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [itemsMap, setItemsMap] = useState<Record<string, MediaItem>>({});
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    let isCancelled = false;

    async function loadGallery() {
      if (block.mediaIds && block.mediaIds.length > 0) {
        const supabase = createClient();
        try {
          const items = await getSelectableMediaItemsByIds(supabase, block.mediaIds);
          if (isCancelled) return;
          const map: Record<string, MediaItem> = {};
          for (const item of items) {
            map[item.id] = item;
          }
          setItemsMap(map);

          const urls = await createSignedMediaUrls(supabase, items, 3600);
          if (!isCancelled) setSignedUrls(urls);
        } catch {
          if (!isCancelled) {
            setItemsMap({});
            setSignedUrls({});
          }
        }
      } else {
        setItemsMap({});
        setSignedUrls({});
      }
    }

    loadGallery();

    return () => {
      isCancelled = true;
    };
  }, [block.mediaIds]);

  const handleConfirmSelection = (selectedIds: string[]) => {
    const uniqueIds = deduplicateMediaIds(selectedIds);
    onChange({ ...block, mediaIds: uniqueIds });
  };

  const handleRemoveItem = (index: number) => {
    const updated = [...block.mediaIds];
    updated.splice(index, 1);
    onChange({ ...block, mediaIds: updated });
  };

  const handleMoveUp = (index: number) => {
    if (index <= 0) return;
    const updated = [...block.mediaIds];
    const [moved] = updated.splice(index, 1);
    updated.splice(index - 1, 0, moved);
    onChange({ ...block, mediaIds: updated });
  };

  const handleMoveDown = (index: number) => {
    if (index >= block.mediaIds.length - 1) return;
    const updated = [...block.mediaIds];
    const [moved] = updated.splice(index, 1);
    updated.splice(index + 1, 0, moved);
    onChange({ ...block, mediaIds: updated });
  };

  return (
    <PropertySection title="Galería de Imágenes">
      <PropertyField label="Número de Columnas">
        <select
          value={block.columns}
          onChange={(e) =>
            onChange({
              ...block,
              columns: Number(e.target.value) as 2 | 3 | 4,
            })
          }
          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
        >
          <option value={2}>2 Columnas</option>
          <option value={3}>3 Columnas</option>
          <option value={4}>4 Columnas</option>
        </select>
      </PropertyField>

      <PropertyField label="Leyenda General" description="Pie de foto descriptivo de la galería">
        <input
          type="text"
          value={block.caption || ""}
          onChange={(e) => onChange({ ...block, caption: e.target.value })}
          placeholder="Ej: Galería de fotos del evento"
          className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 outline-none"
        />
      </PropertyField>

      <PropertyField
        label={`Imágenes Seleccionadas (${block.mediaIds.length})`}
        description="Selecciona y reordena las imágenes que componen la galería"
      >
        <div className="space-y-2">
          {/* Grid list of selected items */}
          {block.mediaIds.length === 0 ? (
            <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
              No hay imágenes en la galería
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {block.mediaIds.map((id, idx) => {
                const item = itemsMap[id];
                const url = signedUrls[id];

                return (
                  <div
                    key={id}
                    className="flex items-center gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs"
                  >
                    <div className="w-10 h-10 rounded bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                      {url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={url} alt={item?.title || "Imagen"} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon className="w-5 h-5 text-slate-400" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-slate-900 dark:text-slate-100 block truncate">
                        {item ? item.title : `Imagen #${idx + 1}`}
                      </span>
                      <span className="text-[10px] text-slate-400 block truncate">
                        {item ? item.original_filename : "Cargando metadatos..."}
                      </span>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => handleMoveUp(idx)}
                        disabled={idx === 0}
                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30"
                        title="Mover arriba"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveDown(idx)}
                        disabled={idx === block.mediaIds.length - 1}
                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30"
                        title="Mover abajo"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded"
                        title="Eliminar de galería"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Trigger Button to open Modal */}
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="w-full py-2 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
          >
            <FolderKanban className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span>Gestionar Imágenes de la Galería</span>
          </button>
        </div>
      </PropertyField>

      <MediaSelectorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode="multiple"
        kind="image"
        visibilityRequirement="public"
        selectedIds={block.mediaIds}
        onConfirm={handleConfirmSelection}
        title="Seleccionar Imágenes para la Galería"
      />
    </PropertySection>
  );
}
