"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { MediaItem } from "@/lib/media/types";
import { MediaSelectorDialog } from "@/components/media-selector/MediaSelectorDialog";
import { SelectedMediaPreview } from "@/components/media-selector/SelectedMediaPreview";
import {
  createSignedMediaUrl,
  getSelectableMediaItemsByIds,
} from "@/lib/media/media-repository";
import { FolderKanban } from "lucide-react";

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
  allowedType = "image",
  buttonLabel = "Seleccionar portada",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [singleItem, setSingleItem] = useState<MediaItem | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | undefined>(undefined);

  useEffect(() => {
    let isCancelled = false;

    async function loadFeatured() {
      if (mode === "single" && selectedMediaId) {
        const supabase = createClient();
        try {
          const items = await getSelectableMediaItemsByIds(supabase, [selectedMediaId]);
          if (isCancelled) return;
          if (items.length > 0) {
            const found = items[0];
            setSingleItem(found);
            if (found.storage_path) {
              try {
                const url = await createSignedMediaUrl(supabase, found.storage_path, 3600);
                if (!isCancelled) setSignedUrl(url);
              } catch {
                // Ignore signed url error
              }
            }
          } else {
            setSingleItem(null);
            setSignedUrl(undefined);
          }
        } catch {
          if (!isCancelled) {
            setSingleItem(null);
            setSignedUrl(undefined);
          }
        }
      } else {
        setSingleItem(null);
        setSignedUrl(undefined);
      }
    }

    loadFeatured();

    return () => {
      isCancelled = true;
    };
  }, [mode, selectedMediaId]);

  const handleConfirm = (selectedIds: string[], items: MediaItem[]) => {
    if (mode === "single") {
      const chosenId = selectedIds.length > 0 ? selectedIds[0] : null;
      const chosenObj = items.length > 0 ? items[0] : undefined;
      if (onSelectSingle) onSelectSingle(chosenId, chosenObj);
    } else {
      if (onSelectMultiple) onSelectMultiple(selectedIds, items);
    }
  };

  const kindParam = allowedType === "document" ? "document" : allowedType === "image" ? "image" : "any";

  if (mode === "multiple") {
    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors border border-slate-200 dark:border-slate-700 flex items-center gap-2 cursor-pointer"
        >
          <FolderKanban className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          <span>
            {buttonLabel || `Seleccionar imágenes (${selectedMediaIds.length} seleccionadas)`}
          </span>
        </button>

        <MediaSelectorDialog
          open={isOpen}
          onOpenChange={setIsOpen}
          mode="multiple"
          kind={kindParam}
          visibilityRequirement="public"
          selectedIds={selectedMediaIds}
          onConfirm={handleConfirm}
          title="Biblioteca Multimedia"
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <SelectedMediaPreview
        item={singleItem}
        signedUrl={signedUrl}
        onOpenSelector={() => setIsOpen(true)}
        onClear={selectedMediaId && onSelectSingle ? () => onSelectSingle(null) : undefined}
      />

      <MediaSelectorDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        mode="single"
        kind={kindParam}
        visibilityRequirement="public"
        selectedIds={selectedMediaId ? [selectedMediaId] : []}
        onConfirm={handleConfirm}
        title="Seleccionar Imagen Destacada"
      />
    </div>
  );
};
