"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Search,
  Loader2,
  DollarSign,
  AlertTriangle,
  CreditCard,
  UserCheck,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingDown,
  Layers,
  Filter,
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
import {
  AssociateMembershipSummary,
  FinancialStatus,
  OverallPortfolioKpis,
} from "@/lib/memberships/types";

export default function MembershipsAdminPage() {
  const [summaries, setSummaries] = useState<AssociateMembershipSummary[]>([]);
  const [kpis, setKpis] = useState<OverallPortfolioKpis | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  useEffect(() => {
    let isMounted = true;

    async function fetchPortfolioData() {
      try {
        const res = await fetch("/api/admin/memberships");
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || "No se pudo cargar la cartera.");
        }

        if (isMounted) {
          setSummaries(data.summaries || []);
          setKpis(data.kpis || null);
        }
      } catch (err: unknown) {
        console.error("Error al cargar cartera de membresías:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void fetchPortfolioData();

    return () => {
      isMounted = false;
    };
  }, []);

  const formatMoney = (amount: number, currency = "COP") => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: currency || "COP",
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const filteredSummaries = useMemo(() => {
    return summaries.filter((item) => {
      const matchesTerm =
        !searchTerm.trim() ||
        item.full_name.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        item.email.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        (item.document_number &&
          item.document_number.toLowerCase().includes(searchTerm.toLowerCase().trim())) ||
        item.plan_name.toLowerCase().includes(searchTerm.toLowerCase().trim());

      const matchesStatus =
        statusFilter === "ALL" || item.financial_status === statusFilter;

      return matchesTerm && matchesStatus;
    });
  }, [summaries, searchTerm, statusFilter]);

  const getFinancialStatusBadge = (status: FinancialStatus) => {
    switch (status) {
      case "EN MORA":
        return (
          <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-300 inline-flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            EN MORA
          </span>
        );
      case "PENDIENTE":
        return (
          <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300 inline-flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600" />
            PENDIENTE
          </span>
        );
      case "A FAVOR":
        return (
          <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-300 inline-flex items-center gap-1">
            <CreditCard className="w-3 h-3 text-blue-600" />
            A FAVOR
          </span>
        );
      case "AL DÍA":
      default:
        return (
          <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            AL DÍA
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Header & Main Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-heading">
            Membresías y Cartera
          </h1>
          <p className="text-slate-500">
            Control de cobros gremiales, recaudos, deudas y cartera general de la asociación.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link href="/admin/membresias/planes">
            <Button
              variant="outline"
              className="h-12 px-5 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 gap-2 font-bold shadow-xs"
            >
              <Layers className="w-5 h-5 text-[#006666]" />
              Catálogo de Planes
            </Button>
          </Link>
          <Link href="/admin/miembros">
            <Button
              variant="outline"
              className="h-12 px-5 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 gap-2 font-bold shadow-xs"
            >
              <UserCheck className="w-5 h-5 text-slate-500" />
              Gestión de Miembros
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Recaudo Total
            </span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">
            {formatMoney(kpis?.total_recaudo || 0)}
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Pagos procesados y confirmados
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-rose-600">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Deuda Pendiente
            </span>
            <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">
            {formatMoney(kpis?.deuda_pendiente || 0)}
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Saldo neto acumulado por cobrar
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-blue-600">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Crédito a Favor
            </span>
            <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">
            {formatMoney(kpis?.credito_a_favor || 0)}
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Pagos no asignados a cargos
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Asociados en Mora
            </span>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-rose-600" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900">
            {kpis?.asociados_en_mora || 0}
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Con cuotas vencidas desfasadas
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder="Buscar por asociado, email, cédula o plan..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 h-12 rounded-xl border-slate-200 bg-white"
          />
        </div>

        <div className="flex items-center gap-2 bg-white px-4 h-12 rounded-xl border border-slate-200 text-slate-700">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold uppercase text-slate-400">Estado:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-transparent font-bold text-xs text-slate-800 outline-none cursor-pointer"
          >
            <option value="ALL">Todos los estados</option>
            <option value="EN MORA">EN MORA</option>
            <option value="PENDIENTE">PENDIENTE</option>
            <option value="A FAVOR">A FAVOR</option>
            <option value="AL DÍA">AL DÍA</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="pl-8 py-4">Asociado</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Plan & Categoría</TableHead>
                <TableHead>Estado Gremiat</TableHead>
                <TableHead>Total Pagado</TableHead>
                <TableHead>Saldo Deuda</TableHead>
                <TableHead>Crédito a Favor</TableHead>
                <TableHead>Estado Financiero</TableHead>
                <TableHead className="text-right pr-8">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSummaries.map((item) => (
                <TableRow
                  key={item.associate_id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  <TableCell className="pl-8 py-5">
                    <div className="font-bold text-slate-900">{item.full_name}</div>
                    <div className="text-xs text-slate-500 font-normal">{item.email}</div>
                  </TableCell>
                  <TableCell className="text-slate-500 text-xs font-medium">
                    {item.document_number || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="font-bold text-xs text-slate-800">{item.plan_name}</div>
                    <div className="text-[11px] text-slate-400">{item.category_name}</div>
                  </TableCell>
                  <TableCell>
                    <span
                      className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                        item.status === "Activo"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {item.status}
                    </span>
                  </TableCell>
                  <TableCell className="font-bold text-xs text-slate-800">
                    {formatMoney(item.total_paid, item.currency)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        item.outstanding_balance > 0
                          ? "font-extrabold text-xs text-rose-600"
                          : "text-xs text-slate-400 font-medium"
                      }
                    >
                      {formatMoney(item.outstanding_balance, item.currency)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span
                      className={
                        item.credit_balance > 0
                          ? "font-extrabold text-xs text-blue-600"
                          : "text-xs text-slate-400 font-medium"
                      }
                    >
                      {formatMoney(item.credit_balance, item.currency)}
                    </span>
                  </TableCell>
                  <TableCell>{getFinancialStatusBadge(item.financial_status)}</TableCell>
                  <TableCell className="text-right pr-8">
                    <Link href={`/admin/membresias/${item.associate_id}`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-3 rounded-lg text-xs font-bold text-[#006666] bg-[#006666]/10 hover:bg-[#006666]/20 gap-1"
                      >
                        <span>Ver Expediente</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}

              {filteredSummaries.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center py-12 text-slate-400 font-medium"
                  >
                    No se encontraron registros de cartera con los criterios seleccionados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
