"use client";

import React, { useState } from "react";
import { KeyRound, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CheckInManualInputProps {
  onSubmitToken: (token: string) => void;
  loading?: boolean;
  disabled?: boolean;
}

export const CheckInManualInput: React.FC<CheckInManualInputProps> = ({
  onSubmitToken,
  loading = false,
  disabled = false,
}) => {
  const [tokenInput, setTokenInput] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim() || loading || disabled) return;
    onSubmitToken(tokenInput.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 uppercase tracking-wider">
        <KeyRound className="w-4 h-4 text-slate-500" />
        Ingreso Manual de Código
      </div>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={tokenInput}
          onChange={(e) => setTokenInput(e.target.value)}
          placeholder="Ej: SOV-CK-a1b2c3..."
          disabled={disabled || loading}
          className="flex-1 bg-white text-slate-900 font-mono text-sm px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50"
        />
        <Button
          type="submit"
          disabled={disabled || loading || !tokenInput.trim()}
          className="bg-sky-600 hover:bg-sky-700 text-white font-semibold h-auto py-3 px-6 rounded-xl flex items-center justify-center gap-2 text-base transition-colors"
        >
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              Procesar <ArrowRight className="w-5 h-5" />
            </>
          )}
        </Button>
      </div>
    </form>
  );
};
