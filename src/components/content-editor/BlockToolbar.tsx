"use client";

import React from "react";
import {
  ArrowUp,
  ArrowDown,
  Copy,
  Trash2,
  Edit3,
  Check,
  Plus,
} from "lucide-react";
import { ContentBlockType } from "@/lib/content/types";
import { formatContentBlockType } from "@/lib/content/content-utils";

import { DragHandle } from "./DragHandle";

interface BlockToolbarProps {
  blockType: ContentBlockType;
  isEditing: boolean;
  isFirst: boolean;
  isLast: boolean;
  onToggleEdit: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onInsertAfter: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
}

export function BlockToolbar({
  blockType,
  isEditing,
  isFirst,
  isLast,
  onToggleEdit,
  onDuplicate,
  onRemove,
  onMoveUp,
  onMoveDown,
  onInsertAfter,
  onDragStart,
  onDragEnd,
}: BlockToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-slate-900/95 dark:bg-slate-900 border border-slate-700/60 rounded-lg text-white shadow-xl backdrop-blur-md text-xs select-none">
      {/* Drag Handle */}
      {onDragStart && onDragEnd && (
        <DragHandle onDragStart={onDragStart} onDragEnd={onDragEnd} />
      )}

      {/* Label */}
      <span className="font-semibold text-slate-300 tracking-wide pr-2 border-r border-slate-700">
        {formatContentBlockType(blockType)}
      </span>

      {/* Action buttons */}
      <div className="flex items-center gap-1">
        {/* Toggle Edit */}
        <button
          type="button"
          onClick={onToggleEdit}
          title={isEditing ? "Finalizar edición" : "Editar propiedades"}
          className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
            isEditing
              ? "bg-emerald-600 text-white font-medium"
              : "hover:bg-slate-800 text-slate-300 hover:text-white"
          }`}
        >
          {isEditing ? <Check className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
          <span>{isEditing ? "Listo" : "Editar"}</span>
        </button>

        {/* Move Up */}
        <button
          type="button"
          onClick={onMoveUp}
          disabled={isFirst}
          title="Mover arriba"
          className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent text-slate-300 hover:text-white transition-colors"
        >
          <ArrowUp className="w-3.5 h-3.5" />
        </button>

        {/* Move Down */}
        <button
          type="button"
          onClick={onMoveDown}
          disabled={isLast}
          title="Mover abajo"
          className="p-1 rounded hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent text-slate-300 hover:text-white transition-colors"
        >
          <ArrowDown className="w-3.5 h-3.5" />
        </button>

        {/* Insert block after */}
        <button
          type="button"
          onClick={onInsertAfter}
          title="Añadir bloque debajo"
          className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>

        {/* Duplicate */}
        <button
          type="button"
          onClick={onDuplicate}
          title="Duplicar bloque"
          className="p-1 rounded hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>

        {/* Delete */}
        <button
          type="button"
          onClick={onRemove}
          title="Eliminar bloque"
          className="p-1 rounded hover:bg-red-900/50 text-red-400 hover:text-red-300 transition-colors ml-1"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
