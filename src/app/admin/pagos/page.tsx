"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  CreditCard,
  Search,
  Filter,
  RefreshCw,
  Clock,
  CheckCircle2,
  Receipt,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BrebReconciliationTable } from "@/components/admin/payments/BrebReconciliationTable";
import { PaymentOrderRecord } from "@/components/admin/payments/BrebPaymentDetailDialog";

export default function PaymentsAdminPage() {
  const [orders, setOrders] = useState<PaymentOrderRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtros y Errores
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);

      const params = new URLSearchParams();
      if (methodFilter !== "all") params.set("method", methodFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/admin/payments?${params.toString()}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        console.error("Error al cargar órdenes de pago:", data.error);
        if (res.status === 401) {
          setLoadError("Tu sesión ha expirado. Inicia sesión nuevamente.");
        } else if (res.status === 403) {
          setLoadError("No tienes permisos para consultar las órdenes de pago.");
        } else if (res.status === 400) {
          setLoadError(data.error || "Filtros de consulta inválidos.");
        } else {
          setLoadError("No fue posible cargar las órdenes de pago. Intenta nuevamente.");
        }
        return;
      }

      setOrders((data.orders as PaymentOrderRecord[]) || []);
      setLoadError(null);
    } catch (err: unknown) {
      console.error("Excepción en la consulta de pagos:", err);
      setLoadError("No fue posible cargar las órdenes de pago. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }, [methodFilter, statusFilter, searchQuery]);

  useEffect(() => {
    let isMounted = true;

    async function init() {
      await loadOrders();
      if (!isMounted) return;
    }

    void init();

    return () => {
      isMounted = false;
    };
  }, [loadOrders]);

  // Contadores para KPI Badges
  const pendingCount = useMemo(
    () => orders.filter((o) => o.status === "pending_verification").length,
    [orders]
  );

  const paidCount = useMemo(
    () => orders.filter((o) => o.status === "paid").length,
    [orders]
  );

  const totalAmount = useMemo(
    () =>
      orders
        .filter((o) => o.status === "paid")
        .reduce((sum, o) => sum + Number(o.amount || 0), 0),
    [orders]
  );

  const formattedTotalAmount = new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(totalAmount);

  return (
    <div className="p-6 md:p-10 space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 text-slate-800 text-xs font-bold rounded-full uppercase tracking-wider mb-2">
            <Receipt className="w-3.5 h-3.5 text-slate-600" />
            Módulo de Finanzas & Conciliación
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 font-heading">
            Gestión de Órdenes de Pago
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Administra las órdenes de pago recibidas vía Bre-B (Banco de Bogotá QR) y pasarela Openpay.
          </p>
        </div>

        <Button
          type="button"
          onClick={() => loadOrders()}
          disabled={loading}
          className="bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl h-12 px-6 flex items-center gap-2 shadow-sm shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refrescar Lista
        </Button>
      </div>

      {/* Tarjetas de Resumen KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* KPI: Pendientes de Verificación */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Pendientes de Verificación
            </span>
            <span className="text-3xl font-extrabold text-amber-600 font-heading">
              {pendingCount}
            </span>
            <span className="text-[11px] text-slate-400 block font-medium">
              Transferencias Bre-B por revisar
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        {/* KPI: Órdenes Confirmadas */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Órdenes Aprobadas
            </span>
            <span className="text-3xl font-extrabold text-emerald-600 font-heading">
              {paidCount}
            </span>
            <span className="text-[11px] text-slate-400 block font-medium">
              Pagos validados y confirmados
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        {/* KPI: Recaudo Total Aprobado */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
              Recaudo Aprobado
            </span>
            <span className="text-2xl font-extrabold text-slate-900 font-heading">
              {formattedTotalAmount}
            </span>
            <span className="text-[11px] text-slate-400 block font-medium">
              Total facturado en eventos
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <CreditCard className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Banner de Error en Carga */}
      {loadError && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3 text-amber-900 text-xs font-semibold animate-in fade-in duration-150">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{loadError}</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => loadOrders()}
            disabled={loading}
            className="h-8 px-3 rounded-xl border-amber-300 text-amber-900 hover:bg-amber-100 text-xs font-bold shrink-0"
          >
            Reintentar
          </Button>
        </div>
      )}

      {/* Barra de Filtros y Búsqueda */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Campo de Búsqueda */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por referencia, nombre, email o comprobante..."
              className="h-12 pl-11 rounded-2xl border-slate-200 bg-slate-50/50 focus:bg-white text-sm"
            />
          </div>

          {/* Filtros Dropdowns */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Método de Pago */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
              <select
                value={methodFilter}
                onChange={(e) => setMethodFilter(e.target.value)}
                className="h-12 px-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-bold text-slate-700 outline-none cursor-pointer"
              >
                <option value="all">Todos los Métodos</option>
                <option value="breb">Bre-B (Banco de Bogotá)</option>
                <option value="openpay">Openpay (Tarjeta/PSE)</option>
              </select>
            </div>

            {/* Estado */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-12 px-4 rounded-2xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="all">Todos los Estados</option>
              <option value="pending_verification">Pendientes de Verificación</option>
              <option value="paid">Pagados</option>
              <option value="cancelled">Rechazados / Cancelados</option>
              <option value="pending">Pendientes de Pago</option>
              <option value="failed">Fallidos</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de Resultados */}
      <BrebReconciliationTable
        orders={orders}
        loading={loading}
        onRefresh={() => loadOrders()}
      />
    </div>
  );
}
