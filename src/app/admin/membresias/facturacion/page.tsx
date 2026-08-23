"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  Calendar,
  DollarSign,
  History,
  Activity,
  Layers,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface BillingCandidate {
  membershipId: string;
  associateId: string;
  associateName: string;
  planId: string;
  planName: string;
  billingCycleKey: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
  amount: number;
  currency: string;
  concept: string;
}

interface BillingPreviewData {
  today: string;
  scanned: number;
  eligible: number;
  candidatesCount: number;
  skipped: {
    free: number;
    manual: number;
    inactive_associate: number;
    inactive_plan: number;
    paused_or_terminated: number;
    unsupported_interval: number;
    existing_cycle: number;
    existing_cycle_key: number;
    existing_period_charge: number;
    invalid_anchor_configuration: number;
    future_first_cycle: number;
  };
  candidates: BillingCandidate[];
  catchUpLimitedMembershipsCount: number;
}

interface RecentSystemCharge {
  id: string;
  associateName: string;
  concept: string;
  originalAmount: number;
  currency: string;
  dueDate: string;
  periodStart: string | null;
  periodEnd: string | null;
  adminStatus: string;
  createdAt: string;
}

interface BillingMonitorData {
  monthSystemChargesCount: number;
  monthSystemChargesAmount: number;
  latestSystemChargeDate: string | null;
  recentSystemCharges: RecentSystemCharge[];
}

export default function BillingSchedulerMonitorPage() {
  const [preview, setPreview] = useState<BillingPreviewData | null>(null);
  const [monitor, setMonitor] = useState<BillingMonitorData | null>(null);

  const [loadingPreview, setLoadingPreview] = useState(true);
  const [loadingMonitor, setLoadingMonitor] = useState(true);

  const [previewError, setPreviewError] = useState<string | null>(null);
  const [monitorError, setMonitorError] = useState<string | null>(null);

  const formatMoney = (amount: number, currency = "COP") => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: currency || "COP",
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "N/A";
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("es-CO", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateTimeStr: string | null) => {
    if (!dateTimeStr) return "Ningún cargo registrado";
    try {
      const d = new Date(dateTimeStr);
      return d.toLocaleString("es-CO", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateTimeStr;
    }
  };

  const fetchPreviewData = useCallback(async () => {
    setLoadingPreview(true);
    setPreviewError(null);
    try {
      const res = await fetch("/api/admin/memberships/billing-preview");
      const isJson = res.headers.get("content-type")?.includes("application/json");

      if (!res.ok || !isJson) {
        throw new Error(`Error en servidor (${res.status}). No se recibió una respuesta JSON válida.`);
      }

      const json = await res.json();
      if (!json.success || !json.data) {
        throw new Error(json.error || "No se pudo cargar la simulación de facturación.");
      }

      setPreview(json.data);
    } catch (err: unknown) {
      setPreviewError(err instanceof Error ? err.message : "Error al cargar la simulación.");
    } finally {
      setLoadingPreview(false);
    }
  }, []);

  const fetchMonitorData = useCallback(async () => {
    setLoadingMonitor(true);
    setMonitorError(null);
    try {
      const res = await fetch("/api/admin/memberships/billing-monitor");
      const isJson = res.headers.get("content-type")?.includes("application/json");

      if (!res.ok || !isJson) {
        throw new Error(`Error en servidor (${res.status}). No se recibió una respuesta JSON válida.`);
      }

      const json = await res.json();
      if (!json.success || !json.data) {
        throw new Error(json.error || "No se pudieron cargar las métricas de cargos automáticos.");
      }

      setMonitor(json.data);
    } catch (err: unknown) {
      setMonitorError(err instanceof Error ? err.message : "Error al cargar métricas del monitor.");
    } finally {
      setLoadingMonitor(false);
    }
  }, []);

  useEffect(() => {
    void fetchPreviewData();
    void fetchMonitorData();
  }, [fetchPreviewData, fetchMonitorData]);

  const handleRefreshAll = () => {
    void fetchPreviewData();
    void fetchMonitorData();
  };

  return (
    <div className="space-y-8">
      {/* Header Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-500 mb-1">
            <Link
              href="/admin/membresias"
              className="text-sm font-semibold hover:text-[#006666] flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Membresías y Cartera
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 font-heading">
            Facturación Automática
          </h1>
          <p className="text-slate-500">
            Monitoreo en tiempo real del motor de facturación programada y simulación de próximas cuotas.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={handleRefreshAll}
            className="h-12 px-5 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 gap-2 font-bold shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${loadingPreview || loadingMonitor ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
          <Link href="/admin/membresias/planes">
            <Button
              variant="outline"
              className="h-12 px-5 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 gap-2 font-bold shadow-xs"
            >
              <Layers className="w-5 h-5 text-[#006666]" />
              Catálogo de Planes
            </Button>
          </Link>
        </div>
      </div>

      {/* Banner de Estado del Scheduler */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-[#004d4d] text-white rounded-3xl p-6 shadow-md border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              CONFIGURADO
            </span>
            <span className="text-xs text-slate-300 font-medium">
              Vercel Cron Scheduler
            </span>
          </div>
          <h2 className="text-xl font-bold font-heading pt-1">
            Programado diariamente alrededor de las 00:10 hora Colombia
          </h2>
          <p className="text-sm text-slate-300">
            La ejecución automática es administrada por Vercel Cron en entorno de producción (05:10 UTC).
          </p>
        </div>

        <div className="text-xs text-slate-300 bg-white/10 backdrop-blur-xs px-4 py-3 rounded-2xl border border-white/10 space-y-1">
          <div className="font-bold text-white">Evaluación Inteligente</div>
          <div>Zona Horaria: America/Bogota</div>
          <div>Catch-up Máximo: 6 ciclos / run</div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Candidatos Hoy */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-teal-600">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Candidatos Hoy
            </span>
            <div className="w-10 h-10 rounded-2xl bg-teal-50 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">
            {loadingPreview ? (
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            ) : (
              preview?.candidatesCount ?? 0
            )}
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Membresías listas para generar cuota hoy
          </p>
        </div>

        {/* Card 2: Cargos Automáticos del Mes */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Cargos Automáticos (Mes)
            </span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">
            {loadingMonitor ? (
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            ) : (
              monitor?.monthSystemChargesCount ?? 0
            )}
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Monto: {formatMoney(monitor?.monthSystemChargesAmount || 0)}
          </p>
        </div>

        {/* Card 3: Alertas Catch-Up */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Alertas Catch-Up
            </span>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">
            {loadingPreview ? (
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            ) : (
              preview?.catchUpLimitedMembershipsCount ?? 0
            )}
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Membresías al límite máximo (6 ciclos)
          </p>
        </div>

        {/* Card 4: Último Cargo Automático */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-blue-600">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Último Cargo Automático
            </span>
            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
          </div>
          <div className="text-sm font-black text-slate-900 truncate">
            {loadingMonitor ? (
              <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
            ) : (
              formatDateTime(monitor?.latestSystemChargeDate || null)
            )}
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Fecha del último registro en sistema
          </p>
        </div>
      </div>

      {/* Banners de Alerta Informativos */}
      {preview && ((preview.catchUpLimitedMembershipsCount ?? 0) > 0 || (preview.skipped?.invalid_anchor_configuration ?? 0) > 0 || (preview.skipped?.unsupported_interval ?? 0) > 0) && (
        <div className="space-y-3">
          {(preview.catchUpLimitedMembershipsCount ?? 0) > 0 && (
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 text-sm">
              <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Atención Catch-Up:</span> Hay {preview.catchUpLimitedMembershipsCount} membresía(s) que alcanzaron el límite de facturación de 6 ciclos acumulados por ejecución. Los ciclos restantes se procesarán en ejecuciones subsiguientes.
              </div>
            </div>
          )}
          {(preview.skipped?.invalid_anchor_configuration ?? 0) > 0 && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3 text-sm">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Configuración Inválida:</span> Existen {preview.skipped.invalid_anchor_configuration} plan(es) con día de anclaje fuera de rango. Por favor revise el catálogo de planes.
              </div>
            </div>
          )}
          {(preview.skipped?.unsupported_interval ?? 0) > 0 && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3 text-sm">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Intervalo No Soportado:</span> Existen {preview.skipped.unsupported_interval} plan(es) con intervalo de facturación no soportado.
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sección 1: Simulación de Facturación Pendiente (Preview) */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 font-heading flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#006666]" />
              Simulación de Facturación Pendiente (Dry-Run)
            </h2>
            <p className="text-xs text-slate-500">
              Candidatos evaluados en tiempo real por el Billing Engine para la fecha de hoy.
            </p>
          </div>

          <div className="text-xs font-semibold text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200">
            Escaneadas: {preview?.scanned || 0} | Elegibles: {preview?.eligible || 0}
          </div>
        </div>

        {loadingPreview ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#006666]" />
            <p className="text-sm font-medium">Evaluando candidatos de facturación...</p>
          </div>
        ) : previewError ? (
          <div className="p-8 text-center text-rose-600 space-y-3">
            <AlertTriangle className="w-8 h-8 mx-auto text-rose-500" />
            <p className="text-sm font-bold">{previewError}</p>
            <Button variant="outline" size="sm" onClick={fetchPreviewData} className="rounded-xl">
              Reintentar Simulación
            </Button>
          </div>
        ) : preview?.candidatesCount === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              No hay cuotas pendientes por generar para el día de hoy.
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              El motor de facturación revisó las membresías activas y no encontró nuevos ciclos mensuales exigibles pendientes de emisión.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="font-bold text-slate-700">Asociado</TableHead>
                  <TableHead className="font-bold text-slate-700">Plan</TableHead>
                  <TableHead className="font-bold text-slate-700">Período a Facturar</TableHead>
                  <TableHead className="font-bold text-slate-700">Vencimiento</TableHead>
                  <TableHead className="font-bold text-slate-700 text-right">Monto Cuota</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {preview?.candidates.map((cand) => (
                  <TableRow key={cand.billingCycleKey} className="hover:bg-slate-50/60">
                    <TableCell className="font-bold text-slate-900">
                      {cand.associateName}
                    </TableCell>
                    <TableCell className="text-slate-600 font-medium">
                      {cand.planName}
                    </TableCell>
                    <TableCell className="text-slate-600 text-xs">
                      {formatDate(cand.periodStart)} – {formatDate(cand.periodEnd)}
                    </TableCell>
                    <TableCell className="text-slate-600 text-xs font-semibold">
                      {formatDate(cand.dueDate)}
                    </TableCell>
                    <TableCell className="font-black text-slate-900 text-right">
                      {formatMoney(cand.amount, cand.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Sección 2: Cargos Automáticos Recientes (System Source) */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900 font-heading flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-600" />
            Cargos Automáticos Recientes (`source = system`)
          </h2>
          <p className="text-xs text-slate-500">
            Últimos 10 cargos generados automáticamente en la base de datos por el motor de facturación.
          </p>
        </div>

        {loadingMonitor ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-600" />
            <p className="text-sm font-medium">Cargando cargos automáticos recientes...</p>
          </div>
        ) : monitorError ? (
          <div className="p-8 text-center text-rose-600 space-y-3">
            <AlertTriangle className="w-8 h-8 mx-auto text-rose-500" />
            <p className="text-sm font-bold">{monitorError}</p>
            <Button variant="outline" size="sm" onClick={fetchMonitorData} className="rounded-xl">
              Reintentar Carga de Métricas
            </Button>
          </div>
        ) : !monitor?.recentSystemCharges.length ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <History className="w-8 h-8 mx-auto text-slate-300" />
            <p className="text-sm font-medium text-slate-600">Ningún cargo automático registrado aún.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="font-bold text-slate-700">Fecha Registro</TableHead>
                  <TableHead className="font-bold text-slate-700">Asociado</TableHead>
                  <TableHead className="font-bold text-slate-700">Concepto</TableHead>
                  <TableHead className="font-bold text-slate-700">Período</TableHead>
                  <TableHead className="font-bold text-slate-700">Estado</TableHead>
                  <TableHead className="font-bold text-slate-700 text-right">Monto Original</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monitor.recentSystemCharges.map((charge) => (
                  <TableRow key={charge.id} className="hover:bg-slate-50/60">
                    <TableCell className="text-xs text-slate-500 font-medium">
                      {formatDateTime(charge.createdAt)}
                    </TableCell>
                    <TableCell className="font-bold text-slate-900">
                      {charge.associateName}
                    </TableCell>
                    <TableCell className="text-slate-600 text-xs">
                      {charge.concept}
                    </TableCell>
                    <TableCell className="text-slate-600 text-xs">
                      {formatDate(charge.periodStart)} – {formatDate(charge.periodEnd)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                          charge.adminStatus === "open"
                            ? "bg-amber-100 text-amber-800 border border-amber-300"
                            : "bg-slate-100 text-slate-700 border border-slate-300"
                        }`}
                      >
                        {charge.adminStatus}
                      </span>
                    </TableCell>
                    <TableCell className="font-black text-slate-900 text-right">
                      {formatMoney(charge.originalAmount, charge.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
