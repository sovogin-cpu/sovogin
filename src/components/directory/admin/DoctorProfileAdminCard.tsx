"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  UserCheck,
  Edit2,
  ExternalLink,
  ShieldCheck,
  Video,
  Eye,
  EyeOff,
  MapPin,
  Stethoscope,
} from "lucide-react";
import { DoctorDirectoryAdminProfile } from "@/lib/directory/types";
import { createClient } from "@/utils/supabase/client";
import { createSignedMediaUrl } from "@/lib/media/media-repository";

interface DoctorProfileAdminCardProps {
  doctor: DoctorDirectoryAdminProfile;
  onEdit: (doctor: DoctorDirectoryAdminProfile) => void;
  onTogglePublish: (doctor: DoctorDirectoryAdminProfile) => Promise<void>;
}

export const DoctorProfileAdminCard: React.FC<DoctorProfileAdminCardProps> = ({
  doctor,
  onEdit,
  onTogglePublish,
}) => {
  const [signedPhotoUrl, setSignedPhotoUrl] = useState<string | null>(null);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    let isMounted = true;
    if (doctor.profile_media_id) {
      const supabase = createClient();
      supabase
        .from("media_items")
        .select("storage_path")
        .eq("id", doctor.profile_media_id)
        .maybeSingle()
        .then(async ({ data }) => {
          if (data?.storage_path && isMounted) {
            try {
              const url = await createSignedMediaUrl(supabase, data.storage_path, 3600);
              if (isMounted) setSignedPhotoUrl(url);
            } catch {
              // Ignore
            }
          }
        });
    }
    return () => {
      isMounted = false;
    };
  }, [doctor.profile_media_id]);

  const handleToggle = async () => {
    try {
      setIsToggling(true);
      await onTogglePublish(doctor);
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 hover:border-slate-300 transition-all flex flex-col justify-between">
      <div className="space-y-3">
        {/* Header Info */}
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
            {signedPhotoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={signedPhotoUrl}
                alt={doctor.display_name}
                className="w-full h-full object-cover"
              />
            ) : (
              <UserCheck className="w-8 h-8 text-slate-400" />
            )}
          </div>

          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-slate-900 text-base truncate">
                {doctor.display_name}
              </h3>
              <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                #{doctor.display_order}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
              <Stethoscope className="w-3.5 h-3.5 text-[#006666] shrink-0" />
              <span className="truncate">{doctor.specialty}</span>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
              <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="truncate">{doctor.city}</span>
            </div>
          </div>
        </div>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {doctor.is_published ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <Eye className="w-3 h-3" />
              Publicado
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
              <EyeOff className="w-3 h-3" />
              No Publicado
            </span>
          )}

          {doctor.consent_given_at ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              <ShieldCheck className="w-3 h-3 text-[#006666]" />
              Consentimiento OK
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
              Sin Consentimiento
            </span>
          )}

          {doctor.telemedicine_available && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <Video className="w-3 h-3 text-emerald-600" />
              Telemedicina
            </span>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onEdit(doctor)}
          className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1"
        >
          <Edit2 className="w-3.5 h-3.5 text-[#006666]" />
          <span>Editar</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isToggling}
            onClick={handleToggle}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
              doctor.is_published
                ? "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
                : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
            }`}
          >
            {isToggling
              ? "Procesando..."
              : doctor.is_published
              ? "Despublicar"
              : "Publicar"}
          </button>

          {doctor.is_published && (
            <Link
              href={`/comunidad/directorio-medico/${doctor.id}`}
              target="_blank"
              className="p-1.5 text-slate-500 hover:text-[#006666] bg-slate-100 hover:bg-emerald-50 rounded-lg border border-slate-200"
              title="Ver perfil público"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};
