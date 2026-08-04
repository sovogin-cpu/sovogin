"use client";

import React, { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Search, UserCheck, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import {
  createDoctorDirectoryProfile,
  getDirectoryAdminProfileById,
  getDirectoryProfileByAssociateId,
  listDirectoryAdminProfiles,
  listDoctorCities,
  listDoctorSpecialties,
  toggleDoctorDirectoryPublished,
  updateDoctorDirectoryProfile,
} from "@/lib/directory/directory-repository";
import {
  DoctorDirectoryAdminProfile,
  DoctorProfileFormData,
} from "@/lib/directory/types";
import { DoctorProfileAdminCard } from "./DoctorProfileAdminCard";
import { DoctorProfileDialog } from "./DoctorProfileDialog";

export const DoctorDirectoryAdminPage: React.FC = () => {
  const searchParams = useSearchParams();
  const profileIdParam = searchParams.get("profileId");
  const associateIdParam = searchParams.get("associateId");
  const newParam = searchParams.get("new");

  const [profiles, setProfiles] = useState<DoctorDirectoryAdminProfile[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [isPublishedFilter, setIsPublishedFilter] = useState<"all" | "published" | "unpublished">("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [specialtyFilter, setSpecialtyFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [profileToEdit, setProfileToEdit] = useState<DoctorDirectoryAdminProfile | null>(null);
  const [initialAssociateId, setInitialAssociateId] = useState<string | null>(null);
  const [lockedAssociate, setLockedAssociate] = useState(false);

  const loadData = async () => {
    try {
      setErrorMsg(null);
      const supabase = createClient();
      const [list, specList, cityList] = await Promise.all([
        listDirectoryAdminProfiles(supabase, {
          search: searchQuery,
          isPublished: isPublishedFilter,
          city: cityFilter,
          specialty: specialtyFilter,
        }),
        listDoctorSpecialties(supabase),
        listDoctorCities(supabase),
      ]);

      setProfiles(list);
      setSpecialties(specList);
      setCities(cityList);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Error al cargar los perfiles del directorio.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isCancelled = false;

    async function fetchAdminData() {
      try {
        setErrorMsg(null);
        const supabase = createClient();
        const [list, specList, cityList] = await Promise.all([
          listDirectoryAdminProfiles(supabase, {
            search: searchQuery,
            isPublished: isPublishedFilter,
            city: cityFilter,
            specialty: specialtyFilter,
          }),
          listDoctorSpecialties(supabase),
          listDoctorCities(supabase),
        ]);

        if (!isCancelled) {
          setProfiles(list);
          setSpecialties(specList);
          setCities(cityList);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          const msg =
            err instanceof Error ? err.message : "Error al cargar los perfiles del directorio.";
          setErrorMsg(msg);
          setLoading(false);
        }
      }
    }

    fetchAdminData();

    return () => {
      isCancelled = true;
    };
  }, [searchQuery, isPublishedFilter, cityFilter, specialtyFilter]);

  // Handle URL query parameters securely (profileId or new=1&associateId=UUID)
  useEffect(() => {
    let isCancelled = false;

    async function handleUrlParams() {
      const supabase = createClient();

      if (profileIdParam) {
        try {
          const profile = await getDirectoryAdminProfileById(supabase, profileIdParam);
          if (profile && !isCancelled) {
            setProfileToEdit(profile);
            setInitialAssociateId(null);
            setLockedAssociate(false);
            setIsDialogOpen(true);
            window.history.replaceState({}, "", "/admin/directorio-medico");
          }
        } catch {
          // Ignore invalid profileId
        }
      } else if (newParam === "1" && associateIdParam) {
        try {
          const existing = await getDirectoryProfileByAssociateId(supabase, associateIdParam);
          if (existing && !isCancelled) {
            setProfileToEdit(existing);
            setInitialAssociateId(null);
            setLockedAssociate(false);
            setIsDialogOpen(true);
            setSuccessMsg("Este asociado ya cuenta con un perfil en el directorio; se abrió en modo edición.");
            window.history.replaceState({}, "", "/admin/directorio-medico");
          } else if (!isCancelled) {
            setProfileToEdit(null);
            setInitialAssociateId(associateIdParam);
            setLockedAssociate(true);
            setIsDialogOpen(true);
            window.history.replaceState({}, "", "/admin/directorio-medico");
          }
        } catch {
          // Ignore invalid associateId
        }
      }
    }

    void handleUrlParams();

    return () => {
      isCancelled = true;
    };
  }, [profileIdParam, associateIdParam, newParam]);

  const handleOpenCreate = () => {
    setProfileToEdit(null);
    setInitialAssociateId(null);
    setLockedAssociate(false);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (profile: DoctorDirectoryAdminProfile) => {
    setProfileToEdit(profile);
    setInitialAssociateId(null);
    setLockedAssociate(false);
    setIsDialogOpen(true);
  };

  const handleSaveProfile = async (payload: DoctorProfileFormData) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const supabase = createClient();

    if (profileToEdit) {
      await updateDoctorDirectoryProfile(supabase, profileToEdit.id, payload);
      setSuccessMsg("Perfil médico actualizado correctamente.");
    } else {
      await createDoctorDirectoryProfile(supabase, payload);
      setSuccessMsg("Perfil médico creado correctamente.");
    }

    await loadData();
  };

  const handleTogglePublish = async (profile: DoctorDirectoryAdminProfile) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const supabase = createClient();
      const updated = await toggleDoctorDirectoryPublished(
        supabase,
        profile.id,
        !profile.is_published
      );
      setSuccessMsg(
        `El perfil del Dr. ${updated.display_name} fue ${
          updated.is_published ? "publicado" : "despublicado"
        } correctamente.`
      );
      await loadData();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Error al cambiar estado de publicación.";
      setErrorMsg(msg);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-[#006666]" />
            <h1 className="text-2xl font-bold text-slate-900">
              Directorio Médico
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Administración de perfiles públicos de médicos asociados a SOVOGIN con consentimiento registrado.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="px-4 py-2.5 bg-[#006666] hover:bg-[#004d4d] text-white font-semibold text-xs rounded-xl transition-colors shadow-sm flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Perfil Médico</span>
        </button>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-sm font-medium flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-sm font-medium flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre..."
              className="w-full pl-10 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006666] font-medium"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={isPublishedFilter}
              onChange={(e) =>
                setIsPublishedFilter(e.target.value as "all" | "published" | "unpublished")
              }
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
            >
              <option value="all">Todos los estados de publicación</option>
              <option value="published">Solo Publicados</option>
              <option value="unpublished">Solo No Publicados (Borradores)</option>
            </select>
          </div>

          {/* Specialty Filter */}
          <div>
            <select
              value={specialtyFilter}
              onChange={(e) => setSpecialtyFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
            >
              <option value="all">Todas las especialidades</option>
              {specialties.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* City Filter */}
          <div>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
            >
              <option value="all">Todas las ciudades</option>
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 text-xs text-slate-500 font-medium">
          Total de perfiles: <strong className="text-slate-800">{profiles.length}</strong>
        </div>
      </div>

      {/* Profiles Grid */}
      {loading ? (
        <div className="p-12 bg-white rounded-2xl border border-slate-200 shadow-sm text-center">
          <RefreshCw className="w-6 h-6 text-[#006666] animate-spin mx-auto mb-2" />
          <span className="text-xs text-slate-500 font-medium">
            Cargando directorio administrativo...
          </span>
        </div>
      ) : profiles.length === 0 ? (
        <div className="p-12 bg-white rounded-2xl border border-slate-200 shadow-sm text-center space-y-2">
          <h3 className="font-bold text-slate-800 text-base">
            No hay perfiles médicos
          </h3>
          <p className="text-xs text-slate-500">
            Crea un nuevo perfil vinculando a un asociado activo para habilitar su ficha en el directorio.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {profiles.map((p) => (
            <DoctorProfileAdminCard
              key={p.id}
              doctor={p}
              onEdit={handleOpenEdit}
              onTogglePublish={handleTogglePublish}
            />
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <DoctorProfileDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSaveProfile}
        profileToEdit={profileToEdit}
        initialAssociateId={initialAssociateId}
        lockedAssociate={lockedAssociate}
      />
    </div>
  );
};
