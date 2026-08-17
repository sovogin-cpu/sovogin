"use client";

import React from "react";
import {
  MapPin,
  Phone,
  Mail,
  Globe,
  Video,
  Eye,
  CheckCircle2,
  AlertCircle,
  User,
} from "lucide-react";
import { formatDoctorSpecialty, buildDoctorDisplayLocation } from "@/lib/directory/directory-utils";

interface DirectoryCardPreviewProps {
  displayName: string;
  specialty: string;
  subspecialty?: string | null;
  city?: string | null;
  officeAddress?: string | null;
  publicPhone?: string | null;
  publicEmail?: string | null;
  websiteUrl?: string | null;
  bio?: string | null;
  telemedicineAvailable: boolean;
  isPublished: boolean;
  consentConfirmed: boolean;
  mediaUrl?: string | null;
}

export const DirectoryCardPreview: React.FC<DirectoryCardPreviewProps> = ({
  displayName,
  specialty,
  subspecialty,
  city,
  officeAddress,
  publicPhone,
  publicEmail,
  websiteUrl,
  bio,
  telemedicineAvailable,
  isPublished,
  consentConfirmed,
  mediaUrl,
}) => {
  const fullSpecialty = formatDoctorSpecialty(
    specialty || "Ginecología y Obstetricia",
    subspecialty
  );

  const displayLocation = buildDoctorDisplayLocation(
    city?.trim() || "Ciudad no especificada",
    officeAddress
  );

  const canBePublic = isPublished && consentConfirmed;

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-[2rem] space-y-6 shadow-md">
      <div className="flex items-center justify-between border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 flex items-center justify-center">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-white font-heading">
              Previsualización de Ficha Pública
            </h3>
            <span className="text-xs text-slate-400">
              Así es como aparecerá su perfil profesional a pacientes y colegas en el Directorio Médico.
            </span>
          </div>
        </div>

        {canBePublic ? (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-bold rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Público en Directorio
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold rounded-full">
            <AlertCircle className="w-3.5 h-3.5" />
            No Publicado (Borrador)
          </span>
        )}
      </div>

      {/* Simulated Directory Card */}
      <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-xl mx-auto space-y-6 relative shadow-xl">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 text-center sm:text-left">
          {/* Avatar */}
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-slate-900 border-2 border-slate-800 overflow-hidden shrink-0 flex items-center justify-center shadow-md">
            {mediaUrl ? (
              <img
                src={mediaUrl}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-10 h-10 text-slate-400" />
            )}
          </div>

          <div className="space-y-1.5 flex-1 min-w-0">
            <h4 className="text-lg md:text-xl font-extrabold text-white font-heading truncate">
              {displayName || "Dr(a). Nombre Profesional"}
            </h4>

            <p className="text-xs font-bold text-teal-400 leading-tight">
              {fullSpecialty}
            </p>

            <div className="flex items-center justify-center sm:justify-start gap-1.5 text-xs text-slate-300 pt-1">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{displayLocation}</span>
            </div>
          </div>
        </div>

        {bio && bio.trim() !== "" && (
          <p className="text-xs text-slate-300 leading-relaxed border-t border-slate-900 pt-4 line-clamp-3">
            {bio}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-900">
          {publicPhone && (
            <div className="flex items-center gap-2 text-slate-200 bg-slate-900 p-2.5 rounded-xl border border-slate-800">
              <Phone className="w-3.5 h-3.5 text-teal-400" />
              <span className="truncate">{publicPhone}</span>
            </div>
          )}

          {publicEmail && (
            <div className="flex items-center gap-2 text-slate-200 bg-slate-900 p-2.5 rounded-xl border border-slate-800">
              <Mail className="w-3.5 h-3.5 text-teal-400" />
              <span className="truncate">{publicEmail}</span>
            </div>
          )}

          {websiteUrl && (
            <div className="flex items-center gap-2 text-slate-200 bg-slate-900 p-2.5 rounded-xl border border-slate-800 sm:col-span-2">
              <Globe className="w-3.5 h-3.5 text-teal-400" />
              <span className="truncate">{websiteUrl}</span>
            </div>
          )}

          {telemedicineAvailable && (
            <div className="flex items-center gap-2 text-emerald-300 bg-emerald-500/15 p-2.5 rounded-xl border border-emerald-500/30 sm:col-span-2">
              <Video className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-bold text-[11px]">Telemedicina disponible</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
