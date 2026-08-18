"use client";

import React, { useState, useEffect } from "react";
import {
  CreditCard,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  DollarSign,
  FileText,
  Info,
  ShieldCheck,
  Award,
} from "lucide-react";
import { formatMembershipDateOnly, formatMembershipDateOnlyShort } from "@/lib/memberships/date-utils";
import { PortalMembershipDTO } from "@/lib/portal/membership-types";

export default function PortalMembresiaPage() {
  const [data, setData] = useState<PortalMembershipDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"RESUMEN" | "CARGOS" | "PAGOS">("RESUMEN");

  const fetchMembership = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/portal/membership");
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || "No se pudo obtener la información de membresía.");
      }

      setData(json.data);
    } catch (err: unknown) {
      console.error("Error al cargar membresía del portal:", err);
      setError(err instanceof Error ? err.message : "Error de conexión.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchMembership();
  }, []);

  const formatMoney = (amount: number, currency = "COP") => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: currency || "COP",
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const getChargeStatusBadge = (chg: { admin_status: string; net_debt: number; is_overdue: boolean }) => {
    if (chg.admin_status === "cancelled") {
      return {
        label: "CANCELADO",
        className: "bg-slate-800 text-slate-400 border border-slate-700",
      };
    }
    if (chg.net_debt <= 0) {
      return {
        label: "PAGADO",
        className: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30",
      };
    }
    if (chg.is_overdue) {
      return {
        label: "VENCIDO",
        className: "bg-rose-500/10 text-rose-400 border border-rose-500/30",
      };
    }
    return {
      label: "PENDIENTE",
      className: "bg-amber-500/10 text-amber-400 border border-amber-500/30",
    };
  };

  const translatePaymentMethod = (method: string) => {
    switch (method) {
      case "bank_transfer":
        return "Transferencia Bancaria";
      case "cash":
        return "Efectivo";
      case "manual_admin":
        return "Registro Administrativo";
      case "credit_card":
        return "Tarjeta de Crédito / Débito";
      default:
        return method;
    }
  };

  const translatePaymentStatus = (status: string) => {
    switch (status) {
      case "completed":
        return "Completado";
      case "refunded":
        return "Revertido";
      case "cancelled":
        return "Cancelado";
      default:
        return status;
    }
  };

  const getFinancialBadge = (status: string) => {
    switch (status) {
      case "AL DÍA":
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            AL DÍA
          </span>
        );
      case "PENDIENTE":
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            PENDIENTE
          </span>
        );
      case "EN MORA":
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            EN MORA
          </span>
        );
      case "A FAVOR":
        return (
          <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
            <DollarSign className="w-3.5 h-3.5 text-cyan-400" />
            A FAVOR
          </span>
        );
      default:
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-32">
        <Loader2 className="w-10 h-10 animate-spin text-teal-400" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-4 max-w-xl mx-auto my-12">
        <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto" />
        <h2 className="text-xl font-bold text-slate-100 font-heading">No se pudo cargar la membresía</h2>
        <p className="text-slate-400 text-sm">{error || "Ocurrió un problema al obtener la información de su cuenta."}</p>
      </div>
    );
  }

  const { summary, charges, payments } = data;
  const isFreePlan = summary.billing_mode === "free";

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800/80 pb-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-white font-heading">Mi Membresía SOVOGIN</h1>
            {getFinancialBadge(summary.financial_status)}
          </div>
          <p className="text-slate-400 text-xs">
            Consulta tu plan gremial, estado de cuenta, historial de cargos y recaudos registrados.
          </p>
        </div>
      </div>

      {/* Banner de Estado UX */}
      {!summary.has_active_membership ? (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-3 text-xs text-amber-200">
          <Info className="w-5 h-5 text-amber-400 shrink-0" />
          <span>Tu plan de membresía aún está siendo configurado por la Administración SOVOGIN.</span>
        </div>
      ) : isFreePlan ? (
        <div className="bg-teal-500/10 border border-teal-500/30 rounded-2xl p-4 flex items-center gap-3 text-xs text-teal-200">
          <Award className="w-5 h-5 text-teal-400 shrink-0" />
          <div>
            <span className="font-bold">Plan Exento / Gratuito: </span>
            <span>Actualmente estás exento de cuotas ordinarias bajo este plan. No se generan cobros periódicos recurrentes.</span>
          </div>
        </div>
      ) : summary.financial_status === "AL DÍA" ? (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-3 text-xs text-emerald-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>Tu membresía no presenta saldos pendientes. ¡Gracias por tu compromiso continuo con SOVOGIN!</span>
        </div>
      ) : summary.financial_status === "A FAVOR" ? (
        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-2xl p-4 flex items-center gap-3 text-xs text-cyan-200">
          <DollarSign className="w-5 h-5 text-cyan-400 shrink-0" />
          <span>Tienes un saldo a favor disponible que se aplicará automáticamente a tus futuras obligaciones.</span>
        </div>
      ) : summary.financial_status === "EN MORA" ? (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 flex items-center gap-3 text-xs text-rose-200">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>Tienes obligaciones vencidas pendientes de pago. Por favor comunícate con Tesorería SOVOGIN.</span>
        </div>
      ) : (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-3 text-xs text-amber-200">
          <Clock className="w-5 h-5 text-amber-400 shrink-0" />
          <span>Tienes obligaciones pendientes dentro de su periodo ordinario de pago.</span>
        </div>
      )}

      {/* Grid de KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
            Saldo Pendiente
          </span>
          <div className={`text-2xl font-black ${summary.outstanding_balance > 0 ? "text-amber-400" : "text-slate-300"}`}>
            {formatMoney(summary.outstanding_balance, summary.currency)}
          </div>
          <p className="text-[11px] text-slate-500">Deuda activa en cuotas</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
            Saldo a Favor
          </span>
          <div className="text-2xl font-black text-cyan-400">
            {formatMoney(summary.credit_balance, summary.currency)}
          </div>
          <p className="text-[11px] text-slate-500">Crédito disponible</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
            Total Pagado
          </span>
          <div className="text-2xl font-black text-emerald-400">
            {formatMoney(summary.total_paid, summary.currency)}
          </div>
          <p className="text-[11px] text-slate-500">Histórico de recaudos</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-lg space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
            Vencimiento Pendiente
          </span>
          <div className="text-base font-bold text-slate-200 pt-1">
            {summary.next_due_date ? formatMembershipDateOnly(summary.next_due_date) : "Sin obligaciones pendientes"}
          </div>
          <p className="text-[11px] text-slate-500">Fecha límite cuota abierta</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-6">
        {[
          { id: "RESUMEN", label: "Resumen Gremial", icon: ShieldCheck },
          { id: "CARGOS", label: `Mis Cargos (${charges.length})`, icon: FileText },
          { id: "PAGOS", label: `Mis Pagos (${payments.length})`, icon: DollarSign },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`pb-4 font-bold text-sm flex items-center gap-2 border-b-2 transition-all ${
                isActive
                  ? "border-teal-400 text-teal-400"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {activeTab === "RESUMEN" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-4">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2 font-heading">
                <CreditCard className="w-5 h-5 text-teal-400" />
                <span>Detalle de tu Plan de Membresía</span>
              </h3>

              <div className="space-y-3 text-xs divide-y divide-slate-800">
                <div className="flex justify-between py-2">
                  <span className="text-slate-400 font-medium">Categoría Gremial:</span>
                  <span className="font-bold text-slate-100">{summary.category_name}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-400 font-medium">Plan de Cobro Actual:</span>
                  <span className="font-bold text-teal-400">{summary.plan_name}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-400 font-medium">Estado de Cuenta:</span>
                  <span className="font-bold text-slate-100 uppercase">{summary.billing_status}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-400 font-medium">Días de Gracia para Mora:</span>
                  <span className="font-bold text-slate-100">{summary.grace_period_days} días</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-400 font-medium">Moneda de Cuenta:</span>
                  <span className="font-bold text-slate-100">{summary.currency}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-4">
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2 font-heading">
                <ShieldCheck className="w-5 h-5 text-teal-400" />
                <span>Principios del Servicio Gremial</span>
              </h3>
              <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
                <p>• <strong>Asignación Transparente FIFO:</strong> Todos los pagos registrados se asignan automáticamente a tus cuotas pendientes más antiguas.</p>
                <p>• <strong>Crédito Automático:</strong> Si realizas un sobrepago, el saldo a favor quedará disponible y se aplicará de forma automática en tu siguiente cuota.</p>
                <p>• <strong>Soporte Administrativo:</strong> Para cualquier consulta de Tesorería o acuerdo de pago, puedes comunicarte con la administración central de SOVOGIN.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "CARGOS" && (
          <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="pl-6 py-4">Concepto</th>
                    <th className="py-4">Monto Original</th>
                    <th className="py-4">Pagos Aplicados</th>
                    <th className="py-4">Ajustes / Condonaciones</th>
                    <th className="py-4">Saldo Pendiente</th>
                    <th className="py-4">Vencimiento</th>
                    <th className="py-4 pr-6">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {charges.map((chg) => (
                    <tr key={chg.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="pl-6 py-4 font-bold text-slate-100">{chg.concept}</td>
                      <td className="font-semibold text-slate-300">{formatMoney(chg.original_amount, summary.currency)}</td>
                      <td className="font-semibold text-emerald-400">{formatMoney(chg.allocated_amount, summary.currency)}</td>
                      <td className="font-semibold text-cyan-400">{formatMoney(chg.adjustments_amount, summary.currency)}</td>
                      <td className="font-bold">
                        <span className={chg.net_debt > 0 ? "text-amber-400" : "text-slate-500"}>
                          {formatMoney(chg.net_debt, summary.currency)}
                        </span>
                      </td>
                      <td className="text-slate-400">
                        {formatMembershipDateOnlyShort(chg.due_date)}
                      </td>
                      <td className="pr-6">
                        {(() => {
                          const badge = getChargeStatusBadge(chg);
                          return (
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${badge.className}`}
                            >
                              {badge.label}
                            </span>
                          );
                        })()}
                      </td>
                    </tr>
                  ))}
                  {charges.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-500 font-medium">
                        No tienes cargos registrados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "PAGOS" && (
          <div className="bg-slate-900 rounded-3xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="pl-6 py-4">Fecha</th>
                    <th className="py-4">Monto</th>
                    <th className="py-4">Método de Pago</th>
                    <th className="py-4 pr-6">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {payments.map((pay) => (
                    <tr key={pay.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="pl-6 py-4 font-bold text-slate-100">
                        {formatMembershipDateOnlyShort(pay.paid_at)}
                      </td>
                      <td className="font-extrabold text-emerald-400">{formatMoney(pay.amount, pay.currency)}</td>
                      <td className="font-semibold text-slate-300">{translatePaymentMethod(pay.payment_method)}</td>
                      <td className="pr-6">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                            pay.status === "completed"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {translatePaymentStatus(pay.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {payments.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-12 text-slate-500 font-medium">
                        No tienes pagos registrados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
