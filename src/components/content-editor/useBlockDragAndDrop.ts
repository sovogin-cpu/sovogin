"use client";

import React, { useState } from "react";
import { BlockDragState } from "@/lib/content/editor-types";

interface UseBlockDragAndDropProps {
  onReorder: (sourceIndex: number, destinationIndex: number) => void;
}

export function useBlockDragAndDrop({ onReorder }: UseBlockDragAndDropProps) {
  const [dragState, setDragState] = useState<BlockDragState>({
    draggedBlockId: null,
    sourceIndex: null,
    targetIndex: null,
    position: null,
  });

  const handleDragStart = (
    id: string,
    index: number,
    e: React.DragEvent
  ) => {
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);

    setDragState({
      draggedBlockId: id,
      sourceIndex: index,
      targetIndex: index,
      position: null,
    });
  };

  const handleDragOver = (
    id: string,
    index: number,
    e: React.DragEvent
  ) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";

    if (!dragState.draggedBlockId || dragState.draggedBlockId === id) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const position: "before" | "after" = e.clientY < midY ? "before" : "after";

    if (
      dragState.targetIndex !== index ||
      dragState.position !== position
    ) {
      setDragState((prev) => ({
        ...prev,
        targetIndex: index,
        position,
      }));
    }
  };

  const handleDragLeave = () => {
    // Keep state until another element enters or drag finishes
  };

  const handleDrop = (id: string, targetIdx: number, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (
      dragState.sourceIndex === null ||
      dragState.draggedBlockId === null
    ) {
      handleDragEnd();
      return;
    }

    const srcIdx = dragState.sourceIndex;
    let destIdx = targetIdx;

    if (dragState.position === "after") {
      destIdx = targetIdx > srcIdx ? targetIdx : targetIdx + 1;
    } else {
      destIdx = targetIdx < srcIdx ? targetIdx : targetIdx;
    }

    if (srcIdx !== destIdx) {
      onReorder(srcIdx, destIdx);
    }

    handleDragEnd();
  };

  const handleDragEnd = () => {
    setDragState({
      draggedBlockId: null,
      sourceIndex: null,
      targetIndex: null,
      position: null,
    });
  };

  return {
    dragState,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
  };
}
