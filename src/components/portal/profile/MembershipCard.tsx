"use client";

import React from "react";
import { UserCheck, ShieldCheck, Mail, FileText, Award } from "lucide-react";
import { maskDocument } from "@/lib/registrations/registration-utils";

interface AssociateData {
  full_name: string;
  email: string;
  document_number?: string | null;
  specialty?: string | null;
  status: string;
  created_at?: string;
}

interface MembershipCardProps {
  associate: AssociateData;
}

export const MembershipCard: React.FC<MembershipCardProps> = ({ associate }) => {
  const maskedDoc = associate.document_number
    ? maskDocument(associate.document_number)
    : "No registrado";

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-[2rem] space-y-6 shadow-md relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-500/40 text-teal-300 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-white font-heading">
              Datos de Membresía Gremial
            </h3>
            <span className="text-xs text-slate-400">
              Información oficial no modificable registrada en el padrón SOVOGIN.
            </span>
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold rounded-full w-fit">
          <UserCheck className="w-3.5 h-3.5" />
          {associate.status}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
        {/* Nombre completo */}
        <div className="space-y-1.5 bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
          <span className="text-slate-400 font-bold block uppercase tracking-wider text-[11px]">
            Nombre Completo en Padrón
          </span>
          <span className="font-bold text-white text-sm block truncate">
            {associate.full_name}
          </span>
        </div>

        {/* Correo Electrónico Institucional */}
        <div className="space-y-1.5 bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
          <span className="text-slate-400 font-bold flex items-center gap-1 uppercase tracking-wider text-[11px]">
            <Mail className="w-3.5 h-3.5 text-teal-400" />
            Correo Registrado (Login)
          </span>
          <span className="font-bold text-slate-200 text-sm block truncate" title={associate.email}>
            {associate.email}
          </span>
        </div>

        {/* Documento de Identidad */}
        <div className="space-y-1.5 bg-slate-950/80 p-4 rounded-2xl border border-slate-800">
          <span className="text-slate-400 font-bold flex items-center gap-1 uppercase tracking-wider text-[11px]">
            <FileText className="w-3.5 h-3.5 text-teal-400" />
            Documento en Padrón
          </span>
          <span className="font-mono font-bold text-slate-200 text-sm block">
            {maskedDoc}
          </span>
        </div>

        {/* Especialidad Gremial */}
        <div className="space-y-1.5 bg-slate-950/80 p-4 rounded-2xl border border-slate-800 sm:col-span-2 lg:col-span-3">
          <span className="text-slate-400 font-bold flex items-center gap-1 uppercase tracking-wider text-[11px]">
            <Award className="w-3.5 h-3.5 text-teal-400" />
            Especialidad Gremial Registrada
          </span>
          <span className="font-bold text-white text-sm block">
            {associate.specialty || "Ginecología y Obstetricia"}
          </span>
        </div>
      </div>
    </div>
  );
};
