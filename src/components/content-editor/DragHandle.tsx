"use client";

import React from "react";
import { GripVertical } from "lucide-react";

interface DragHandleProps {
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}

export function DragHandle({ onDragStart, onDragEnd }: DragHandleProps) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      aria-label="Arrastrar para reordenar el bloque"
      title="Arrastrar para reordenar"
      className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white cursor-grab active:cursor-grabbing transition-colors select-none flex items-center justify-center"
    >
      <GripVertical className="w-3.5 h-3.5" />
    </div>
  );
}
