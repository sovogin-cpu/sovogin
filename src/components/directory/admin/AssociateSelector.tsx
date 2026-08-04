"use client";

import React, { useEffect, useState } from "react";
import { Search, UserCheck, AlertTriangle, Check } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { listAssociateCandidates } from "@/lib/directory/directory-repository";
import { AssociateDirectoryCandidate } from "@/lib/directory/types";

interface AssociateSelectorProps {
  selectedAssociateId: string | null;
  onSelect: (candidate: AssociateDirectoryCandidate | null) => void;
}

function maskEmail(email?: string | null): string {
  if (!email) return "";
  const parts = email.split("@");
  if (parts.length !== 2) return email;
  const name = parts[0];
  const domain = parts[1];
  const maskedName =
    name.length > 2
      ? `${name[0]}***${name[name.length - 1]}`
      : `${name[0]}*`;
  return `${maskedName}@${domain}`;
}

export const AssociateSelector: React.FC<AssociateSelectorProps> = ({
  selectedAssociateId,
  onSelect,
}) => {
  const [candidates, setCandidates] = useState<AssociateDirectoryCandidate[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    async function fetchCandidates() {
      try {
        const supabase = createClient();
        const list = await listAssociateCandidates(supabase, searchQuery);
        if (!isCancelled) {
          setCandidates(list);
          setLoading(false);
        }
      } catch (err: unknown) {
        console.error("Error al cargar lista de asociados candidatos:", err);
        if (!isCancelled) setLoading(false);
      }
    }

    fetchCandidates();

    return () => {
      isCancelled = true;
    };
  }, [searchQuery]);

  const selectedObj = candidates.find((c) => c.id === selectedAssociateId);

  return (
    <div className="space-y-3">
      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
        Vincular Médico Asociado <span className="text-rose-500">*</span>
      </label>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Buscar asociado por nombre o correo..."
          className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006666] font-medium"
        />
      </div>

      {/* Candidate List */}
      <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/50 p-1">
        {loading ? (
          <div className="p-4 text-center text-xs text-slate-400">
            Cargando asociados disponibles...
          </div>
        ) : candidates.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-400">
            No hay asociados disponibles que no tengan perfil.
          </div>
        ) : (
          candidates.map((c) => {
            const isSelected = selectedAssociateId === c.id;
            const isActiveStatus = c.status === "Activo";

            return (
              <div
                key={c.id}
                onClick={() => onSelect(isSelected ? null : c)}
                className={`p-2.5 rounded-lg cursor-pointer transition-all flex items-center justify-between gap-2 select-none ${
                  isSelected
                    ? "bg-emerald-50 border border-emerald-200 text-[#006666]"
                    : "bg-white hover:bg-slate-100 text-slate-800"
                }`}
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs truncate">
                      {c.full_name}
                    </span>
                    {!isActiveStatus && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        <AlertTriangle className="w-3 h-3" />
                        {c.status || "Inactivo"}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono truncate">
                    <span>{c.specialty || "Ginecología y Obstetricia"}</span>
                    <span>•</span>
                    <span>{maskEmail(c.email)}</span>
                  </div>
                </div>

                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                    isSelected
                      ? "bg-[#006666] text-white"
                      : "border border-slate-300 text-transparent"
                  }`}
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {selectedObj && (
        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs font-semibold text-[#006666] flex items-center gap-2">
          <UserCheck className="w-4 h-4 shrink-0" />
          <span>Vincular con: {selectedObj.full_name}</span>
        </div>
      )}
    </div>
  );
};
