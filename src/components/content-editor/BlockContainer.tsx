"use client";

import React from "react";
import { ContentBlock } from "@/lib/content/types";
import { BlockToolbar } from "./BlockToolbar";
import { BlockRenderer } from "./BlockRenderer";
import { DropIndicator } from "./DropIndicator";

interface BlockContainerProps {
  block: ContentBlock;
  isSelected: boolean;
  isEditing: boolean;
  isFirst: boolean;
  isLast: boolean;
  isDragged?: boolean;
  dropPosition?: "before" | "after" | null;
  onSelect: () => void;
  onToggleEdit: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onInsertAfter: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: () => void;
  onDrop?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onChange: (updatedBlock: ContentBlock) => void;
}

export function BlockContainer({
  block,
  isSelected,
  isEditing,
  isFirst,
  isLast,
  isDragged = false,
  dropPosition = null,
  onSelect,
  onToggleEdit,
  onDuplicate,
  onRemove,
  onMoveUp,
  onMoveDown,
  onInsertAfter,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onChange,
}: BlockContainerProps) {
  return (
    <div className="relative my-2">
      {/* Drop Indicator (Before) */}
      {dropPosition === "before" && <DropIndicator position="before" />}

      <div
        onClick={onSelect}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`group relative rounded-xl transition-all duration-150 p-4 bg-white dark:bg-slate-900 border-2 cursor-pointer ${
          isDragged
            ? "opacity-30 border-dashed border-indigo-400 scale-[0.99]"
            : isEditing
            ? "border-indigo-600 dark:border-indigo-500 ring-4 ring-indigo-500/15 shadow-xl"
            : isSelected
            ? "border-indigo-400 dark:border-indigo-600 ring-2 ring-indigo-500/10 shadow-md"
            : "border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm"
        }`}
      >
        {/* Contextual Toolbar */}
        <div
          className={`absolute -top-4 right-4 z-20 transition-opacity duration-150 ${
            isSelected || isEditing
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 group-hover:opacity-100 pointer-events-auto"
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          <BlockToolbar
            blockType={block.type}
            isEditing={isEditing}
            isFirst={isFirst}
            isLast={isLast}
            onToggleEdit={onToggleEdit}
            onDuplicate={onDuplicate}
            onRemove={onRemove}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            onInsertAfter={onInsertAfter}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        </div>

        {/* Layout Indicators */}
        {block.layout && (
          <div className="absolute top-2 left-4 z-10 flex flex-wrap items-center gap-1.5 pointer-events-none">
            {block.layout.width === "full" && (
              <span className="px-1.5 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[9px] font-bold uppercase tracking-wider">
                100% Ancho
              </span>
            )}
            {block.layout.background && block.layout.background.type !== "none" && (
              <span className="px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-[9px] font-bold uppercase tracking-wider">
                Fondo: {block.layout.background.type}
              </span>
            )}
            {block.layout.responsive &&
              (block.layout.responsive.hideOnMobile ||
                block.layout.responsive.hideOnTablet ||
                block.layout.responsive.hideOnDesktop) && (
                <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 text-[9px] font-bold uppercase tracking-wider">
                  Responsive
                </span>
              )}
            {block.layout.visibility && block.layout.visibility.mode !== "always" && (
              <span className="px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 text-[9px] font-bold uppercase tracking-wider">
                {block.layout.visibility.mode === "members_only"
                  ? "Asociados"
                  : "Público"}
              </span>
            )}
          </div>
        )}

        {/* Block Content */}
        <div className="relative z-10">
          <BlockRenderer
            block={block}
            isEditing={isEditing}
            onChange={onChange}
          />
        </div>
      </div>

      {/* Drop Indicator (After) */}
      {dropPosition === "after" && <DropIndicator position="after" />}
    </div>
  );
}
