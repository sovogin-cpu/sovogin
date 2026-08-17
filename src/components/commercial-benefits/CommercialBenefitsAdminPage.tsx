"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Plus, Search, Tag, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import {
  createCommercialBenefit,
  listCommercialBenefitsAdmin,
  toggleCommercialBenefitActive,
  toggleCommercialBenefitFeatured,
  updateCommercialBenefit,
} from "@/lib/commercial-benefits/commercial-benefits-repository";
import {
  AdminCommercialBenefit,
  CommercialBenefit,
  CommercialBenefitFilters,
  CommercialBenefitFormData,
} from "@/lib/commercial-benefits/types";
import { CommercialBenefitAdminCard } from "./CommercialBenefitAdminCard";
import { CommercialBenefitDialog } from "./CommercialBenefitDialog";

export const CommercialBenefitsAdminPage: React.FC = () => {
  const [benefits, setBenefits] = useState<AdminCommercialBenefit[]>([]);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [featuredFilter, setFeaturedFilter] = useState<"all" | "featured" | "regular">("all");
  const [validityFilter, setValidityFilter] = useState<"all" | "current" | "upcoming" | "expired" | "undated">("all");

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [benefitToEdit, setBenefitToEdit] = useState<AdminCommercialBenefit | null>(null);

  const loadData = useCallback(async () => {
    try {
      setErrorMsg(null);
      const supabase = createClient();
      const filters: CommercialBenefitFilters = {
        search: searchQuery,
        activeState: activeFilter,
        featuredState: featuredFilter,
        validityState: validityFilter,
      };

      const list = await listCommercialBenefitsAdmin(supabase, filters);
      setBenefits(list);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Error al cargar los beneficios comerciales.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, activeFilter, featuredFilter, validityFilter]);

  useEffect(() => {
    let isCancelled = false;

    async function fetchBenefits() {
      try {
        setErrorMsg(null);
        const supabase = createClient();
        const filters: CommercialBenefitFilters = {
          search: searchQuery,
          activeState: activeFilter,
          featuredState: featuredFilter,
          validityState: validityFilter,
        };

        const list = await listCommercialBenefitsAdmin(supabase, filters);
        if (!isCancelled) {
          setBenefits(list);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          const msg =
            err instanceof Error ? err.message : "Error al cargar los beneficios comerciales.";
          setErrorMsg(msg);
          setLoading(false);
        }
      }
    }

    fetchBenefits();

    return () => {
      isCancelled = true;
    };
  }, [searchQuery, activeFilter, featuredFilter, validityFilter]);

  const handleOpenCreate = () => {
    setBenefitToEdit(null);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (benefit: CommercialBenefit) => {
    setBenefitToEdit(benefit);
    setIsDialogOpen(true);
  };

  const handleSaveBenefit = async (payload: CommercialBenefitFormData) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const userId = user?.id || null;

    if (benefitToEdit) {
      await updateCommercialBenefit(supabase, benefitToEdit.id, payload, userId);
      setSuccessMsg("Beneficio comercial actualizado correctamente.");
    } else {
      await createCommercialBenefit(supabase, payload, userId);
      setSuccessMsg("Beneficio comercial creado correctamente.");
    }

    await loadData();
  };

  const handleToggleActive = async (benefit: CommercialBenefit) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const updated = await toggleCommercialBenefitActive(
        supabase,
        benefit.id,
        !benefit.is_active,
        user?.id
      );

      setSuccessMsg(
        `El beneficio de "${updated.name}" fue ${
          updated.is_active ? "activado" : "desactivado"
        } correctamente.`
      );
      await loadData();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Error al cambiar estado activo.";
      setErrorMsg(msg);
    }
  };

  const handleToggleFeatured = async (benefit: CommercialBenefit) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const updated = await toggleCommercialBenefitFeatured(
        supabase,
        benefit.id,
        !benefit.is_featured,
        user?.id
      );

      setSuccessMsg(
        `El beneficio de "${updated.name}" fue ${
          updated.is_featured ? "marcado como destacado" : "desmarcado como destacado"
        }.`
      );
      await loadData();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Error al cambiar estado destacado.";
      setErrorMsg(msg);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Tag className="w-6 h-6 text-[#006666]" />
            <h1 className="text-2xl font-bold text-slate-900">
              Beneficios Comerciales
            </h1>
          </div>
          <p className="text-xs text-slate-500">
            Administración de convenios comerciales, descuentos y beneficios especiales para miembros de SOVOGIN.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="px-4 py-2.5 bg-[#006666] hover:bg-[#004d4d] text-white font-semibold text-xs rounded-xl transition-colors shadow-sm flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Beneficio Comercial</span>
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
              placeholder="Buscar por aliado o título..."
              className="w-full pl-10 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006666] font-medium"
            />
          </div>

          {/* Active Filter */}
          <div>
            <select
              value={activeFilter}
              onChange={(e) =>
                setActiveFilter(e.target.value as "all" | "active" | "inactive")
              }
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
            >
              <option value="all">Todos los estados de actividad</option>
              <option value="active">Solo Activos</option>
              <option value="inactive">Solo Inactivos</option>
            </select>
          </div>

          {/* Featured Filter */}
          <div>
            <select
              value={featuredFilter}
              onChange={(e) =>
                setFeaturedFilter(e.target.value as "all" | "featured" | "regular")
              }
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
            >
              <option value="all">Todos los destacados</option>
              <option value="featured">Solo Destacados</option>
              <option value="regular">Solo Regulares</option>
            </select>
          </div>

          {/* Validity Filter */}
          <div>
            <select
              value={validityFilter}
              onChange={(e) =>
                setValidityFilter(
                  e.target.value as "all" | "current" | "upcoming" | "expired" | "undated"
                )
              }
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
            >
              <option value="all">Todas las vigencias</option>
              <option value="current">Actualmente Vigentes</option>
              <option value="upcoming">Próximos a iniciar</option>
              <option value="expired">Vencidos / Expirados</option>
              <option value="undated">Sin fecha límite</option>
            </select>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 text-xs text-slate-500 font-medium">
          Total de beneficios: <strong className="text-slate-800">{benefits.length}</strong>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="p-12 bg-white rounded-2xl border border-slate-200 shadow-sm text-center">
          <RefreshCw className="w-6 h-6 text-[#006666] animate-spin mx-auto mb-2" />
          <span className="text-xs text-slate-500 font-medium">
            Cargando beneficios comerciales...
          </span>
        </div>
      ) : benefits.length === 0 ? (
        <div className="p-12 bg-white rounded-2xl border border-slate-200 shadow-sm text-center space-y-2">
          <h3 className="font-bold text-slate-800 text-base">
            No se encontraron beneficios comerciales
          </h3>
          <p className="text-xs text-slate-500">
            Crea un nuevo convenio comercial para mostrarlo en la sección correspondiente.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((b) => (
            <CommercialBenefitAdminCard
              key={b.id}
              benefit={b}
              onEdit={handleOpenEdit}
              onToggleActive={handleToggleActive}
              onToggleFeatured={handleToggleFeatured}
            />
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <CommercialBenefitDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSave={handleSaveBenefit}
        benefitToEdit={benefitToEdit}
      />
    </div>
  );
};
