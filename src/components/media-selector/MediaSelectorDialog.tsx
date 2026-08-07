"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { MediaCategory, MediaItem } from "@/lib/media/types";
import {
  MediaSelectorKind,
  MediaSelectorMode,
  MediaSelectorVisibilityRequirement,
} from "@/lib/media/media-selector-types";
import {
  createSignedMediaUrls,
  listMediaCategories,
  listMediaItems,
} from "@/lib/media/media-repository";
import { canSelectMediaItem, filterMediaItemsByKind } from "@/lib/media/media-selector-utils";
import { MediaSelectorFilters } from "./MediaSelectorFilters";
import { MediaSelectorGrid } from "./MediaSelectorGrid";
import { FolderKanban, X } from "lucide-react";

interface MediaSelectorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: MediaSelectorMode;
  kind?: MediaSelectorKind;
  visibilityRequirement?: MediaSelectorVisibilityRequirement;
  selectedIds?: string[];
  onConfirm: (selectedIds: string[], items: MediaItem[]) => void;
  title?: string;
}

export function MediaSelectorDialog({
  open,
  onOpenChange,
  mode = "single",
  kind = "any",
  visibilityRequirement = "public",
  selectedIds = [],
  onConfirm,
  title = "Biblioteca Multimedia",
}: MediaSelectorDialogProps) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [categories, setCategories] = useState<MediaCategory[]>([]);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [currentKind, setCurrentKind] = useState<MediaSelectorKind>(kind);

  // Selection Temp State
  const [tempSelectedIds, setTempSelectedIds] = useState<string[]>(selectedIds);
  const [prevOpen, setPrevOpen] = useState(open);

  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) {
      setTempSelectedIds(selectedIds);
      setCurrentKind(kind);
    }
  }

  useEffect(() => {
    let isCancelled = false;

    if (open) {
      async function loadData() {
        try {
          setLoading(true);
          setErrorMsg(null);
          const supabase = createClient();

          const [rawItems, catList] = await Promise.all([
            listMediaItems(supabase, {
              status: "active",
              visibility: visibilityRequirement === "public" ? "public" : "all",
              searchQuery,
              categoryId: categoryId === "all" ? undefined : categoryId,
            }),
            listMediaCategories(supabase),
          ]);

          if (isCancelled) return;

          // Apply client-side kind and visibility checks
          let filtered = rawItems.filter((i) => canSelectMediaItem(i, visibilityRequirement));
          filtered = filterMediaItemsByKind(filtered, currentKind);

          setItems(filtered);
          setCategories(catList);

          // Batch generate signed URLs for top 30 items
          const urls = await createSignedMediaUrls(supabase, filtered.slice(0, 30));
          if (!isCancelled) {
            setSignedUrls(urls);
            setLoading(false);
          }
        } catch (err: unknown) {
          if (!isCancelled) {
            const msg = err instanceof Error ? err.message : "Error al cargar la biblioteca";
            setErrorMsg(msg);
            setLoading(false);
          }
        }
      }

      loadData();
    }

    return () => {
      isCancelled = true;
    };
  }, [open, searchQuery, categoryId, currentKind, visibilityRequirement]);

  if (!open) return null;

  const handleToggleSelect = (item: MediaItem) => {
    if (mode === "single") {
      setTempSelectedIds([item.id]);
    } else {
      if (tempSelectedIds.includes(item.id)) {
        setTempSelectedIds(tempSelectedIds.filter((id) => id !== item.id));
      } else {
        setTempSelectedIds([...tempSelectedIds, item.id]);
      }
    }
  };

  const handleClearSelection = () => {
    setTempSelectedIds([]);
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setCategoryId("all");
    setCurrentKind(kind);
  };

  const handleConfirm = () => {
    const selectedObjs = items.filter((i) => tempSelectedIds.includes(i.id));
    onConfirm(tempSelectedIds, selectedObjs);
    onOpenChange(false);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                {title}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Selecciona un elemento de la biblioteca multimedia oficial
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter Bar */}
        <MediaSelectorFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          categoryId={categoryId}
          onCategoryChange={setCategoryId}
          kind={currentKind}
          onKindChange={setCurrentKind}
          categories={categories}
          allowedKind={kind}
          onResetFilters={handleResetFilters}
        />

        {/* Grid Body */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50 dark:bg-slate-950/40 min-h-[320px]">
          <MediaSelectorGrid
            items={items}
            signedUrls={signedUrls}
            selectedIds={tempSelectedIds}
            loading={loading}
            errorMsg={errorMsg}
            onToggleSelect={handleToggleSelect}
          />
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {tempSelectedIds.length} {tempSelectedIds.length === 1 ? "seleccionado" : "seleccionados"}
            </span>
            {tempSelectedIds.length > 0 && (
              <button
                type="button"
                onClick={handleClearSelection}
                className="text-xs font-semibold text-rose-600 hover:text-rose-700 underline cursor-pointer"
              >
                Limpiar selección
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-lg transition-all shadow-md cursor-pointer"
            >
              Confirmar Selección
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
