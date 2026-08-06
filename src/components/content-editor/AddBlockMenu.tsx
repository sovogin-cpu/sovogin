"use client";

import React, { useState } from "react";
import {
  AlignLeft,
  Heading,
  Quote,
  Paperclip,
  Image as ImageIcon,
  Images,
  Video,
  LayoutTemplate,
  MousePointerClick,
  ArrowUpDown,
  Minus,
  Megaphone,
  Award,
  FormInput,
  MapPin,
  Search,
  X,
  LucideIcon,
} from "lucide-react";
import { ContentDocumentMode, ContentBlock } from "@/lib/content/types";
import { getRecommendedBlocksForMode } from "@/lib/content/content-utils";
import { ALL_BLOCK_DESCRIPTORS } from "@/lib/content/editor-utils";
import { EditorBlockCategory, EditorBlockDescriptor } from "@/lib/content/editor-types";

const ICON_MAP: Record<string, LucideIcon> = {
  AlignLeft,
  Heading,
  Quote,
  Paperclip,
  Image: ImageIcon,
  Images,
  Video,
  LayoutTemplate,
  MousePointerClick,
  ArrowUpDown,
  Minus,
  Megaphone,
  Award,
  FormInput,
  MapPin,
};

interface AddBlockMenuProps {
  mode: ContentDocumentMode;
  isOpen: boolean;
  onClose: () => void;
  onSelectBlock: (newBlock: ContentBlock) => void;
}

const CATEGORIES: EditorBlockCategory[] = ["Contenido", "Media", "Diseño", "Marketing"];

export function AddBlockMenu({
  mode,
  isOpen,
  onClose,
  onSelectBlock,
}: AddBlockMenuProps) {
  const [activeCategory, setActiveCategory] = useState<EditorBlockCategory | "Todos">("Todos");
  const [searchQuery, setSearchQuery] = useState("");

  if (!isOpen) return null;

  const recommendedTypes = getRecommendedBlocksForMode(mode);
  const availableDescriptors: EditorBlockDescriptor[] = recommendedTypes
    .map((type) => ALL_BLOCK_DESCRIPTORS[type])
    .filter((descriptor): descriptor is EditorBlockDescriptor => descriptor !== undefined);

  const filteredDescriptors = availableDescriptors.filter((descriptor) => {
    const matchesCategory =
      activeCategory === "Todos" || descriptor.category === activeCategory;
    const matchesSearch =
      searchQuery.trim() === "" ||
      descriptor.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      descriptor.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAdd = (descriptor: EditorBlockDescriptor) => {
    const newBlock = descriptor.createDefault();
    onSelectBlock(newBlock);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">
              Añadir nuevo bloque
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Selecciona un elemento para agregarlo al documento ({mode === "article" ? "Artículo" : "Página completa"})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Category Filter */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3 bg-white dark:bg-slate-900">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar tipo de bloque..."
              className="w-full pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800/70 text-slate-900 dark:text-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setActiveCategory("Todos")}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                activeCategory === "Todos"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              Todos
            </button>
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  activeCategory === cat
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Grid List */}
        <div className="p-4 overflow-y-auto flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {filteredDescriptors.length === 0 ? (
            <div className="col-span-full py-8 text-center text-slate-500 dark:text-slate-400 text-sm">
              No se encontraron bloques que coincidan con la búsqueda.
            </div>
          ) : (
            filteredDescriptors.map((descriptor) => {
              const IconComp = ICON_MAP[descriptor.iconName] || AlignLeft;
              return (
                <button
                  key={descriptor.type}
                  type="button"
                  onClick={() => handleAdd(descriptor)}
                  className="flex items-start gap-3.5 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80 hover:border-indigo-500 dark:hover:border-indigo-500 bg-white dark:bg-slate-900/60 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 text-left transition-all group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <IconComp className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                        {descriptor.label}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">
                        {descriptor.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                      {descriptor.description}
                    </p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
