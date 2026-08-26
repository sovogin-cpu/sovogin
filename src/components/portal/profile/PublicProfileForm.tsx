"use client";

import React from "react";
import {
  User,
  Award,
  MapPin,
  Phone,
  Mail,
  Globe,
  FileText,
  Video,
  ShieldCheck,
  Globe2,
  Loader2,
  Save,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface DoctorSocialLinksForm {
  linkedin?: string;
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  researchgate?: string;
}

export interface ProfileFormData {
  display_name: string;
  specialty: string;
  subspecialty: string;
  country: string;
  department: string;
  city: string;
  clinic_name: string;
  office_address: string;
  public_phone: string;
  whatsapp_phone: string;
  public_email: string;
  website_url: string;
  bio: string;
  telemedicine_available: boolean;
  social_links: DoctorSocialLinksForm;
  consentConfirmed: boolean;
  is_published: boolean;
}

interface PublicProfileFormProps {
  formData: ProfileFormData;
  setFormData: React.Dispatch<React.SetStateAction<ProfileFormData>>;
  onSubmit: (e: React.FormEvent) => void;
  isSubmitting: boolean;
  hasProfile: boolean;
}

export const PublicProfileForm: React.FC<PublicProfileFormProps> = ({
  formData,
  setFormData,
  onSubmit,
  isSubmitting,
  hasProfile,
}) => {
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;

    if (name.startsWith("social_")) {
      const socialKey = name.replace("social_", "");
      setFormData((prev) => ({
        ...prev,
        social_links: {
          ...prev.social_links,
          [socialKey]: value,
        },
      }));
      return;
    }

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => {
        const next = { ...prev, [name]: checked };

        if (name === "consentConfirmed" && !checked) {
          next.is_published = false;
        }
        return next;
      });
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-8">
      {/* SECCIÓN B: PERFIL PROFESIONAL PÚBLICO */}
      <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-[2rem] space-y-6 shadow-md">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-5">
          <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-500/40 text-teal-300 flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-white font-heading">
              Información Profesional Pública
            </h3>
            <span className="text-xs text-slate-400">
              Datos de contacto y presentación profesional para difusión en el Directorio Médico.
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* Nombre público */}
          <div className="space-y-2 md:col-span-2">
            <Label className="text-slate-200 font-bold flex items-center gap-1.5 text-xs">
              <User className="w-3.5 h-3.5 text-teal-400" />
              Nombre Público Profesional *
            </Label>
            <Input
              name="display_name"
              value={formData.display_name}
              onChange={handleChange}
              placeholder="Ej. Dra. María Fernanda Pérez"
              required
              className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-400 rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-xs h-11"
            />
            <span className="text-xs text-slate-400">
              Nombre exacto con el que desea figurar en la tarjeta del directorio.
            </span>
          </div>

          {/* Especialidad pública */}
          <div className="space-y-2">
            <Label className="text-slate-200 font-bold flex items-center gap-1.5 text-xs">
              <Award className="w-3.5 h-3.5 text-teal-400" />
              Especialidad Principal *
            </Label>
            <Input
              name="specialty"
              value={formData.specialty}
              onChange={handleChange}
              placeholder="Ej. Ginecología y Obstetricia"
              required
              className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-400 rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-xs h-11"
            />
          </div>

          {/* Subespecialidad */}
          <div className="space-y-2">
            <Label className="text-slate-200 font-bold flex items-center gap-1.5 text-xs">
              <Award className="w-3.5 h-3.5 text-slate-400" />
              Subespecialidad / Fellow (Opcional)
            </Label>
            <Input
              name="subspecialty"
              value={formData.subspecialty}
              onChange={handleChange}
              placeholder="Ej. Ginecología Oncológica, Medicina Materno Fetal"
              className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-400 rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-xs h-11"
            />
          </div>

          {/* Clínica / Institución */}
          <div className="space-y-2 md:col-span-2">
            <Label className="text-slate-200 font-bold flex items-center gap-1.5 text-xs">
              <MapPin className="w-3.5 h-3.5 text-teal-400" />
              Nombre de la Clínica, Centro Médico u Hospital (Opcional)
            </Label>
            <Input
              name="clinic_name"
              value={formData.clinic_name}
              onChange={handleChange}
              placeholder="Ej. Centro Médico Imbanaco, Fundación Valle del Lili"
              className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-400 rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-xs h-11"
            />
          </div>

          {/* Ciudad */}
          <div className="space-y-2">
            <Label className="text-slate-200 font-bold flex items-center gap-1.5 text-xs">
              <MapPin className="w-3.5 h-3.5 text-teal-400" />
              Ciudad de Ejercicio Profesional
            </Label>
            <Input
              name="city"
              value={formData.city}
              onChange={handleChange}
              placeholder="Ej. Cali, Palmira, Bogotá, Medellín"
              className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-400 rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-xs h-11"
            />
          </div>

          {/* Departamento */}
          <div className="space-y-2">
            <Label className="text-slate-200 font-bold flex items-center gap-1.5 text-xs">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              Departamento / Estado (Opcional)
            </Label>
            <Input
              name="department"
              value={formData.department}
              onChange={handleChange}
              placeholder="Ej. Valle del Cauca, Cundinamarca, Antioquia"
              className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-400 rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-xs h-11"
            />
          </div>

          {/* País */}
          <div className="space-y-2 md:col-span-2">
            <Label className="text-slate-200 font-bold flex items-center gap-1.5 text-xs">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              País
            </Label>
            <Input
              name="country"
              value={formData.country}
              onChange={handleChange}
              placeholder="Ej. Colombia"
              className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-400 rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-xs h-11"
            />
          </div>

          {/* WhatsApp Profesional */}
          <div className="space-y-2">
            <Label className="text-slate-200 font-bold flex items-center gap-1.5 text-xs">
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              WhatsApp Profesional
            </Label>
            <Input
              name="whatsapp_phone"
              value={formData.whatsapp_phone}
              onChange={handleChange}
              placeholder="Ej. +57 300 123 4567"
              className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-400 rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-xs h-11"
            />
            <span className="text-[11px] text-emerald-400 font-medium block">
              Este número podrá mostrarse públicamente en el Directorio Médico para contacto directo.
            </span>
          </div>

          {/* Teléfono público */}
          <div className="space-y-2">
            <Label className="text-slate-200 font-bold flex items-center gap-1.5 text-xs">
              <Phone className="w-3.5 h-3.5 text-teal-400" />
              Teléfono Público de Consultorio
            </Label>
            <Input
              name="public_phone"
              value={formData.public_phone}
              onChange={handleChange}
              placeholder="Ej. +57 602 555 1234"
              className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-400 rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-xs h-11"
            />
            <span className="text-[11px] text-slate-400 block">
              Este número será visible públicamente.
            </span>
          </div>

          {/* Correo público */}
          <div className="space-y-2">
            <Label className="text-slate-200 font-bold flex items-center gap-1.5 text-xs">
              <Mail className="w-3.5 h-3.5 text-teal-400" />
              Correo Electrónico Público
            </Label>
            <Input
              type="email"
              name="public_email"
              value={formData.public_email}
              onChange={handleChange}
              placeholder="Ej. citas@doctoramariaperez.com"
              className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-400 rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-xs h-11"
            />
            <span className="text-[11px] text-slate-400 block">
              Este correo será visible públicamente para consultas de pacientes.
            </span>
          </div>

          {/* Sitio Web */}
          <div className="space-y-2">
            <Label className="text-slate-200 font-bold flex items-center gap-1.5 text-xs">
              <Globe className="w-3.5 h-3.5 text-teal-400" />
              Sitio Web Profesional
            </Label>
            <Input
              name="website_url"
              value={formData.website_url}
              onChange={handleChange}
              placeholder="Ej. https://www.doctoramariaperez.com"
              className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-400 rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-xs h-11"
            />
          </div>

          {/* Dirección de Consultorio */}
          <div className="space-y-2 md:col-span-2">
            <Label className="text-slate-200 font-bold flex items-center gap-1.5 text-xs">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              Dirección Física de Consultorio / Oficina
            </Label>
            <Input
              name="office_address"
              value={formData.office_address}
              onChange={handleChange}
              placeholder="Ej. Calle 5 # 38-25, Torre A, Consultorio 402"
              className="bg-slate-950 border-slate-800 text-white placeholder:text-slate-400 rounded-xl focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-xs h-11"
            />
            <span className="text-[11px] text-slate-400 block">
              Esta dirección será visible públicamente para ubicar su consultorio.
            </span>
          </div>

          {/* Redes Sociales Profesionales Sub-form */}
          <div className="space-y-4 md:col-span-2 bg-slate-950 p-5 rounded-2xl border border-slate-800">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Globe className="w-4 h-4 text-teal-400" />
              Redes Sociales Profesionales (Opcionales)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-[11px] font-semibold">LinkedIn</Label>
                <Input
                  name="social_linkedin"
                  value={formData.social_links.linkedin || ""}
                  onChange={handleChange}
                  placeholder="https://linkedin.com/in/perfil"
                  className="bg-slate-900 border-slate-800 text-white text-xs h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-[11px] font-semibold">Instagram</Label>
                <Input
                  name="social_instagram"
                  value={formData.social_links.instagram || ""}
                  onChange={handleChange}
                  placeholder="https://instagram.com/perfil"
                  className="bg-slate-900 border-slate-800 text-white text-xs h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-[11px] font-semibold">Facebook</Label>
                <Input
                  name="social_facebook"
                  value={formData.social_links.facebook || ""}
                  onChange={handleChange}
                  placeholder="https://facebook.com/perfil"
                  className="bg-slate-900 border-slate-800 text-white text-xs h-10"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-[11px] font-semibold">TikTok</Label>
                <Input
                  name="social_tiktok"
                  value={formData.social_links.tiktok || ""}
                  onChange={handleChange}
                  placeholder="https://www.tiktok.com/@usuario"
                  className="bg-slate-900 border-slate-800 text-white text-xs h-10"
                />
              </div>
            </div>
          </div>

          {/* Reseña Bio */}
          <div className="space-y-2 md:col-span-2">
            <Label className="text-slate-200 font-bold flex items-center gap-1.5 text-xs">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              Reseña Curricular / Perfil Profesional (Bio)
            </Label>
            <textarea
              name="bio"
              value={formData.bio}
              onChange={handleChange}
              rows={4}
              placeholder="Breve resumen de su formación académica, áreas de enfoque clínico y experiencia profesional..."
              className="w-full bg-slate-950 border border-slate-800 text-white placeholder:text-slate-400 rounded-xl p-3 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 text-xs leading-relaxed custom-scrollbar"
            />
          </div>

          {/* Checkbox Telemedicina */}
          <div className="md:col-span-2 bg-slate-950 p-4 rounded-2xl border border-slate-800 flex items-center gap-3">
            <input
              type="checkbox"
              id="telemedicine_available"
              name="telemedicine_available"
              checked={formData.telemedicine_available}
              onChange={handleChange}
              className="w-4 h-4 accent-[#006666] rounded cursor-pointer"
            />
            <Label
              htmlFor="telemedicine_available"
              className="text-slate-200 text-xs font-semibold cursor-pointer flex items-center gap-2"
            >
              <Video className="w-4 h-4 text-emerald-400" />
              Ofrezco consulta de telemedicina / atención virtual
            </Label>
          </div>
        </div>
      </div>

      {/* SECCIÓN D: PRIVACIDAD, CONSENTIMIENTO Y VISIBILIDAD */}
      <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-[2rem] space-y-6 shadow-md">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-5">
          <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-white font-heading">
              Consentimiento de Datos y Visibilidad Pública
            </h3>
            <span className="text-xs text-slate-400">
              Autorización legal de Habeas Data e interruptor de publicación en el Directorio Médico.
            </span>
          </div>
        </div>

        <div className="space-y-4 text-xs">
          {/* Consentimiento Checkbox */}
          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="consentConfirmed"
                name="consentConfirmed"
                checked={formData.consentConfirmed}
                onChange={handleChange}
                className="w-4 h-4 accent-[#006666] rounded cursor-pointer mt-0.5"
              />
              <Label
                htmlFor="consentConfirmed"
                className="text-slate-200 text-xs leading-relaxed font-semibold cursor-pointer"
              >
                Autorizo expresamente a la Sociedad Colombiana de Ginecología y Obstetricia (SOVOGIN) a publicar y difundir mis datos de contacto profesional en el Directorio Médico Público según la política de tratamiento de datos personales (Habeas Data / Ley 1581 de Protección de Datos).
              </Label>
            </div>

            {!formData.consentConfirmed && (
              <p className="text-xs text-amber-300 font-medium flex items-center gap-1.5 pt-1 pl-7">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                Se requiere su consentimiento de datos para poder habilitar la publicación en el directorio.
              </p>
            )}
          </div>

          {/* Visibilidad Switch */}
          <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800 flex items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-teal-400" />
                Publicar Perfil en Directorio Médico Público
              </span>
              <p className="text-xs text-slate-400">
                Al activar este interruptor, su ficha será visible públicamente en el portal web de SOVOGIN.
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                name="is_published"
                checked={formData.is_published}
                onChange={handleChange}
                disabled={!formData.consentConfirmed}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#006666] peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Botón Guardar */}
      <div className="flex justify-end pt-4">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-[#006666] hover:bg-[#005555] text-white text-sm font-extrabold px-8 py-3.5 rounded-2xl shadow-xl transition-all flex items-center gap-2 font-heading focus:ring-2 focus:ring-teal-500"
        >
          {isSubmitting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          {isSubmitting
            ? "Guardando Cambios..."
            : hasProfile
            ? "Guardar Cambios del Perfil"
            : "Crear e Inicializar Perfil"}
        </Button>
      </div>
    </form>
  );
};
