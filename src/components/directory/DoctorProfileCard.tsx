import React from "react";
import Link from "next/link";
import { UserCheck, MapPin, Stethoscope, Video, ArrowRight, ShieldCheck, Building2 } from "lucide-react";
import { DoctorDirectoryProfilePublic } from "@/lib/directory/types";
import { buildFullLocationString, formatDoctorSpecialty } from "@/lib/directory/directory-utils";
import { PublicMedia } from "@/components/content/public/PublicMedia";

interface DoctorProfileCardProps {
  doctor: DoctorDirectoryProfilePublic;
}

export const DoctorProfileCard: React.FC<DoctorProfileCardProps> = ({ doctor }) => {
  const profileUrl = `/comunidad/directorio-medico/${doctor.slug || doctor.id}`;
  const locationString = buildFullLocationString(doctor.city, doctor.department);

  return (
    <article className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between group">
      <div>
        {/* Photo Header */}
        <div className="h-56 w-full bg-slate-100 relative overflow-hidden flex items-center justify-center">
          {doctor.profile_media_id ? (
            <PublicMedia
              mediaId={doctor.profile_media_id}
              alt={`Foto del Dr. ${doctor.display_name}`}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#006666] to-slate-800 flex flex-col items-center justify-center p-6 text-white text-center">
              <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center mb-2">
                <UserCheck className="w-10 h-10 text-emerald-300" />
              </div>
              <span className="font-extrabold text-sm opacity-90">
                SOVOGIN Especialista
              </span>
            </div>
          )}

          {/* Badges Container */}
          <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5">
            {doctor.telemedicine_available && (
              <div className="bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
                <Video className="w-3 h-3" />
                <span>Telemedicina</span>
              </div>
            )}

            {doctor.is_verified && (
              <div className="bg-teal-700 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-md flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-teal-200" />
                <span>Verificado</span>
              </div>
            )}
          </div>
        </div>

        {/* Info Content */}
        <div className="p-6 space-y-3">
          {/* Name */}
          <h3 className="font-extrabold text-slate-900 text-xl group-hover:text-[#006666] transition-colors leading-snug">
            <Link href={profileUrl}>
              {doctor.display_name}
            </Link>
          </h3>

          {/* Specialty */}
          <div className="flex items-start gap-2 text-xs font-semibold text-slate-700">
            <Stethoscope className="w-4 h-4 text-[#006666] shrink-0 mt-0.5" />
            <span>{formatDoctorSpecialty(doctor.specialty, doctor.subspecialty)}</span>
          </div>

          {/* Clinic Name if present */}
          {doctor.clinic_name && (
            <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
              <Building2 className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="truncate">{doctor.clinic_name}</span>
            </div>
          )}

          {/* City & Department */}
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
            <span>{locationString}</span>
          </div>

          {/* Bio Excerpt */}
          {doctor.bio && (
            <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed pt-1">
              {doctor.bio}
            </p>
          )}
        </div>
      </div>

      {/* Card Footer */}
      <div className="p-6 pt-0 border-t border-slate-100">
        <Link
          href={profileUrl}
          className="w-full inline-flex items-center justify-center gap-2 py-2.5 bg-slate-50 hover:bg-emerald-50 text-[#006666] font-bold text-xs rounded-xl border border-slate-200 hover:border-emerald-200 transition-colors"
        >
          <span>Ver perfil completo</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </article>
  );
};
