"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { MediaItem } from "@/lib/media/types";
import {
  MediaSelectorKind,
  MediaSelectorVisibilityRequirement,
} from "@/lib/media/media-selector-types";
import {
  createSignedMediaUrl,
  getSelectableMediaItemsByIds,
} from "@/lib/media/media-repository";
import { SelectedMediaPreview } from "./SelectedMediaPreview";
import { MediaSelectorDialog } from "./MediaSelectorDialog";
import { PropertyField } from "@/components/content-editor/properties/PropertyField";

interface MediaSelectorFieldProps {
  value: string | null;
  onChange: (mediaId: string | null) => void;
  kind?: MediaSelectorKind;
  visibilityRequirement?: MediaSelectorVisibilityRequirement;
  label: string;
  description?: string;
  allowClear?: boolean;
  disabled?: boolean;
}

export function MediaSelectorField({
  value,
  onChange,
  kind = "any",
  visibilityRequirement = "public",
  label,
  description,
  allowClear = true,
  disabled = false,
}: MediaSelectorFieldProps) {
  const [item, setItem] = useState<MediaItem | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | undefined>(undefined);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    let isCancelled = false;

    async function loadField() {
      if (value && value.trim() !== "") {
        const supabase = createClient();
        try {
          const items = await getSelectableMediaItemsByIds(supabase, [value]);
          if (isCancelled) return;
          if (items.length > 0) {
            const found = items[0];
            setItem(found);
            if (found.storage_path) {
              try {
                const url = await createSignedMediaUrl(supabase, found.storage_path, 3600);
                if (!isCancelled) setSignedUrl(url);
              } catch {
                // Ignore signed URL error safely
              }
            }
          } else {
            setItem(null);
            setSignedUrl(undefined);
          }
        } catch {
          if (!isCancelled) {
            setItem(null);
            setSignedUrl(undefined);
          }
        }
      } else {
        setItem(null);
        setSignedUrl(undefined);
      }
    }

    loadField();

    return () => {
      isCancelled = true;
    };
  }, [value]);

  const handleConfirmSelection = (selectedIds: string[], itemsList: MediaItem[]) => {
    if (selectedIds.length > 0) {
      onChange(selectedIds[0]);
      if (itemsList.length > 0) {
        setItem(itemsList[0]);
      }
    } else {
      onChange(null);
      setItem(null);
    }
  };

  const handleClear = () => {
    onChange(null);
    setItem(null);
    setSignedUrl(undefined);
  };

  return (
    <PropertyField label={label} description={description}>
      <SelectedMediaPreview
        item={item}
        signedUrl={signedUrl}
        onOpenSelector={() => setDialogOpen(true)}
        onClear={allowClear && value ? handleClear : undefined}
        disabled={disabled}
      />

      <MediaSelectorDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode="single"
        kind={kind}
        visibilityRequirement={visibilityRequirement}
        selectedIds={value ? [value] : []}
        onConfirm={handleConfirmSelection}
        title={`Seleccionar ${label}`}
      />
    </PropertyField>
  );
}
