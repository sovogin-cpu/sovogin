"use client";

import React, { useEffect, useState } from "react";
import { UserCheck, RefreshCw } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import {
  listDoctorCities,
  listDoctorSpecialties,
  listPublishedDoctors,
} from "@/lib/directory/directory-repository";
import { DoctorDirectoryProfilePublic } from "@/lib/directory/types";
import { DoctorDirectoryFilters } from "./DoctorDirectoryFilters";
import { DoctorProfileCard } from "./DoctorProfileCard";
import { PublicMedia } from "@/components/content/public/PublicMedia";

interface BannerRecord {
  id: string;
  title: string;
  image_url: string;
  media_id?: string | null;
}

export const DoctorDirectoryPage: React.FC = () => {
  const [doctors, setDoctors] = useState<DoctorDirectoryProfilePublic[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [headerBanner, setHeaderBanner] = useState<BannerRecord | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [specialty, setSpecialty] = useState("all");
  const [city, setCity] = useState("all");
  const [telemedicineOnly, setTelemedicineOnly] = useState(false);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    async function fetchData() {
      try {
        const supabase = createClient();

        const [docs, specList, cityList] = await Promise.all([
          listPublishedDoctors(supabase, {
            search: searchQuery,
            specialty: specialty === "all" ? undefined : specialty,
            city: city === "all" ? undefined : city,
            telemedicineAvailable: telemedicineOnly ? true : undefined,
          }),
          listDoctorSpecialties(supabase),
          listDoctorCities(supabase),
        ]);

        const { data: bannerData } = await supabase
          .from("banners")
          .select("id, title, image_url, media_id")
          .eq("position", "DIRECTORY_HEADER")
          .eq("is_active", true)
          .order("display_order", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (!isCancelled) {
          setDoctors(docs);
          setSpecialties(specList);
          setCities(cityList);
          if (bannerData) {
            setHeaderBanner(bannerData as BannerRecord);
          }
          setLoading(false);
        }
      } catch (err: unknown) {
        console.error("Error al cargar el directorio médico:", err);
        if (!isCancelled) setLoading(false);
      }
    }

    fetchData();

    return () => {
      isCancelled = true;
    };
  }, [searchQuery, specialty, city, telemedicineOnly]);

  const handleClearFilters = () => {
    setSearchQuery("");
    setSpecialty("all");
    setCity("all");
    setTelemedicineOnly(false);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pt-28 pb-20">
      <div className="container mx-auto px-4 max-w-6xl space-y-8">
        {/* Header Banner if present */}
        {headerBanner && (
          <div className="rounded-3xl overflow-hidden shadow-md bg-slate-900 relative">
            {headerBanner.media_id ? (
              <PublicMedia
                mediaId={headerBanner.media_id}
                alt={headerBanner.title}
                className="w-full h-48 sm:h-64 object-cover"
              />
            ) : headerBanner.image_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={headerBanner.image_url}
                alt={headerBanner.title}
                className="w-full h-48 sm:h-64 object-cover"
              />
            ) : null}
          </div>
        )}

        {/* Header Section */}
        <div className="bg-white p-8 sm:p-12 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-[#006666] text-xs font-bold rounded-full border border-emerald-200">
            <UserCheck className="w-3.5 h-3.5" />
            <span>SOVOGIN Directorio Médico</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Directorio de Médicos Especialistas
          </h1>

          <p className="text-sm sm:text-base text-slate-600 max-w-3xl leading-relaxed">
            Encuentra ginecólogos y obstetras asociados a SOVOGIN en el Valle del Cauca. Consulta sus canales de contacto profesional y disponibilidad de telemedicina.
          </p>
        </div>

        {/* Filters */}
        <DoctorDirectoryFilters
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          specialty={specialty}
          onSpecialtyChange={setSpecialty}
          city={city}
          onCityChange={setCity}
          telemedicineOnly={telemedicineOnly}
          onTelemedicineOnlyChange={setTelemedicineOnly}
          specialties={specialties}
          cities={cities}
          onClearFilters={handleClearFilters}
          totalResults={doctors.length}
        />

        {/* Results Container */}
        {loading ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
            <RefreshCw className="w-6 h-6 text-[#006666] animate-spin mx-auto mb-2" />
            <span className="text-xs text-slate-500 font-medium">
              Cargando directorio de especialistas...
            </span>
          </div>
        ) : doctors.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm space-y-2 max-w-2xl mx-auto">
            <h3 className="font-bold text-slate-800 text-base">
              No se encontraron especialistas
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              No existen médicos expresamente publicados que coincidan con los criterios seleccionados. Prueba a modificar o limpiar los filtros.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {doctors.map((doc) => (
              <DoctorProfileCard key={doc.id} doctor={doc} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
