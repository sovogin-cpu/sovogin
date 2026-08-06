"use client";

import React from "react";
import { ContentBlock } from "@/lib/content/types";
import { BlockToolbar } from "./BlockToolbar";
import { BlockRenderer } from "./BlockRenderer";

interface BlockContainerProps {
  block: ContentBlock;
  isSelected: boolean;
  isEditing: boolean;
  isFirst: boolean;
  isLast: boolean;
  onSelect: () => void;
  onToggleEdit: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onInsertAfter: () => void;
  onChange: (updatedBlock: ContentBlock) => void;
}

export function BlockContainer({
  block,
  isSelected,
  isEditing,
  isFirst,
  isLast,
  onSelect,
  onToggleEdit,
  onDuplicate,
  onRemove,
  onMoveUp,
  onMoveDown,
  onInsertAfter,
  onChange,
}: BlockContainerProps) {
  return (
    <div
      onClick={onSelect}
      className={`group relative rounded-xl transition-all duration-150 p-4 bg-white dark:bg-slate-900 border-2 cursor-pointer ${
        isEditing
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
        />
      </div>

      {/* Block Content */}
      <div className="relative z-10">
        <BlockRenderer
          block={block}
          isEditing={isEditing}
          onChange={onChange}
        />
      </div>
    </div>
  );
}
