"use client";

import React from "react";
import { PlusCircle, FileCode } from "lucide-react";

interface EmptyEditorProps {
  onAddFirstBlock: () => void;
}

export function EmptyEditor({ onAddFirstBlock }: EmptyEditorProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 my-6 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/40 text-center transition-colors">
      <div className="w-16 h-16 mb-4 rounded-full bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm">
        <FileCode className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-1">
        Esta página todavía no tiene contenido
      </h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mb-6">
        Comienza añadiendo el primer bloque de contenido para estructurar tu publicación o página.
      </p>
      <button
        type="button"
        onClick={onAddFirstBlock}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium text-sm transition-all shadow-md hover:shadow-indigo-500/20 cursor-pointer"
      >
        <PlusCircle className="w-4 h-4" />
        <span>Agregar primer bloque</span>
      </button>
    </div>
  );
}
