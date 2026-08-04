"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { listContentCategories } from "@/lib/content/content-repository";
import { ContentCategory, ContentChannel } from "@/lib/content/types";
import { formatContentChannel } from "@/lib/content/content-utils";

interface CategorySelectorProps {
  channel: ContentChannel;
  selectedCategoryIds: string[];
  onChange: (categoryIds: string[]) => void;
}

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  channel,
  selectedCategoryIds,
  onChange,
}) => {
  const [categories, setCategories] = useState<ContentCategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    async function fetchCategories() {
      try {
        const supabase = createClient();
        const items = await listContentCategories(supabase, channel);
        if (!isCancelled) {
          setCategories(items);
          setLoading(false);
        }
      } catch (err: unknown) {
        console.error("Error cargando categorías de contenido:", err);
        if (!isCancelled) setLoading(false);
      }
    }

    fetchCategories();

    return () => {
      isCancelled = true;
    };
  }, [channel]);

  const handleToggleCategory = (catId: string) => {
    if (selectedCategoryIds.includes(catId)) {
      onChange(selectedCategoryIds.filter((id) => id !== catId));
    } else {
      onChange([...selectedCategoryIds, catId]);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
          Categorías Asignadas
        </label>
        <span className="text-[11px] text-slate-500 font-medium">
          {selectedCategoryIds.length} seleccionadas
        </span>
      </div>

      {loading ? (
        <div className="p-3 text-xs text-slate-400 bg-slate-50 rounded-lg animate-pulse">
          Cargando categorías...
        </div>
      ) : categories.length === 0 ? (
        <div className="p-3 text-xs text-slate-400 bg-slate-50 rounded-lg border border-slate-200 text-center">
          No hay categorías creadas para este canal.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-1.5 max-h-48 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200">
          {categories.map((cat) => {
            const isChecked = selectedCategoryIds.includes(cat.id);

            return (
              <label
                key={cat.id}
                className={`flex items-center justify-between p-2 rounded-lg text-xs font-medium cursor-pointer transition-colors select-none ${
                  isChecked
                    ? "bg-emerald-50 text-[#006666] border border-emerald-200/80"
                    : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-100"
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggleCategory(cat.id)}
                    className="w-3.5 h-3.5 text-[#006666] rounded border-slate-300 focus:ring-[#006666]"
                  />
                  <span>{cat.name}</span>
                </div>

                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-semibold border border-slate-200">
                  {cat.channel ? formatContentChannel(cat.channel) : "Global"}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
};
