"use client";

import React from "react";
import { Plus } from "lucide-react";
import { ContentBlockType, ContentDocumentMode } from "@/lib/content/types";
import {
  formatContentBlockType,
  getRecommendedBlocksForMode,
} from "@/lib/content/content-utils";

interface ContentBlockToolbarProps {
  documentMode: ContentDocumentMode;
  onAddBlock: (type: ContentBlockType) => void;
}

interface BlockGroup {
  title: string;
  types: ContentBlockType[];
}

export const ContentBlockToolbar: React.FC<ContentBlockToolbarProps> = ({
  documentMode,
  onAddBlock,
}) => {
  const recommendedTypes = getRecommendedBlocksForMode(documentMode);

  const blockGroups: BlockGroup[] = [
    {
      title: "Contenido Editorial",
      types: ["paragraph", "heading", "quote"],
    },
    {
      title: "Multimedia y Archivos",
      types: ["image", "gallery", "youtube", "attachment"],
    },
    {
      title: "Estructura y Diseño",
      types: ["hero", "button", "cta", "spacer", "divider"],
    },
    {
      title: "Componentes e Integraciones",
      types: ["sponsors", "form", "map"],
    },
  ];

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Agregar Bloque al Documento
        </h4>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
          Modo: {documentMode === "article" ? "Artículo" : "Página Maquetada"}
        </span>
      </div>

      <div className="space-y-4">
        {blockGroups.map((group) => (
          <div key={group.title} className="space-y-2">
            <span className="text-[11px] font-semibold text-slate-600">
              {group.title}
            </span>
            <div className="flex flex-wrap gap-2">
              {group.types.map((type) => {
                const isRecommended = recommendedTypes.includes(type);

                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => onAddBlock(type)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                      isRecommended
                        ? "bg-slate-50 hover:bg-[#006666] hover:text-white border-slate-200 text-slate-800 hover:border-[#006666] shadow-sm"
                        : "bg-white hover:bg-slate-100 border-slate-200 text-slate-600"
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{formatContentBlockType(type)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
