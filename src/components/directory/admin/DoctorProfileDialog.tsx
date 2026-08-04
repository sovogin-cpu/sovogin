"use client";

import React, { useEffect, useState } from "react";
import { X, CheckCircle2, ShieldCheck, Lock } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { getAssociateCandidateById } from "@/lib/directory/directory-repository";
import {
  AssociateDirectoryCandidate,
  DoctorDirectoryAdminProfile,
  DoctorProfileFormData,
} from "@/lib/directory/types";
import { AssociateSelector } from "./AssociateSelector";
import { DoctorProfileMediaSelector } from "./DoctorProfileMediaSelector";

interface DoctorProfileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: DoctorProfileFormData) => Promise<void>;
  profileToEdit?: DoctorDirectoryAdminProfile | null;
  initialAssociateId?: string | null;
  lockedAssociate?: boolean;
}

export const DoctorProfileDialog: React.FC<DoctorProfileDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  profileToEdit,
  initialAssociateId,
  lockedAssociate,
}) => {
  if (!isOpen) return null;

  return (
    <DoctorProfileDialogForm
      onClose={onClose}
      onSave={onSave}
      profileToEdit={profileToEdit}
      initialAssociateId={initialAssociateId}
      lockedAssociate={lockedAssociate}
    />
  );
};

interface DoctorProfileDialogFormProps {
  onClose: () => void;
  onSave: (payload: DoctorProfileFormData) => Promise<void>;
  profileToEdit?: DoctorDirectoryAdminProfile | null;
  initialAssociateId?: string | null;
  lockedAssociate?: boolean;
}

const DoctorProfileDialogForm: React.FC<DoctorProfileDialogFormProps> = ({
  onClose,
  onSave,
  profileToEdit,
  initialAssociateId,
  lockedAssociate = false,
}) => {
  const isEditing = Boolean(profileToEdit);

  const [selectedAssociate, setSelectedAssociate] = useState<AssociateDirectoryCandidate | null>(
    profileToEdit
      ? {
          id: profileToEdit.associate_id,
          full_name: profileToEdit.display_name,
          email: profileToEdit.public_email || "",
          specialty: profileToEdit.specialty,
          status: "Activo",
        }
      : null
  );

  const [displayName, setDisplayName] = useState(
    profileToEdit?.display_name || ""
  );
  const [specialty, setSpecialty] = useState(
    profileToEdit?.specialty || "Ginecología y Obstetricia"
  );
  const [subspecialty, setSubspecialty] = useState(
    profileToEdit?.subspecialty || ""
  );
  const [city, setCity] = useState(profileToEdit?.city || "Cali");
  const [publicPhone, setPublicPhone] = useState(
    profileToEdit?.public_phone || ""
  );
  const [publicEmail, setPublicEmail] = useState(
    profileToEdit?.public_email || ""
  );
  const [officeAddress, setOfficeAddress] = useState(
    profileToEdit?.office_address || ""
  );
  const [websiteUrl, setWebsiteUrl] = useState(
    profileToEdit?.website_url || ""
  );
  const [bio, setBio] = useState(profileToEdit?.bio || "");
  const [telemedicineAvailable, setTelemedicineAvailable] = useState(
    profileToEdit?.telemedicine_available ?? false
  );
  const [profileMediaId, setProfileMediaId] = useState<string | null>(
    profileToEdit?.profile_media_id || null
  );
  const [displayOrder, setDisplayOrder] = useState<number>(
    profileToEdit?.display_order ?? 0
  );
  const [consentConfirmed, setConsentConfirmed] = useState<boolean>(
    Boolean(profileToEdit?.consent_given_at)
  );
  const [isPublished, setIsPublished] = useState<boolean>(
    profileToEdit?.is_published ?? false
  );

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Pre-load candidate if initialAssociateId is supplied and not editing
  useEffect(() => {
    let isMounted = true;
    if (initialAssociateId && !profileToEdit) {
      const supabase = createClient();
      getAssociateCandidateById(supabase, initialAssociateId).then((candidate) => {
        if (candidate && isMounted) {
          setSelectedAssociate(candidate);
          setDisplayName(candidate.full_name);
          if (candidate.specialty) {
            setSpecialty(candidate.specialty);
          }
        }
      });
    }
    return () => {
      isMounted = false;
    };
  }, [initialAssociateId, profileToEdit]);

  const handleSelectCandidate = (candidate: AssociateDirectoryCandidate | null) => {
    if (lockedAssociate) return;
    setSelectedAssociate(candidate);
    if (candidate && !displayName) {
      setDisplayName(candidate.full_name);
    }
    if (candidate && candidate.specialty && specialty === "Ginecología y Obstetricia") {
      setSpecialty(candidate.specialty);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const associateId = selectedAssociate?.id || profileToEdit?.associate_id || initialAssociateId;
    if (!associateId) {
      setErrorMsg("Debe seleccionar un médico asociado.");
      return;
    }

    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setErrorMsg("El nombre público del médico es obligatorio.");
      return;
    }

    if (isPublished && !consentConfirmed && !profileToEdit?.consent_given_at) {
      setErrorMsg(
        "No se puede publicar un perfil sin el consentimiento registrado del médico."
      );
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave({
        associate_id: associateId,
        display_name: trimmedName,
        specialty: specialty.trim() || "Ginecología y Obstetricia",
        subspecialty: subspecialty.trim() || null,
        city: city.trim() || "Cali",
        public_phone: publicPhone.trim() || null,
        public_email: publicEmail.trim() || null,
        office_address: officeAddress.trim() || null,
        profile_media_id: profileMediaId,
        bio: bio.trim() || null,
        website_url: websiteUrl.trim() || null,
        telemedicine_available: telemedicineAvailable,
        consentConfirmed,
        is_published: isPublished,
        display_order: displayOrder >= 0 ? displayOrder : 0,
      });
      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Error al guardar el perfil médico.";
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#006666]" />
            <h3 className="text-lg font-bold text-slate-900">
              {isEditing ? "Editar Perfil Médico" : "Nuevo Perfil Médico de Directorio"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Associate Selector or Locked Display */}
          {!isEditing && !lockedAssociate ? (
            <AssociateSelector
              selectedAssociateId={selectedAssociate?.id || null}
              onSelect={handleSelectCandidate}
            />
          ) : (
            <div className="p-3.5 bg-[#006666]/5 rounded-xl border border-[#006666]/20 text-xs flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px] block mb-0.5">
                  Médico Asociado Vinculado
                </span>
                <span className="font-extrabold text-[#006666] text-sm">
                  {selectedAssociate?.full_name || profileToEdit?.display_name}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-white px-2.5 py-1 rounded-md border border-slate-200">
                <Lock className="w-3 h-3 text-slate-400" />
                <span>Preseleccionado</span>
              </div>
            </div>
          )}

          {/* Display Name & Specialty */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Nombre Público <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Ej. Dr. Carlos Pérez"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006666]"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Especialidad <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                placeholder="Ej. Ginecología y Obstetricia"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006666]"
                required
              />
            </div>
          </div>

          {/* Subspecialty & City */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Subespecialidad Opcional
              </label>
              <input
                type="text"
                value={subspecialty}
                onChange={(e) => setSubspecialty(e.target.value)}
                placeholder="Ej. Medicina Materno Fetal"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Ciudad <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ej. Cali"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                required
              />
            </div>
          </div>

          {/* Public Phone & Public Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Teléfono Público de Contacto
              </label>
              <input
                type="text"
                value={publicPhone}
                onChange={(e) => setPublicPhone(e.target.value)}
                placeholder="Ej. +57 602 555 1234"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Correo Público de Contacto
              </label>
              <input
                type="email"
                value={publicEmail}
                onChange={(e) => setPublicEmail(e.target.value)}
                placeholder="Ej. consultorio@drperez.com"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          {/* Office Address & Website */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Dirección de Consultorio
              </label>
              <input
                type="text"
                value={officeAddress}
                onChange={(e) => setOfficeAddress(e.target.value)}
                placeholder="Ej. Calle 20 Norte No. 6N - 33, Consultorio 402"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Sitio Web (únicamente https://)
              </label>
              <input
                type="text"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://www.drperez.com"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          {/* Photo Media Selector */}
          <DoctorProfileMediaSelector
            selectedMediaId={profileMediaId}
            onSelectMediaId={setProfileMediaId}
          />

          {/* Bio */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Biografía / Trayectoria Profesional
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              placeholder="Resumen del perfil médico, experiencia y formación académica..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006666]"
            />
          </div>

          {/* Telemedicine & Display Order */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="telemed_check"
                checked={telemedicineAvailable}
                onChange={(e) => setTelemedicineAvailable(e.target.checked)}
                className="w-4 h-4 text-[#006666] rounded border-slate-300 focus:ring-[#006666]"
              />
              <label
                htmlFor="telemed_check"
                className="text-xs font-semibold text-slate-700 select-none cursor-pointer"
              >
                Ofrece consulta por Telemedicina
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Orden de Despliegue (0 = Primero)
              </label>
              <input
                type="number"
                min={0}
                value={displayOrder}
                onChange={(e) => setDisplayOrder(Number(e.target.value))}
                className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>

          {/* Consent Checkbox */}
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 space-y-2">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={consentConfirmed}
                onChange={(e) => setConsentConfirmed(e.target.checked)}
                className="w-4 h-4 text-[#006666] rounded border-slate-300 focus:ring-[#006666] mt-0.5"
              />
              <span className="text-xs font-semibold text-emerald-950 leading-snug">
                Confirmo que el médico autorizó la publicación de esta información en el directorio público de SOVOGIN.
              </span>
            </label>
          </div>

          {/* Publish Checkbox */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="is_pub_check"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="w-4 h-4 text-[#006666] rounded border-slate-300 focus:ring-[#006666]"
            />
            <label
              htmlFor="is_pub_check"
              className="text-xs font-bold text-slate-800 select-none cursor-pointer flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4 text-[#006666]" />
              <span>Publicar perfil inmediatamente en el Directorio Médico</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-bold text-white bg-[#006666] hover:bg-[#004d4d] rounded-xl transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting
                ? "Guardando..."
                : isEditing
                ? "Actualizar Perfil"
                : "Crear Perfil Médico"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
