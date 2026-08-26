"use client";

import React, { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { UserCheck, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import {
  listDoctorCities,
  listDoctorCountries,
  listDoctorDepartments,
  listDoctorSpecialties,
  listPublishedDoctorsPaginated,
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

function DoctorDirectoryPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Read initial query params from URL
  const initialSearch = searchParams.get("q") || "";
  const initialSpecialty = searchParams.get("specialty") || "all";
  const initialCountry = searchParams.get("country") || "all";
  const initialDepartment = searchParams.get("department") || "all";
  const initialCity = searchParams.get("city") || "all";
  const initialTelemedicine = searchParams.get("telemedicine") === "true";
  const initialPage = parseInt(searchParams.get("page") || "1", 10) || 1;

  // Local State
  const [doctors, setDoctors] = useState<DoctorDirectoryProfilePublic[]>([]);
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [headerBanner, setHeaderBanner] = useState<BannerRecord | null>(null);

  const [totalResults, setTotalResults] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(initialPage);

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [specialty, setSpecialty] = useState(initialSpecialty);
  const [country, setCountry] = useState(initialCountry);
  const [department, setDepartment] = useState(initialDepartment);
  const [city, setCity] = useState(initialCity);
  const [telemedicineOnly, setTelemedicineOnly] = useState(initialTelemedicine);

  const [loading, setLoading] = useState(true);

  // Sync state changes to URL search params
  const updateUrlParams = useCallback(
    (newParams: Record<string, string | number | boolean | null | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());

      Object.entries(newParams).forEach(([key, value]) => {
        if (value === null || value === undefined || value === "" || value === "all" || value === false || (key === "page" && value === 1)) {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      });

      const queryString = params.toString();
      const targetUrl = queryString ? `${pathname}?${queryString}` : pathname;
      router.push(targetUrl, { scroll: false });
    },
    [searchParams, pathname, router]
  );

  // Main Data Fetcher
  useEffect(() => {
    let isCancelled = false;

    async function fetchData() {
      setLoading(true);
      try {
        const supabase = createClient();

        const [paginatedData, specList, countryList, deptList, cityList] = await Promise.all([
          listPublishedDoctorsPaginated(supabase, {
            search: searchQuery,
            specialty: specialty === "all" ? undefined : specialty,
            country: country === "all" ? undefined : country,
            department: department === "all" ? undefined : department,
            city: city === "all" ? undefined : city,
            telemedicineAvailable: telemedicineOnly ? true : undefined,
            page: currentPage,
            pageSize: 12,
          }),
          listDoctorSpecialties(supabase),
          listDoctorCountries(supabase),
          listDoctorDepartments(supabase),
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
          setDoctors(paginatedData.doctors);
          setTotalResults(paginatedData.totalCount);
          setTotalPages(paginatedData.totalPages);
          setSpecialties(specList);
          setCountries(countryList);
          setDepartments(deptList);
          setCities(cityList);
          if (bannerData) {
            setHeaderBanner(bannerData as BannerRecord);
          }

          // If current page > totalPages, normalize page
          if (paginatedData.page > paginatedData.totalPages && paginatedData.totalPages > 0) {
            setCurrentPage(1);
            updateUrlParams({ page: 1 });
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
  }, [searchQuery, specialty, country, department, city, telemedicineOnly, currentPage, updateUrlParams]);

  // Handlers
  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
    updateUrlParams({ q: val, page: 1 });
  };

  const handleSpecialtyChange = (val: string) => {
    setSpecialty(val);
    setCurrentPage(1);
    updateUrlParams({ specialty: val, page: 1 });
  };

  const handleCountryChange = (val: string) => {
    setCountry(val);
    setCurrentPage(1);
    updateUrlParams({ country: val, page: 1 });
  };

  const handleDepartmentChange = (val: string) => {
    setDepartment(val);
    setCurrentPage(1);
    updateUrlParams({ department: val, page: 1 });
  };

  const handleCityChange = (val: string) => {
    setCity(val);
    setCurrentPage(1);
    updateUrlParams({ city: val, page: 1 });
  };

  const handleTelemedicineChange = (val: boolean) => {
    setTelemedicineOnly(val);
    setCurrentPage(1);
    updateUrlParams({ telemedicine: val, page: 1 });
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setSpecialty("all");
    setCountry("all");
    setDepartment("all");
    setCity("all");
    setTelemedicineOnly(false);
    setCurrentPage(1);
    router.push(pathname, { scroll: false });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    updateUrlParams({ page: newPage });

    // Scroll smoothly to top of directory
    window.scrollTo({ top: 150, behavior: "smooth" });
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
            Encuentra ginecólogos y obstetras asociados a SOVOGIN en Colombia. Consulta sus canales de contacto profesional, institución de atención y disponibilidad de telemedicina.
          </p>
        </div>

        {/* Filters */}
        <DoctorDirectoryFilters
          searchQuery={searchQuery}
          onSearchQueryChange={handleSearchChange}
          specialty={specialty}
          onSpecialtyChange={handleSpecialtyChange}
          country={country}
          onCountryChange={handleCountryChange}
          department={department}
          onDepartmentChange={handleDepartmentChange}
          city={city}
          onCityChange={handleCityChange}
          telemedicineOnly={telemedicineOnly}
          onTelemedicineOnlyChange={handleTelemedicineChange}
          specialties={specialties}
          countries={countries}
          departments={departments}
          cities={cities}
          onClearFilters={handleClearFilters}
          totalResults={totalResults}
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
          <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm space-y-3 max-w-2xl mx-auto">
            <h3 className="font-bold text-slate-800 text-base">
              No se encontraron especialistas
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              No existen médicos expresamente publicados que coincidan con los criterios seleccionados. Prueba a modificar o limpiar los filtros.
            </p>
            <button
              type="button"
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#006666] text-white text-xs font-semibold rounded-xl hover:bg-[#004d4d] transition-colors"
            >
              <span>Ver todos los médicos</span>
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {doctors.map((doc) => (
                <DoctorProfileCard key={doc.id} doctor={doc} />
              ))}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-6 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  aria-label="Página anterior"
                  className="p-2 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <span className="text-xs font-bold text-slate-700 px-3 py-1.5 bg-white border border-slate-200 rounded-xl">
                  Página {currentPage} de {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  aria-label="Página siguiente"
                  className="p-2 bg-white border border-slate-200 rounded-xl text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export const DoctorDirectoryPage: React.FC = () => {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50/50 pt-28 pb-20 flex items-center justify-center">
          <RefreshCw className="w-6 h-6 text-[#006666] animate-spin" />
        </div>
      }
    >
      <DoctorDirectoryPageContent />
    </Suspense>
  );
};
