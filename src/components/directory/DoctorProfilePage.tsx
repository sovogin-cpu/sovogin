import React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  UserCheck,
  Stethoscope,
  MapPin,
  Phone,
  Mail,
  Globe,
  Video,
  ShieldCheck,
  Building2,
  MessageSquare,
} from "lucide-react";
import { DoctorDirectoryProfilePublic } from "@/lib/directory/types";
import {
  buildFullLocationString,
  buildWhatsAppUrl,
  formatDoctorSpecialty,
  isSafePublicEmail,
  isSafePublicPhone,
  normalizeWebsiteUrl,
} from "@/lib/directory/directory-utils";
import { PublicMedia } from "@/components/content/public/PublicMedia";

interface DoctorProfilePageProps {
  doctor: DoctorDirectoryProfilePublic;
}

export const DoctorProfilePage: React.FC<DoctorProfilePageProps> = ({ doctor }) => {
  const safeEmail = isSafePublicEmail(doctor.public_email) ? doctor.public_email : null;
  const safePhone = isSafePublicPhone(doctor.public_phone) ? doctor.public_phone : null;
  const safeWhatsApp = buildWhatsAppUrl(doctor.whatsapp_phone);
  const safeWebsite = normalizeWebsiteUrl(doctor.website_url);
  const locationString = buildFullLocationString(doctor.city, doctor.department, doctor.country);

  const socialLinks = doctor.social_links || {};
  const knownSocialKeys = ["linkedin", "instagram", "facebook", "researchgate"] as const;

  return (
    <div className="min-h-screen bg-slate-50/50 pt-28 pb-20">
      <div className="container mx-auto px-4 max-w-4xl space-y-8">
        {/* Back Link */}
        <div>
          <Link
            href="/comunidad/directorio-medico"
            className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors shadow-xs"
          >
            <ArrowLeft className="w-4 h-4 text-[#006666]" />
            <span>Volver al Directorio Médico</span>
          </Link>
        </div>

        {/* Profile Card Header */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          {/* Photo Column */}
          <div className="md:col-span-1">
            <div className="h-64 w-full bg-slate-100 rounded-2xl overflow-hidden relative border border-slate-200 flex items-center justify-center">
              {doctor.profile_media_id ? (
                <PublicMedia
                  mediaId={doctor.profile_media_id}
                  alt={`Fotografía del Dr. ${doctor.display_name}`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#006666] to-slate-800 flex flex-col items-center justify-center p-6 text-white text-center">
                  <UserCheck className="w-12 h-12 text-emerald-300 mb-2" />
                  <span className="font-extrabold text-sm opacity-90">
                    Especialista SOVOGIN
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Details Column */}
          <div className="md:col-span-2 space-y-5">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="px-3 py-1 bg-emerald-50 text-[#006666] text-xs font-bold rounded-full border border-emerald-200">
                  Médico Asociado
                </span>

                {doctor.telemedicine_available && (
                  <span className="px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-full flex items-center gap-1 shadow-xs">
                    <Video className="w-3.5 h-3.5" />
                    <span>Telemedicina disponible</span>
                  </span>
                )}

                {doctor.is_verified && (
                  <span className="px-3 py-1 bg-teal-700 text-white text-xs font-bold rounded-full flex items-center gap-1 shadow-xs">
                    <ShieldCheck className="w-3.5 h-3.5 text-teal-200" />
                    <span>Verificado por SOVOGIN</span>
                  </span>
                )}
              </div>

              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                {doctor.display_name}
              </h1>

              <div className="flex items-center gap-2 text-sm font-bold text-[#006666] pt-1">
                <Stethoscope className="w-4 h-4" />
                <span>{formatDoctorSpecialty(doctor.specialty, doctor.subspecialty)}</span>
              </div>
            </div>

            {/* Institution & Address */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
              {doctor.clinic_name && (
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <Building2 className="w-4 h-4 text-[#006666]" />
                  <span>{doctor.clinic_name}</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <MapPin className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{locationString}</span>
              </div>

              {doctor.office_address && (
                <p className="text-xs text-slate-600 pl-6 leading-relaxed">
                  {doctor.office_address}
                </p>
              )}
            </div>

            {/* Public Contact Channels */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Contacto Profesional Público
              </h3>

              <div className="flex flex-wrap gap-3">
                {safeWhatsApp && (
                  <a
                    href={safeWhatsApp}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors shadow-xs"
                  >
                    <MessageSquare className="w-3.5 h-3.5" />
                    <span>Contactar por WhatsApp</span>
                  </a>
                )}

                {safePhone && (
                  <a
                    href={`tel:${safePhone.replace(/\s+/g, "")}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-[#006666] hover:bg-[#004d4d] text-white font-semibold text-xs rounded-xl transition-colors shadow-xs"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Llamar {safePhone}</span>
                  </a>
                )}

                {safeEmail && (
                  <a
                    href={`mailto:${safeEmail}`}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs rounded-xl transition-colors shadow-xs"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Enviar correo</span>
                  </a>
                )}

                {safeWebsite && (
                  <a
                    href={safeWebsite}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs rounded-xl border border-slate-200 transition-colors"
                  >
                    <Globe className="w-3.5 h-3.5 text-[#006666]" />
                    <span>Sitio Web Consultorio</span>
                  </a>
                )}
              </div>

              {/* Professional Social Links */}
              {knownSocialKeys.some((k) => socialLinks[k] && socialLinks[k]!.trim() !== "") && (
                <div className="pt-2 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-semibold text-slate-500 mr-1">
                    Redes Profesionales:
                  </span>
                  {knownSocialKeys.map((key) => {
                    const url = socialLinks[key];
                    if (!url || url.trim() === "") return null;
                    const safeUrl = normalizeWebsiteUrl(url);
                    if (!safeUrl) return null;

                    const labelMap: Record<string, string> = {
                      linkedin: "LinkedIn",
                      instagram: "Instagram",
                      facebook: "Facebook",
                      researchgate: "ResearchGate",
                    };

                    return (
                      <a
                        key={key}
                        href={safeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-semibold rounded-lg border border-slate-200 transition-colors capitalize"
                      >
                        {labelMap[key] || key}
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bio Section */}
        {doctor.bio && (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 shadow-sm space-y-3">
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-100 pb-2">
              Perfil Profesional y Trayectoria
            </h2>
            <p className="text-slate-700 text-sm sm:text-base leading-relaxed whitespace-pre-line">
              {doctor.bio}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
