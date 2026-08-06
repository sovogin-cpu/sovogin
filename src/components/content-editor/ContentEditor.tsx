"use client";

import React, { useState } from "react";
import { ContentBlock, ContentDocumentMode } from "@/lib/content/types";
import {
  duplicateBlock,
  insertBlockAfter,
  insertBlockAtEnd,
  moveBlockDown,
  moveBlockUp,
  removeBlock,
} from "@/lib/content/editor-utils";
import { EmptyEditor } from "./EmptyEditor";
import { BlockContainer } from "./BlockContainer";
import { AddBlockMenu } from "./AddBlockMenu";
import { BlockPropertiesPanel } from "./BlockPropertiesPanel";
import { PlusCircle } from "lucide-react";

interface ContentEditorProps {
  blocks: ContentBlock[];
  onChange: (updatedBlocks: ContentBlock[]) => void;
  mode?: ContentDocumentMode;
}

export function ContentEditor({
  blocks = [],
  onChange,
  mode = "article",
}: ContentEditorProps) {
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);

  // State for Add Block Modal
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [targetInsertBlockId, setTargetInsertBlockId] = useState<string | undefined>(undefined);

  const activeEditingBlock =
    editingBlockId !== null
      ? blocks.find((block) => block.id === editingBlockId) || null
      : null;

  const handleOpenAddMenu = (targetId?: string) => {
    setTargetInsertBlockId(targetId);
    setIsAddMenuOpen(true);
  };

  const handleCloseAddMenu = () => {
    setIsAddMenuOpen(false);
    setTargetInsertBlockId(undefined);
  };

  const handleSelectBlock = (id: string) => {
    setSelectedBlockId(id);
  };

  const handleToggleEdit = (id: string) => {
    if (editingBlockId === id) {
      setEditingBlockId(null);
    } else {
      setEditingBlockId(id);
      setSelectedBlockId(id);
    }
  };

  const handleClosePanel = () => {
    setEditingBlockId(null);
  };

  const handleDuplicate = (id: string) => {
    const updated = duplicateBlock(blocks, id);
    onChange(updated);
  };

  const handleRemove = (id: string) => {
    const updated = removeBlock(blocks, id);
    if (selectedBlockId === id) setSelectedBlockId(null);
    if (editingBlockId === id) setEditingBlockId(null);
    onChange(updated);
  };

  const handleMoveUp = (id: string) => {
    const updated = moveBlockUp(blocks, id);
    onChange(updated);
  };

  const handleMoveDown = (id: string) => {
    const updated = moveBlockDown(blocks, id);
    onChange(updated);
  };

  const handleUpdateBlock = (updatedBlock: ContentBlock) => {
    const nextBlocks = blocks.map((b) => (b.id === updatedBlock.id ? updatedBlock : b));
    onChange(nextBlocks);
  };

  const handleAddBlockConfirmed = (newBlock: ContentBlock) => {
    let updated: ContentBlock[];
    if (targetInsertBlockId) {
      updated = insertBlockAfter(blocks, targetInsertBlockId, newBlock);
    } else {
      updated = insertBlockAtEnd(blocks, newBlock);
    }
    onChange(updated);
    setSelectedBlockId(newBlock.id);
    setEditingBlockId(newBlock.id);
  };

  if (blocks.length === 0) {
    return (
      <div className="w-full">
        <EmptyEditor onAddFirstBlock={() => handleOpenAddMenu()} />
        <AddBlockMenu
          mode={mode}
          isOpen={isAddMenuOpen}
          onClose={handleCloseAddMenu}
          onSelectBlock={handleAddBlockConfirmed}
        />
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col lg:flex-row gap-6 items-start">
      {/* Main Canvas Area */}
      <div className="flex-1 min-w-0 w-full space-y-4">
        {/* List of blocks */}
        <div className="space-y-4">
          {blocks.map((block, index) => {
            const isSelected = selectedBlockId === block.id;
            const isEditing = editingBlockId === block.id;

            return (
              <BlockContainer
                key={block.id}
                block={block}
                isSelected={isSelected}
                isEditing={isEditing}
                isFirst={index === 0}
                isLast={index === blocks.length - 1}
                onSelect={() => handleSelectBlock(block.id)}
                onToggleEdit={() => handleToggleEdit(block.id)}
                onDuplicate={() => handleDuplicate(block.id)}
                onRemove={() => handleRemove(block.id)}
                onMoveUp={() => handleMoveUp(block.id)}
                onMoveDown={() => handleMoveDown(block.id)}
                onInsertAfter={() => handleOpenAddMenu(block.id)}
                onChange={handleUpdateBlock}
              />
            );
          })}
        </div>

        {/* Add block button at the bottom */}
        <div className="pt-2 flex justify-center">
          <button
            type="button"
            onClick={() => handleOpenAddMenu()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 bg-white/50 dark:bg-slate-900/50 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium text-xs transition-all shadow-sm cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 text-indigo-500" />
            <span>Añadir bloque al final</span>
          </button>
        </div>
      </div>

      {/* Side Properties Panel (Desktop: Sidebar, Mobile: Fixed/Drawer) */}
      {activeEditingBlock && (
        <div className="w-full lg:w-auto lg:sticky lg:top-4 z-30">
          <BlockPropertiesPanel
            block={activeEditingBlock}
            onChange={handleUpdateBlock}
            onClose={handleClosePanel}
            mode={mode}
          />
        </div>
      )}

      {/* Modal AddBlockMenu */}
      <AddBlockMenu
        mode={mode}
        isOpen={isAddMenuOpen}
        onClose={handleCloseAddMenu}
        onSelectBlock={handleAddBlockConfirmed}
      />
    </div>
  );
}
