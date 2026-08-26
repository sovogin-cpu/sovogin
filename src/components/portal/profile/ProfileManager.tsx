"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Loader2, CheckCircle2, AlertCircle, ShieldCheck, Sparkles } from "lucide-react";
import { MembershipCard } from "./MembershipCard";
import { AvatarCard } from "./AvatarCard";
import { PublicProfileForm, ProfileFormData } from "./PublicProfileForm";
import { DirectoryCardPreview } from "./DirectoryCardPreview";

interface Associate {
  id: string;
  full_name: string;
  email: string;
  document_number?: string | null;
  specialty?: string | null;
  status: string;
  created_at?: string;
}

interface DoctorProfile {
  id: string;
  associate_id: string;
  display_name: string;
  slug?: string | null;
  specialty: string;
  subspecialty: string | null;
  country?: string | null;
  department?: string | null;
  city: string | null;
  clinic_name?: string | null;
  public_phone: string | null;
  whatsapp_phone?: string | null;
  public_email: string | null;
  office_address: string | null;
  profile_media_id: string | null;
  bio: string | null;
  website_url: string | null;
  social_links?: Record<string, string> | null;
  telemedicine_available: boolean;
  consent_given_at: string | null;
  is_published: boolean;
}

export const ProfileManager: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [associate, setAssociate] = useState<Associate | null>(null);
  const [profile, setProfile] = useState<DoctorProfile | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);

  const [alert, setAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [formData, setFormData] = useState<ProfileFormData>({
    display_name: "",
    specialty: "Ginecología y Obstetricia",
    subspecialty: "",
    country: "Colombia",
    department: "",
    city: "",
    clinic_name: "",
    public_phone: "",
    whatsapp_phone: "",
    public_email: "",
    office_address: "",
    bio: "",
    website_url: "",
    telemedicine_available: false,
    social_links: {},
    consentConfirmed: false,
    is_published: false,
  });

  const fetchProfile = useCallback(async () => {
    try {
      setLoading(true);
      setAlert(null);

      const res = await fetch("/api/portal/profile");
      const data = await res.json();

      if (!res.ok || !data.success) {
        setAlert({
          type: "error",
          message: data.error || "No se pudo cargar la información del perfil.",
        });
        return;
      }

      setAssociate(data.associate);
      setProfile(data.profile);
      setMediaUrl(data.mediaUrl || null);

      if (data.profile) {
        const p = data.profile;
        setFormData({
          display_name: p.display_name || data.associate.full_name || "",
          specialty: p.specialty || data.associate.specialty || "Ginecología y Obstetricia",
          subspecialty: p.subspecialty || "",
          country: p.country || "Colombia",
          department: p.department || "",
          city: p.city || "",
          clinic_name: p.clinic_name || "",
          public_phone: p.public_phone || "",
          whatsapp_phone: p.whatsapp_phone || "",
          public_email: p.public_email || data.associate.email || "",
          office_address: p.office_address || "",
          bio: p.bio || "",
          website_url: p.website_url || "",
          telemedicine_available: Boolean(p.telemedicine_available),
          social_links: p.social_links || {},
          consentConfirmed: Boolean(p.consent_given_at),
          is_published: Boolean(p.is_published),
        });
      } else {
        setFormData((prev) => ({
          ...prev,
          display_name: data.associate.full_name || "",
          public_email: data.associate.email || "",
          specialty: data.associate.specialty || "Ginecología y Obstetricia",
          country: "Colombia",
          city: "",
        }));
      }
    } catch (err: unknown) {
      console.error("Error al cargar perfil:", err);
      setAlert({
        type: "error",
        message: "Error de conexión al cargar la información.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAlert(null);

    if (!formData.display_name.trim()) {
      setAlert({
        type: "error",
        message: "El nombre público profesional es obligatorio.",
      });
      return;
    }

    if (formData.is_published && !formData.consentConfirmed) {
      setAlert({
        type: "error",
        message: "No se puede activar la publicación sin haber autorizado el consentimiento de datos.",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const isCreate = !profile;
      const method = isCreate ? "POST" : "PATCH";

      const payload = {
        display_name: formData.display_name,
        specialty: formData.specialty,
        subspecialty: formData.subspecialty,
        country: formData.country,
        department: formData.department,
        city: formData.city,
        clinic_name: formData.clinic_name,
        public_phone: formData.public_phone,
        whatsapp_phone: formData.whatsapp_phone,
        public_email: formData.public_email,
        office_address: formData.office_address,
        bio: formData.bio,
        website_url: formData.website_url,
        social_links: formData.social_links,
        telemedicine_available: formData.telemedicine_available,
        consentConfirmed: formData.consentConfirmed,
        is_published: formData.is_published,
      };

      const res = await fetch("/api/portal/profile", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setAlert({
          type: "error",
          message: data.error || "No se pudo guardar la información del perfil.",
        });
        return;
      }

      setProfile(data.profile);
      setAlert({
        type: "success",
        message: data.message || "¡Perfil profesional actualizado exitosamente!",
      });

      void fetchProfile();
    } catch (err: unknown) {
      console.error("Error al guardar perfil:", err);
      setAlert({
        type: "error",
        message: "Error de conexión al guardar los datos.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAvatarUpdated = (newUrl: string) => {
    setMediaUrl(newUrl);
    setAlert({
      type: "success",
      message: "Foto de perfil actualizada exitosamente.",
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-slate-300">
        <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
        <span className="text-xs font-bold uppercase tracking-wider">
          Cargando expediente e información de perfil...
        </span>
      </div>
    );
  }

  if (!associate) {
    return (
      <div className="bg-rose-500/10 border border-rose-500/30 p-8 rounded-3xl text-center space-y-3 max-w-xl mx-auto">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
        <h3 className="text-lg font-bold text-white">No se encontró expediente</h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          No fue posible localizar su expediente gremiado en el sistema SOVOGIN.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-[#006666]/30 border border-slate-800 p-6 md:p-10 rounded-[2.5rem] relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 blur-3xl rounded-full pointer-events-none" />

        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-teal-500/20 border border-teal-500/40 text-teal-300 text-xs font-bold rounded-full uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            Autogestión de Perfil de Directorio
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white font-heading">
            Mi Perfil Profesional
          </h1>
          <p className="text-slate-300 text-xs md:text-sm max-w-2xl leading-relaxed">
            Administre sus datos de difusión pública, fotografía y consentimiento de publicación en el Directorio Médico Oficial de SOVOGIN.
          </p>
        </div>
      </div>

      {/* Global Alert Notification */}
      {alert && (
        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 text-xs font-semibold shadow-md ${
            alert.type === "success"
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/15 border-rose-500/30 text-rose-300"
          }`}
        >
          {alert.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          )}
          <span>{alert.message}</span>
        </div>
      )}

      {/* SECCIÓN A: DATOS DE MEMBRESÍA GREMIAL */}
      <MembershipCard associate={associate} />

      {/* FOTO PROFESIONAL */}
      <AvatarCard
        currentMediaUrl={mediaUrl}
        associateName={associate.full_name}
        onAvatarUpdated={handleAvatarUpdated}
      />

      {/* SECCIÓN B & D: FORMULARIO PERFIL + CONSENTIMIENTO */}
      <PublicProfileForm
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
        hasProfile={Boolean(profile)}
      />

      {/* PREVISUALIZACIÓN DE LA FICHA PÚBLICA */}
      <DirectoryCardPreview
        displayName={formData.display_name}
        specialty={formData.specialty}
        subspecialty={formData.subspecialty}
        city={formData.city}
        officeAddress={formData.office_address}
        publicPhone={formData.public_phone}
        publicEmail={formData.public_email}
        websiteUrl={formData.website_url}
        bio={formData.bio}
        telemedicineAvailable={formData.telemedicine_available}
        isPublished={formData.is_published}
        consentConfirmed={formData.consentConfirmed}
        mediaUrl={mediaUrl}
      />
    </div>
  );
};
