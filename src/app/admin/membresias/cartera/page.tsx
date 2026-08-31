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
  ArrowRight,
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
  FollowUpQueueItem,
  PaymentPromiseItem,
} from "@/lib/collections/collections-queue-service";

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
  const [activeTab, setActiveTab] = useState<"CARTERA" | "SEGUIMIENTOS" | "PROMESAS">("CARTERA");
  const [searchTerm, setSearchTerm] = useState("");
  const [financialStatusFilter, setFinancialStatusFilter] = useState<string>("ALL");
  const [bucketFilter, setBucketFilter] = useState<string>("ALL");
  const [collectionStatusFilter, setCollectionStatusFilter] = useState<string>("ALL");
  const [sortOption, setSortOption] = useState<string>("dpd_desc");

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
      // Búsqueda
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

      // Filtro Estado Financiero
      if (financialStatusFilter !== "ALL" && item.account_status !== financialStatusFilter) {
        return false;
      }

      // Filtro Bucket
      if (bucketFilter !== "ALL" && item.aging_bucket !== bucketFilter) {
        return false;
      }

      // Filtro Estado Operativo
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

  // Helper Badges
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

      {/* Aging Bucket Strip */}
      {summary && (
        <div className="bg-slate-900 text-white rounded-xl p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
            <Layers className="w-4 h-4 text-amber-400" />
            <span>Distribución de Cartera por Antigüedad (Aging Buckets)</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1 text-center">
            <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">Corriente (0d)</span>
              <span className="text-sm font-bold text-slate-100">{formatMoney(summary.current_amount)}</span>
            </div>
            <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
              <span className="text-[10px] text-amber-400 uppercase font-bold block">1 - 30 Días</span>
              <span className="text-sm font-bold text-slate-100">{formatMoney(summary.days_1_30)}</span>
            </div>
            <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
              <span className="text-[10px] text-orange-400 uppercase font-bold block">31 - 60 Días</span>
              <span className="text-sm font-bold text-slate-100">{formatMoney(summary.days_31_60)}</span>
            </div>
            <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
              <span className="text-[10px] text-rose-400 uppercase font-bold block">61 - 90 Días</span>
              <span className="text-sm font-bold text-slate-100">{formatMoney(summary.days_61_90)}</span>
            </div>
            <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
              <span className="text-[10px] text-rose-500 uppercase font-bold block">91 - 120 Días</span>
              <span className="text-sm font-bold text-slate-100">{formatMoney(summary.days_91_120)}</span>
            </div>
            <div className="bg-slate-800/80 p-3 rounded-lg border border-slate-700">
              <span className="text-[10px] text-purple-400 uppercase font-bold block">+120 Días</span>
              <span className="text-sm font-bold text-slate-100">{formatMoney(summary.days_over_120)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Operational KPIs Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-rose-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-rose-600 block">Seguimientos Vencidos</span>
          <span className="text-xl font-black text-rose-900">{operationalKPIs.follow_ups_overdue_count}</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-blue-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-blue-600 block">Seguimientos Hoy</span>
          <span className="text-xl font-black text-blue-900">{operationalKPIs.follow_ups_today_count}</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-emerald-600 block">Promesas Activas</span>
          <span className="text-xl font-black text-emerald-900">{operationalKPIs.promises_active_count}</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-amber-600 block">Promesas Vencidas</span>
          <span className="text-xl font-black text-amber-900">{operationalKPIs.promises_overdue_count}</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-purple-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-purple-600 block">Casos Escalados</span>
          <span className="text-xl font-black text-purple-900">{operationalKPIs.escalated_count}</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-rose-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-rose-700 block">Casos en Disputa</span>
          <span className="text-xl font-black text-rose-950">{operationalKPIs.disputed_count}</span>
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-[10px] font-bold uppercase text-slate-500 block">Sin Gestión</span>
          <span className="text-xl font-black text-slate-800">{operationalKPIs.sin_gestion_count}</span>
        </div>
      </div>

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
      </div>

      {/* Render Active Tab Content */}
      {activeTab === "SEGUIMIENTOS" ? (
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

          {/* Filters using styled native selects matching project design */}
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
                <TableHead className="w-[240px]">Asociado</TableHead>
                <TableHead>Estado Financiero</TableHead>
                <TableHead>Estado Cobranza</TableHead>
                <TableHead>Seguimiento</TableHead>
                <TableHead className="text-right">Saldo Deuda</TableHead>
                <TableHead className="text-center">Días Mora (DPD)</TableHead>
                <TableHead>Bucket</TableHead>
                <TableHead>Vencimiento Más Antiguo</TableHead>
                <TableHead className="text-center">Cargos</TableHead>
                <TableHead className="text-right">Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAssociates.map((item) => (
                <TableRow key={item.associate_id} className="hover:bg-slate-50/80 transition-colors">
                  <TableCell>
                    <div className="font-semibold text-slate-900 text-sm">
                      {item.full_name}
                    </div>
                    <div className="text-xs text-slate-500">
                      {item.email} {item.document_number ? `• Doc: ${item.document_number}` : ""}
                    </div>
                  </TableCell>

                  <TableCell>
                    {getFinancialStatusBadge(item.account_status)}
                  </TableCell>

                  <TableCell>
                    {getCollectionStatusBadge(item.collection_status)}
                  </TableCell>

                  <TableCell>
                    {getFollowUpBadge(item.follow_up_state)}
                  </TableCell>

                  <TableCell className="text-right font-bold text-slate-900">
                    {formatMoney(item.total_outstanding)}
                  </TableCell>

                  <TableCell className="text-center">
                    {item.days_past_due > 0 ? (
                      <span className="font-extrabold text-rose-700 bg-rose-50 px-2 py-0.5 rounded text-xs">
                        {item.days_past_due}d
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">0d</span>
                    )}
                  </TableCell>

                  <TableCell>
                    <span className="text-xs font-medium text-slate-700">
                      {item.aging_bucket}
                    </span>
                  </TableCell>

                  <TableCell className="text-xs text-slate-600">
                    {item.oldest_unpaid_due_date || "N/A"}
                  </TableCell>

                  <TableCell className="text-center font-medium text-xs text-slate-700">
                    {item.open_charge_count}
                  </TableCell>

                  <TableCell className="text-right">
                    <Link href={`/admin/membresias/${item.associate_id}`}>
                      <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                        Ver Detalle <ArrowRight className="w-3 h-3" />
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
    </div>
  );
}
