"use client";

import React from "react";

interface DropIndicatorProps {
  position: "before" | "after" | null;
}

export function DropIndicator({ position }: DropIndicatorProps) {
  if (!position) return null;

  return (
    <div
      className={`relative z-30 pointer-events-none transition-all duration-150 ${
        position === "before" ? "-mt-2.5 mb-1" : "-mb-2.5 mt-1"
      }`}
    >
      <div className="h-1 w-full bg-gradient-to-r from-indigo-500 via-indigo-400 to-indigo-600 rounded-full shadow-lg shadow-indigo-500/40 animate-pulse flex items-center justify-between px-1">
        <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 ring-2 ring-white dark:ring-slate-900 -ml-1" />
        <div className="w-2.5 h-2.5 rounded-full bg-indigo-600 ring-2 ring-white dark:ring-slate-900 -mr-1" />
      </div>
      <span className="sr-only">
        Posición de inserción de bloque ({position === "before" ? "antes" : "después"})
      </span>
    </div>
  );
}
