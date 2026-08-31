"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  Loader2,
  DollarSign,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Filter,
  RefreshCw,
  UserCheck,
  Layers,
  ArrowLeft,
  Calendar,
  AlertCircle,
  PhoneCall,
  MessageSquare,
  ShieldAlert,
  Check,
  Sparkles,
  ShieldCheck,
  Eye,
  Mail,
  ChevronDown,
  ChevronRight,
  Code,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { PortfolioAgingSummary, AgingBucket, AccountStatus } from "@/lib/memberships/aging-engine";
import { DerivedCollectionStatus, FollowUpState, CollectionAction } from "@/lib/collections/types";
import { getOverduePortfolioAmount } from "@/lib/collections/collections-dashboard-service";
import {
  calculateOperationalKPIs,
  getFollowUpQueue,
  getPaymentPromisesMonitor,
} from "@/lib/collections/collections-queue-service";
import {
  getSuppressionReasonMeta,
  getAutomationTriggerLabel,
  getChannelLabel,
  AutomationDryRunApiResponseData,
} from "@/lib/collections/collections-automation-presentation";

interface EnrichedAssociateItem {
  associate_id: string;
  full_name: string;
  document_number?: string | null;
  email: string;
  membership_id?: string | null;
  total_outstanding: number;
  open_charge_count: number;
  oldest_unpaid_due_date: string | null;
  days_past_due: number;
  aging_bucket: AgingBucket;
  account_status: AccountStatus;
  current_amount: number;
  days_1_30: number;
  days_31_60: number;
  days_61_90: number;
  days_91_120: number;
  days_over_120: number;
  collection_status: DerivedCollectionStatus;
  follow_up_state: FollowUpState;
  latest_collection_action: CollectionAction | null;
}

export default function CollectionsPortfolioAdminPage() {
  const [summary, setSummary] = useState<PortfolioAgingSummary | null>(null);
  const [associates, setAssociates] = useState<EnrichedAssociateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Client-side Operational Tabs & Filter States
  const [activeTab, setActiveTab] = useState<"CARTERA" | "SEGUIMIENTOS" | "PROMESAS" | "SIMULACION">("CARTERA");
  const [searchTerm, setSearchTerm] = useState("");
  const [financialStatusFilter, setFinancialStatusFilter] = useState<string>("ALL");
  const [bucketFilter, setBucketFilter] = useState<string>("ALL");
  const [collectionStatusFilter, setCollectionStatusFilter] = useState<string>("ALL");
  const [sortOption, setSortOption] = useState<string>("dpd_desc");

  // Simulation State (E2.2 Read-Only Console)
  const [simulationPreview, setSimulationPreview] = useState<AutomationDryRunApiResponseData | null>(null);
  const [simulationLoading, setSimulationLoading] = useState(false);
  const [simulationError, setSimulationError] = useState<string | null>(null);
  const [expandedIdempotencyKey, setExpandedIdempotencyKey] = useState<string | null>(null);

  // Reservation Modal State (E3.2 Two-Step Admin Confirmation)
  const [selectedCandidateForReservation, setSelectedCandidateForReservation] = useState<any | null>(null);
  const [reservationSubmitting, setReservationSubmitting] = useState(false);
  const [reservationFeedback, setReservationFeedback] = useState<{
    outcome: "RESERVED" | "ALREADY_RESERVED" | "SUPPRESSED";
    message: string;
  } | null>(null);

  const actionsByAssociateId = useMemo(() => {
    const map: Record<string, CollectionAction[]> = {};
    associates.forEach((a) => {
      if (a.latest_collection_action) {
        map[a.associate_id] = [a.latest_collection_action];
      }
    });
    return map;
  }, [associates]);

  const followUpQueue = useMemo(() => {
    return getFollowUpQueue(associates);
  }, [associates]);

  const promiseMonitor = useMemo(() => {
    return getPaymentPromisesMonitor(associates, actionsByAssociateId);
  }, [associates, actionsByAssociateId]);

  const operationalKPIs = useMemo(() => {
    return calculateOperationalKPIs(associates, actionsByAssociateId);
  }, [associates, actionsByAssociateId]);

  const fetchCollectionsData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/collections/aging");
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudo consultar el reporte de cartera y cobranza.");
      }

      setSummary(data.summary || null);
      setAssociates(data.associates || []);
    } catch (err: unknown) {
      console.error("Error cargando cartera de cobranza:", err);
      setError(err instanceof Error ? err.message : "Error al consultar cartera.");
    } finally {
      setLoading(false);
    }
  }, []);

  const runSimulation = useCallback(async () => {
    if (simulationLoading) return; // Anti-double click protection
    setSimulationLoading(true);
    setSimulationError(null);
    try {
      const res = await fetch("/api/admin/collections/automation/dry-run");
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Error al ejecutar la simulación de automatizaciones.");
      }

      setSimulationPreview(data.data || null);
    } catch (err: unknown) {
      console.error("Error ejecutando simulación dry-run:", err);
      setSimulationError(err instanceof Error ? err.message : "Error al consultar simulación.");
    } finally {
      setSimulationLoading(false);
    }
  }, [simulationLoading]);

  const confirmReservation = async () => {
    if (!selectedCandidateForReservation) return;
    setReservationSubmitting(true);
    setReservationFeedback(null);

    try {
      const res = await fetch("/api/admin/collections/automation/reserve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          associate_id: selectedCandidateForReservation.associate_id,
          expected_automation_type: selectedCandidateForReservation.automation_type,
          expected_reference_date: selectedCandidateForReservation.reference_date,
          expected_channel: selectedCandidateForReservation.channel,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al procesar la reserva.");
      }

      if (data.outcome === "RESERVED") {
        setReservationFeedback({
          outcome: "RESERVED",
          message: "Evento de notificación reservado correctamente con estado QUEUED en la cola de salida. No se ha realizado ningún envío externo.",
        });
      } else if (data.outcome === "ALREADY_RESERVED") {
        setReservationFeedback({
          outcome: "ALREADY_RESERVED",
          message: "Este evento de notificación ya se encontraba previamente reservado e identificado de forma idempotente en el sistema.",
        });
      } else {
        setReservationFeedback({
          outcome: "SUPPRESSED",
          message: `La reserva fue suprimida tras re-evaluar las reglas operativas de servidor. Motivo: ${data.reason}`,
        });
      }
    } catch (err: any) {
      setReservationFeedback({
        outcome: "SUPPRESSED",
        message: err.message || "Error al comunicarse con el servidor.",
      });
    } finally {
      setReservationSubmitting(false);
    }
  };

  useEffect(() => {
    void fetchCollectionsData();
  }, [fetchCollectionsData]);

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const filteredAssociates = useMemo(() => {
    return associates.filter((item) => {
      const term = searchTerm.trim().toLowerCase();
      if (term) {
        const nameMatch = item.full_name.toLowerCase().includes(term);
        const emailMatch = item.email.toLowerCase().includes(term);
        const docMatch = item.document_number
          ? item.document_number.toLowerCase().includes(term)
          : false;

        if (!nameMatch && !emailMatch && !docMatch) {
          return false;
        }
      }

      if (financialStatusFilter !== "ALL" && item.account_status !== financialStatusFilter) {
        return false;
      }

      if (bucketFilter !== "ALL" && item.aging_bucket !== bucketFilter) {
        return false;
      }

      if (collectionStatusFilter !== "ALL" && item.collection_status !== collectionStatusFilter) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      switch (sortOption) {
        case "outstanding_desc":
          if (b.total_outstanding !== a.total_outstanding) {
            return b.total_outstanding - a.total_outstanding;
          }
          return b.days_past_due - a.days_past_due;

        case "oldest_due_asc":
          if (a.oldest_unpaid_due_date && b.oldest_unpaid_due_date) {
            return a.oldest_unpaid_due_date.localeCompare(b.oldest_unpaid_due_date);
          }
          if (a.oldest_unpaid_due_date) return -1;
          if (b.oldest_unpaid_due_date) return 1;
          return b.days_past_due - a.days_past_due;

        case "name_asc":
          return a.full_name.localeCompare(b.full_name);

        case "dpd_desc":
        default:
          if (b.days_past_due !== a.days_past_due) {
            return b.days_past_due - a.days_past_due;
          }
          return b.total_outstanding - a.total_outstanding;
      }
    });
  }, [associates, searchTerm, financialStatusFilter, bucketFilter, collectionStatusFilter, sortOption]);

  const resetFilters = () => {
    setSearchTerm("");
    setFinancialStatusFilter("ALL");
    setBucketFilter("ALL");
    setCollectionStatusFilter("ALL");
    setSortOption("dpd_desc");
  };

  const getFinancialStatusBadge = (status: AccountStatus) => {
    switch (status) {
      case "EN MORA":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300 inline-flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            EN MORA
          </span>
        );
      case "PENDIENTE":
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600" />
            PENDIENTE
          </span>
        );
      case "AL DÍA":
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            AL DÍA
          </span>
        );
    }
  };

  const getCollectionStatusBadge = (status: DerivedCollectionStatus) => {
    switch (status) {
      case "RESUELTO":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 inline-flex items-center gap-1">
            <Check className="w-3 h-3 text-slate-500" />
            Resuelto
          </span>
        );
      case "SIN_GESTION":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-900 border border-amber-200 inline-flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-amber-600" />
            Sin gestión
          </span>
        );
      case "ESCALADO":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-300 inline-flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-purple-700" />
            Escalado
          </span>
        );
      case "EN_DISPUTA":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-300 inline-flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-rose-700" />
            En disputa
          </span>
        );
      case "COMPROMISO_PAGO":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-300 inline-flex items-center gap-1">
            <MessageSquare className="w-3 h-3 text-blue-700" />
            Compromiso de pago
          </span>
        );
      case "SIN_RESPUESTA":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-900 border border-orange-300 inline-flex items-center gap-1">
            <PhoneCall className="w-3 h-3 text-orange-700" />
            Sin respuesta
          </span>
        );
      case "CONTACTADO":
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1">
            <UserCheck className="w-3 h-3 text-emerald-600" />
            Contactado
          </span>
        );
    }
  };

  const getFollowUpBadge = (state: FollowUpState) => {
    switch (state) {
      case "SCHEDULED":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-sky-50 text-sky-800 border border-sky-200 inline-flex items-center gap-1">
            <Calendar className="w-3 h-3 text-sky-600" />
            Programado
          </span>
        );
      case "DUE":
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-100 text-rose-900 border border-rose-400 inline-flex items-center gap-1 animate-pulse">
            <Clock className="w-3 h-3 text-rose-700" />
            Seguimiento vencido
          </span>
        );
      case "NONE":
      default:
        return (
          <span className="text-[11px] text-slate-400 font-normal">
            Sin seguimiento
          </span>
        );
    }
  };

  const overduePortfolioTotal = useMemo(() => {
    return getOverduePortfolioAmount(summary);
  }, [summary]);

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-1">
            <Link href="/admin/membresias" className="hover:underline flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Membresías
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-700">Cartera y Cobranza</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 font-heading">
            Cartera y Gestión de Cobranza
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Monitoreo en tiempo real de deudas, antigüedad de cartera (Aging Engine) y seguimiento operativo de cobro.
          </p>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void fetchCollectionsData()}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </Button>

          <Link href="/admin/membresias">
            <Button variant="ghost" size="sm">
              Ver Membresías
            </Button>
          </Link>
        </div>
      </div>

      {/* Primary KPI Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
            <div className="flex justify-between items-center text-slate-500 text-xs font-semibold uppercase tracking-wider">
              <span>Cartera Total</span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {formatMoney(summary.total_outstanding)}
            </div>
            <div className="text-xs text-slate-500">
              {summary.total_open_charges} cargos abiertos en total
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-rose-200 shadow-sm space-y-2 bg-rose-50/20">
            <div className="flex justify-between items-center text-rose-700 text-xs font-semibold uppercase tracking-wider">
              <span>Cartera Vencida (Mora)</span>
              <AlertTriangle className="w-4 h-4 text-rose-600" />
            </div>
            <div className="text-2xl font-bold text-rose-900">
              {formatMoney(overduePortfolioTotal)}
            </div>
            <div className="text-xs text-rose-700 font-medium">
              {summary.associates_en_mora} asociados en mora
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-amber-200 shadow-sm space-y-2 bg-amber-50/20">
            <div className="flex justify-between items-center text-amber-700 text-xs font-semibold uppercase tracking-wider">
              <span>Cartera Corriente</span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-2xl font-bold text-amber-900">
              {formatMoney(summary.current_amount)}
            </div>
            <div className="text-xs text-amber-700 font-medium">
              {summary.associates_pendiente} asociados en periodo corriente
            </div>
          </div>

          <div className="bg-white p-5 rounded-xl border border-emerald-200 shadow-sm space-y-2 bg-emerald-50/20">
            <div className="flex justify-between items-center text-emerald-700 text-xs font-semibold uppercase tracking-wider">
              <span>Asociados Al Día</span>
              <UserCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-emerald-900">
              {summary.associates_al_dia} / {summary.total_associates}
            </div>
            <div className="text-xs text-emerald-700 font-medium">
              Cuentas sin saldo pendiente
            </div>
          </div>
        </div>
      )}

      {/* Operational Sub-Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab("CARTERA")}
          className={`pb-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === "CARTERA"
              ? "border-[#006666] text-[#006666]"
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Vista General de Cartera</span>
        </button>

        <button
          onClick={() => setActiveTab("SEGUIMIENTOS")}
          className={`pb-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === "SEGUIMIENTOS"
              ? "border-[#006666] text-[#006666]"
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Cola de Seguimientos ({followUpQueue.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("PROMESAS")}
          className={`pb-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === "PROMESAS"
              ? "border-[#006666] text-[#006666]"
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          <DollarSign className="w-4 h-4" />
          <span>Monitor de Promesas ({promiseMonitor.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("SIMULACION")}
          className={`pb-3 font-bold text-sm flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            activeTab === "SIMULACION"
              ? "border-[#006666] text-[#006666]"
              : "border-transparent text-slate-400 hover:text-slate-700"
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Simulación de Automatizaciones</span>
        </button>
      </div>

      {/* Render Active Tab Content */}
      {activeTab === "SIMULACION" ? (
        <div className="space-y-6">
          {/* Explicit Read-Only Console Banner */}
          <div className="bg-indigo-950 text-white rounded-xl p-6 shadow-md border border-indigo-800 space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-indigo-800/80 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-900/80 rounded-lg border border-indigo-700">
                  <ShieldCheck className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold text-white font-heading">
                      VISTA PREVIA DE AUTOMATIZACIONES DE COBRANZA
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                      SOLO LECTURA
                    </span>
                  </div>
                  <p className="text-xs text-indigo-200 mt-0.5">
                    Esta simulación es estrictamente de solo lectura. No crea eventos en la base de datos ni envía comunicaciones por correo, WhatsApp o SMS.
                  </p>
                </div>
              </div>

              <Button
                onClick={() => void runSimulation()}
                disabled={simulationLoading}
                className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold flex items-center gap-2 shadow-sm cursor-pointer disabled:opacity-50"
              >
                {simulationLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                {simulationLoading ? "Evaluando cohorte..." : "Ejecutar Simulación"}
              </Button>
            </div>

            {simulationPreview && (
              <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-indigo-300 pt-1">
                <div className="flex items-center gap-4">
                  <span>
                    <strong>Zona horaria:</strong> {simulationPreview.timezone}
                  </span>
                  <span>•</span>
                  <span>
                    <strong>Fecha evaluada:</strong> {simulationPreview.eval_date}
                  </span>
                </div>
                <div>
                  <strong>Simulación generada:</strong>{" "}
                  {new Date(simulationPreview.generated_at).toLocaleString("es-CO", {
                    timeZone: "America/Bogota",
                    dateStyle: "medium",
                    timeStyle: "medium",
                  })} (America/Bogota)
                </div>
              </div>
            )}
          </div>

          {/* Simulation Error Display */}
          {simulationError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm flex items-center justify-between">
              <div className="flex items-center gap-2 font-medium">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span>{simulationError}</span>
              </div>
              <Button size="sm" variant="outline" onClick={() => void runSimulation()}>
                Reintentar
              </Button>
            </div>
          )}

          {/* Simulation Results Section */}
          {simulationPreview ? (
            <div className="space-y-6">
              {/* Simulation KPI Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-1">
                  <span className="text-xs font-semibold uppercase text-slate-500 block">
                    Asociados Evaluados
                  </span>
                  <span className="text-2xl font-bold text-slate-900">
                    {simulationPreview.total_associates_scanned}
                  </span>
                  <span className="text-xs text-slate-500 block">Cohorte total analizada</span>
                </div>

                <div className="bg-white p-5 rounded-xl border border-emerald-200 shadow-sm bg-emerald-50/20 space-y-1">
                  <span className="text-xs font-semibold uppercase text-emerald-700 block">
                    Candidatos Elegibles
                  </span>
                  <span className="text-2xl font-bold text-emerald-900">
                    {simulationPreview.total_candidates}
                  </span>
                  <span className="text-xs text-emerald-700 block">
                    Notificaciones en simulación (Preview)
                  </span>
                </div>

                <div className="bg-white p-5 rounded-xl border border-amber-200 shadow-sm bg-amber-50/20 space-y-1">
                  <span className="text-xs font-semibold uppercase text-amber-700 block">
                    Asociados Suprimidos
                  </span>
                  <span className="text-2xl font-bold text-amber-900">
                    {simulationPreview.total_suppressed}
                  </span>
                  <span className="text-xs text-amber-700 block">
                    Suprimidos por reglas u homólogos
                  </span>
                </div>
              </div>

              {/* Candidate Events Preview Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <div>
                    <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-emerald-600" />
                      Candidatos Elegibles a Comunicación ({simulationPreview.total_candidates})
                    </h4>
                    <p className="text-xs text-slate-500">
                      Eventos simulados con canal y fecha de referencia asignada determinísticamente
                    </p>
                  </div>
                </div>

                {simulationPreview.candidate_events.length === 0 ? (
                  <div className="p-10 text-center text-slate-500 space-y-2">
                    <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500" />
                    <p className="text-sm font-bold text-slate-700">
                      No hay comunicaciones elegibles en esta simulación.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead>Asociado</TableHead>
                        <TableHead>Correo Destino</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead className="text-right">Saldo Pendiente</TableHead>
                        <TableHead className="text-center">Mora</TableHead>
                        <TableHead>Disparador Elegible</TableHead>
                        <TableHead>Canal</TableHead>
                        <TableHead>Fecha Objetivo de Simulación</TableHead>
                        <TableHead className="text-right">Técnico</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {simulationPreview.candidate_events.map((candidate, idx) => {
                        const isExpanded = expandedIdempotencyKey === candidate.idempotency_key;
                        return (
                          <React.Fragment key={`${candidate.associate_id}-${idx}`}>
                            <TableRow className="hover:bg-slate-50/80">
                              <TableCell>
                                <div className="font-semibold text-slate-900 text-sm">
                                  {candidate.full_name}
                                </div>
                                <div className="text-[11px] text-slate-400 font-mono">
                                  {candidate.associate_id.slice(0, 8)}...
                                </div>
                              </TableCell>
                              <TableCell className="text-xs font-medium text-slate-700">
                                {candidate.recipient_email || "Sin correo"}
                              </TableCell>
                              <TableCell>{getFinancialStatusBadge(candidate.account_status)}</TableCell>
                              <TableCell className="text-right font-bold text-slate-900">
                                {formatMoney(candidate.total_outstanding)}
                              </TableCell>
                              <TableCell className="text-center">
                                <span className="font-extrabold text-rose-700 bg-rose-50 px-2 py-0.5 rounded text-xs">
                                  {candidate.days_past_due}d
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-50 text-indigo-900 border border-indigo-200">
                                  {getAutomationTriggerLabel(candidate.automation_type)}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  {getChannelLabel(candidate.channel)}
                                </span>
                              </TableCell>
                              <TableCell className="text-xs font-medium text-slate-700 font-mono">
                                {candidate.reference_date}
                              </TableCell>
                              <TableCell className="text-right flex items-center justify-end gap-2">
                                <Button
                                  size="xs"
                                  variant="outline"
                                  onClick={() => {
                                    setReservationFeedback(null);
                                    setSelectedCandidateForReservation(candidate);
                                  }}
                                  className="border-[#006666] text-[#006666] hover:bg-[#006666] hover:text-white font-bold cursor-pointer text-[11px]"
                                >
                                  Revisar reserva
                                </Button>
                                <Button
                                  size="xs"
                                  variant="ghost"
                                  onClick={() =>
                                    setExpandedIdempotencyKey(
                                      isExpanded ? null : candidate.idempotency_key
                                    )
                                  }
                                  className="text-slate-500 hover:text-slate-900 flex items-center gap-1"
                                >
                                  <Code className="w-3 h-3" />
                                  {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                </Button>
                              </TableCell>
                            </TableRow>
                            {isExpanded && (
                              <TableRow className="bg-slate-900 text-slate-200 font-mono text-xs">
                                <TableCell colSpan={9} className="p-3">
                                  <div className="space-y-1 text-left">
                                    <div>
                                      <strong className="text-amber-400">Idempotency Key:</strong> {candidate.idempotency_key}
                                    </div>
                                    <div>
                                      <strong className="text-indigo-300">Scheduled For Marker:</strong> {candidate.scheduled_for}
                                    </div>
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>

              {/* Suppressed Events Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <div>
                    <h4 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Eye className="w-4 h-4 text-amber-600" />
                      Asociados Suprimidos ({simulationPreview.total_suppressed})
                    </h4>
                    <p className="text-xs text-slate-500">
                      Detalle de asociados no elegibles y su motivo de supresión operacional
                    </p>
                  </div>
                </div>

                {simulationPreview.suppressed_events.length === 0 ? (
                  <div className="p-10 text-center text-slate-500 space-y-2">
                    <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500" />
                    <p className="text-sm font-bold text-slate-700">
                      No hay asociados suprimidos en esta simulación.
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead>Asociado</TableHead>
                        <TableHead>Estado Financiero</TableHead>
                        <TableHead className="text-right">Saldo Pendiente</TableHead>
                        <TableHead>Estado Cobranza</TableHead>
                        <TableHead>Motivo de Supresión</TableHead>
                        <TableHead className="text-right">Hito Evaluado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {simulationPreview.suppressed_events.map((supp, idx) => {
                        const meta = getSuppressionReasonMeta(supp.suppression_reason);
                        return (
                          <TableRow key={`${supp.associate_id}-${idx}`} className="hover:bg-slate-50/80">
                            <TableCell>
                              <div className="font-semibold text-slate-900 text-sm">
                                {supp.full_name}
                              </div>
                            </TableCell>
                            <TableCell>{getFinancialStatusBadge(supp.account_status as AccountStatus)}</TableCell>
                            <TableCell className="text-right font-bold text-slate-900">
                              {formatMoney(supp.total_outstanding)}
                            </TableCell>
                            <TableCell>{getCollectionStatusBadge(supp.collection_status as DerivedCollectionStatus)}</TableCell>
                            <TableCell>
                              <div>
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${meta.badgeClass}`}>
                                  {meta.label}
                                </span>
                                <p className="text-[11px] text-slate-500 mt-1">{meta.description}</p>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              {supp.trigger_code ? (
                                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300 font-mono">
                                  {supp.trigger_code}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400">N/A</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-slate-200 p-12 text-center space-y-4">
              <Sparkles className="w-10 h-10 mx-auto text-amber-500" />
              <div className="max-w-md mx-auto space-y-1">
                <h4 className="text-base font-bold text-slate-900">
                  Simulación de Automatizaciones Lista
                </h4>
                <p className="text-xs text-slate-500">
                  Haz clic en &quot;Ejecutar Simulación&quot; para evaluar la cohorte actual de asociados contra las reglas operativas de automatización.
                </p>
              </div>
              <Button
                onClick={() => void runSimulation()}
                disabled={simulationLoading}
                className="bg-[#006666] hover:bg-[#004d4d] text-white font-bold cursor-pointer disabled:opacity-50"
              >
                {simulationLoading ? "Ejecutando..." : "Ejecutar Simulación Ahora"}
              </Button>
            </div>
          )}
        </div>
      ) : activeTab === "SEGUIMIENTOS" ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Cola Operativa de Seguimientos Agendados</h3>
              <p className="text-xs text-slate-500">Ordenados por prioridad: Vencidos (America/Bogota) → Hoy → Mayor Deuda</p>
            </div>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              {followUpQueue.length} asociados pendientes de seguimiento
            </span>
          </div>

          {followUpQueue.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-2">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500" />
              <p className="text-sm font-bold text-slate-700">No hay seguimientos pendientes en la cola</p>
              <p className="text-xs text-slate-400">Todos los seguimientos están al día o no tienen fecha agendada.</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Prioridad / Urgencia</TableHead>
                  <TableHead>Asociado</TableHead>
                  <TableHead>Fecha Agendada (Bogotá)</TableHead>
                  <TableHead className="text-right">Saldo Deuda</TableHead>
                  <TableHead className="text-center">Días Mora</TableHead>
                  <TableHead>Estado Cobranza</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {followUpQueue.map((item) => {
                  const formattedDate = new Date(item.follow_up_date).toLocaleString("es-CO", {
                    timeZone: "America/Bogota",
                    dateStyle: "medium",
                    timeStyle: "short",
                  });

                  return (
                    <TableRow key={item.associate_id} className="hover:bg-slate-50/80">
                      <TableCell>
                        {item.follow_up_urgency === "OVERDUE" ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-100 text-rose-800 border border-rose-300 inline-flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3 text-rose-600" /> VENCIDO
                          </span>
                        ) : item.follow_up_urgency === "DUE_TODAY" ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-100 text-blue-800 border border-blue-300 inline-flex items-center gap-1">
                            <Clock className="w-3 h-3 text-blue-600" /> VENCE HOY
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-slate-100 text-slate-700 border border-slate-300">
                            PRÓXIMO
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-slate-900 text-sm">{item.full_name}</div>
                        <div className="text-xs text-slate-500">{item.email}</div>
                      </TableCell>
                      <TableCell className="font-medium text-slate-900 text-xs">{formattedDate}</TableCell>
                      <TableCell className="text-right font-bold text-slate-900">{formatMoney(item.total_outstanding)}</TableCell>
                      <TableCell className="text-center">
                        <span className="font-extrabold text-rose-700 bg-rose-50 px-2 py-0.5 rounded text-xs">{item.days_past_due}d</span>
                      </TableCell>
                      <TableCell>{getCollectionStatusBadge(item.collection_status)}</TableCell>
                      <TableCell className="text-right">
                        <Link href={`/admin/membresias/${item.associate_id}`}>
                          <Button size="xs" className="bg-[#006666] hover:bg-[#004d4d] text-white">
                            Gestionar
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      ) : activeTab === "PROMESAS" ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-900">Monitor de Promesas de Pago</h3>
              <p className="text-xs text-slate-500">Clasificación operacional de compromisos acordados con los asociados</p>
            </div>
            <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
              {promiseMonitor.length} promesas registradas
            </span>
          </div>

          {promiseMonitor.length === 0 ? (
            <div className="p-12 text-center text-slate-500 space-y-2">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500" />
              <p className="text-sm font-bold text-slate-700">No hay promesas de pago registradas</p>
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Estado Promesa</TableHead>
                  <TableHead>Asociado</TableHead>
                  <TableHead>Fecha Prometida</TableHead>
                  <TableHead className="text-right">Monto Prometido</TableHead>
                  <TableHead className="text-right">Saldo Actual Deuda</TableHead>
                  <TableHead className="text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promiseMonitor.map((item) => (
                  <TableRow key={item.associate_id} className="hover:bg-slate-50/80">
                    <TableCell>
                      {item.promise_status === "FULFILLED" ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> CUMPLIDA
                        </span>
                      ) : item.promise_status === "OVERDUE" ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-100 text-rose-800 border border-rose-300 inline-flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-rose-600" /> VENCIDA
                        </span>
                      ) : item.promise_status === "DUE_TODAY" ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-1">
                          <Clock className="w-3 h-3 text-amber-600" /> VENCE HOY
                        </span>
                      ) : item.promise_status === "UNSCHEDULED" ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-50 text-amber-900 border border-amber-300">
                          SIN FECHA
                        </span>
                      ) : item.promise_status === "SUPERSEDED" ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-slate-100 text-slate-600 border border-slate-300">
                          SUSTITUIDA
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-blue-100 text-blue-800 border border-blue-300">
                          VIGENTE
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-slate-900 text-sm">{item.full_name}</div>
                      <div className="text-xs text-slate-500">{item.email}</div>
                    </TableCell>
                    <TableCell className="font-medium text-slate-900 text-xs">
                      {item.promised_payment_date || "No especificada"}
                    </TableCell>
                    <TableCell className="text-right font-bold text-slate-900">
                      {item.promised_payment_amount ? formatMoney(item.promised_payment_amount) : "N/A"}
                    </TableCell>
                    <TableCell className="text-right font-bold text-slate-900">
                      {formatMoney(item.total_outstanding)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Link href={`/admin/membresias/${item.associate_id}`}>
                        <Button size="xs" className="bg-[#006666] hover:bg-[#004d4d] text-white">
                          Ver Ficha
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      ) : (
        /* Main Table Section with Controls */
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Controls Bar */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-3">
            {/* Search Bar */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder="Buscar por nombre, documento o correo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-white"
              />
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={financialStatusFilter}
                onChange={(e) => setFinancialStatusFilter(e.target.value)}
                className="h-10 px-3 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white shadow-xs focus:ring-2 focus:ring-[#006666] outline-none cursor-pointer"
              >
                <option value="ALL">Todos Financiero</option>
                <option value="EN MORA">EN MORA</option>
                <option value="PENDIENTE">PENDIENTE</option>
                <option value="AL DÍA">AL DÍA</option>
              </select>

              <select
                value={bucketFilter}
                onChange={(e) => setBucketFilter(e.target.value)}
                className="h-10 px-3 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white shadow-xs focus:ring-2 focus:ring-[#006666] outline-none cursor-pointer"
              >
                <option value="ALL">Todos Buckets</option>
                <option value="CURRENT">CURRENT (0d)</option>
                <option value="1-30 días">1-30 días</option>
                <option value="31-60 días">31-60 días</option>
                <option value="61-90 días">61-90 días</option>
                <option value="91-120 días">91-120 días</option>
                <option value="+120 días">+120 días</option>
              </select>

              <select
                value={collectionStatusFilter}
                onChange={(e) => setCollectionStatusFilter(e.target.value)}
                className="h-10 px-3 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 bg-white shadow-xs focus:ring-2 focus:ring-[#006666] outline-none cursor-pointer"
              >
                <option value="ALL">Todos Cobranza</option>
                <option value="SIN_GESTION">Sin gestión</option>
                <option value="CONTACTADO">Contactado</option>
                <option value="COMPROMISO_PAGO">Compromiso de pago</option>
                <option value="SIN_RESPUESTA">Sin respuesta</option>
                <option value="EN_DISPUTA">En disputa</option>
                <option value="ESCALADO">Escalado</option>
                <option value="RESUELTO">Resuelto</option>
              </select>

              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="h-10 px-3 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 bg-white shadow-xs focus:ring-2 focus:ring-[#006666] outline-none cursor-pointer"
              >
                <option value="dpd_desc">Mayor Días Mora</option>
                <option value="outstanding_desc">Mayor Saldo Deuda</option>
                <option value="oldest_due_asc">Deuda Más Antigua</option>
                <option value="name_asc">Nombre (A-Z)</option>
              </select>

              {(searchTerm || financialStatusFilter !== "ALL" || bucketFilter !== "ALL" || collectionStatusFilter !== "ALL" || sortOption !== "dpd_desc") && (
                <Button variant="ghost" size="sm" onClick={resetFilters} className="text-xs text-slate-500 h-10">
                  Limpiar
                </Button>
              )}
            </div>
          </div>

          {/* Table Content */}
          {loading ? (
            <div className="p-16 text-center text-slate-500 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#006666]" />
              <p className="text-sm font-medium">Cargando antigüedad de cartera y gestiones de cobranza...</p>
            </div>
          ) : error ? (
            <div className="p-12 text-center text-rose-600 space-y-3 bg-rose-50/50">
              <AlertTriangle className="w-8 h-8 mx-auto text-rose-500" />
              <p className="text-sm font-semibold">{error}</p>
              <Button variant="outline" size="sm" onClick={() => void fetchCollectionsData()}>
                Reintentar
              </Button>
            </div>
          ) : filteredAssociates.length === 0 ? (
            <div className="p-16 text-center text-slate-500 space-y-3">
              <Filter className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-base font-semibold text-slate-700">No se encontraron asociados en la cartera</p>
              <p className="text-xs text-slate-500">
                Prueba cambiando o limpiando los filtros aplicados.
              </p>
              {(searchTerm || financialStatusFilter !== "ALL" || bucketFilter !== "ALL" || collectionStatusFilter !== "ALL") && (
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  Limpiar Filtros
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[200px]">Asociado</TableHead>
                  <TableHead className="w-[120px]">Estado Financiero</TableHead>
                  <TableHead className="w-[120px] text-right">Saldo Deuda</TableHead>
                  <TableHead className="w-[90px] text-center">Mora (Días)</TableHead>
                  <TableHead className="w-[120px]">Bucket Antigüedad</TableHead>
                  <TableHead className="w-[140px]">Estado Cobranza</TableHead>
                  <TableHead className="w-[140px]">Seguimiento</TableHead>
                  <TableHead className="w-[90px] text-right">Ficha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAssociates.map((assoc) => (
                  <TableRow key={assoc.associate_id} className="hover:bg-slate-50/80">
                    <TableCell>
                      <div className="font-bold text-slate-900 text-sm">{assoc.full_name}</div>
                      <div className="text-xs text-slate-500">{assoc.email}</div>
                      {assoc.document_number && (
                        <div className="text-[11px] text-slate-400 font-mono">Doc: {assoc.document_number}</div>
                      )}
                    </TableCell>
                    <TableCell>{getFinancialStatusBadge(assoc.account_status)}</TableCell>
                    <TableCell className="text-right font-extrabold text-slate-900">{formatMoney(assoc.total_outstanding)}</TableCell>
                    <TableCell className="text-center font-bold">
                      {assoc.days_past_due > 0 ? (
                        <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded text-xs">{assoc.days_past_due}d</span>
                      ) : (
                        <span className="text-slate-400 text-xs">0d</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-slate-700">{assoc.aging_bucket}</TableCell>
                    <TableCell>{getCollectionStatusBadge(assoc.collection_status)}</TableCell>
                    <TableCell>{getFollowUpBadge(assoc.follow_up_state)}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/admin/membresias/${assoc.associate_id}`}>
                        <Button size="xs" variant="outline" className="text-slate-700 border-slate-300">
                          Ver Ficha
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      )}

      {/* Reservation Confirmation Modal (Fase 4A5.2-E3.2 Two-Step Admin Confirmation) */}
      {selectedCandidateForReservation && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-lg">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
                Revisar y Confirmar Reserva de Notificación
              </div>
              <button
                onClick={() => {
                  setSelectedCandidateForReservation(null);
                  setReservationFeedback(null);
                }}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {reservationFeedback ? (
              <div className="space-y-4">
                <div
                  className={`p-4 rounded-xl border text-xs space-y-1 ${
                    reservationFeedback.outcome === "RESERVED"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                      : reservationFeedback.outcome === "ALREADY_RESERVED"
                      ? "bg-blue-50 border-blue-200 text-blue-900"
                      : "bg-amber-50 border-amber-200 text-amber-900"
                  }`}
                >
                  <p className="font-bold text-sm">
                    Resultado: {reservationFeedback.outcome}
                  </p>
                  <p>{reservationFeedback.message}</p>
                </div>
                <div className="text-right">
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedCandidateForReservation(null);
                      setReservationFeedback(null);
                    }}
                    className="bg-slate-800 hover:bg-slate-900 text-white font-bold cursor-pointer"
                  >
                    Cerrar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-xs text-slate-700">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Asociado:</span>
                    <strong className="text-slate-900">{selectedCandidateForReservation.full_name}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Hito Operativo:</span>
                    <span className="font-bold text-indigo-700 font-mono">
                      {getAutomationTriggerLabel(selectedCandidateForReservation.automation_type)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Canal de Salida:</span>
                    <span className="font-bold text-emerald-700">
                      {getChannelLabel(selectedCandidateForReservation.channel)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Fecha Objetivo:</span>
                    <span className="font-mono text-slate-800">{selectedCandidateForReservation.reference_date}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-medium">Saldo Pendiente:</span>
                    <strong className="text-slate-900">{formatMoney(selectedCandidateForReservation.total_outstanding)}</strong>
                  </div>
                </div>

                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-[11px] leading-relaxed flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Advertencia de Reserva (Fase 4A5.2-E3.2):</strong> Esta acción registrará un evento con estado <code className="font-mono font-bold bg-amber-100 px-1 rounded text-amber-950">QUEUED</code> en la base de datos de notificaciones. NO se enviará ningún correo ni mensaje externo en este paso.
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedCandidateForReservation(null);
                      setReservationFeedback(null);
                    }}
                    disabled={reservationSubmitting}
                    className="cursor-pointer"
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => void confirmReservation()}
                    disabled={reservationSubmitting}
                    className="bg-[#006666] hover:bg-[#004d4d] text-white font-bold flex items-center gap-2 cursor-pointer"
                  >
                    {reservationSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Procesando...
                      </>
                    ) : (
                      "Confirmar Reserva de Notificación"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
