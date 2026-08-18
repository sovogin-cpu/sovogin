"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Loader2,
  Plus,
  CheckCircle2,
  XCircle,
  Edit2,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MembershipPlan } from "@/lib/memberships/types";

export default function MembershipPlansAdminPage() {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingPlan, setEditingPlan] = useState<MembershipPlan | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    currency: "COP",
    standard_amount: "0",
    billing_mode: "recurring",
    billing_interval_unit: "month",
    billing_interval_count: "1",
    billing_anchor_mode: "anniversary",
    fixed_anchor_day: "1",
    fixed_anchor_month: "",
    allow_partial_payments: true,
    allow_overpayments: true,
    allow_custom_amount: true,
    minimum_payment_amount: "0",
    grace_period_days: "10",
    is_active: true,
  });

  const fetchPlans = async () => {
    try {
      const res = await fetch("/api/admin/memberships/plans");
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se pudieron cargar los planes.");
      }

      setPlans(data.plans || []);
    } catch (err: unknown) {
      console.error("Error al cargar catálogo de planes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchPlans();
  }, []);

  const formatMoney = (amount: number, currency = "COP") => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: currency || "COP",
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const getBillingModeLabel = (mode: string) => {
    switch (mode) {
      case "recurring":
        return "Recurrente Programado";
      case "manual":
        return "Cobro Manual / Bajo Demanda";
      case "free":
        return "Gratuito / Exento";
      default:
        return mode;
    }
  };

  const openCreateModal = () => {
    setFormData({
      name: "",
      description: "",
      currency: "COP",
      standard_amount: "150000",
      billing_mode: "recurring",
      billing_interval_unit: "month",
      billing_interval_count: "1",
      billing_anchor_mode: "anniversary",
      fixed_anchor_day: "1",
      fixed_anchor_month: "",
      allow_partial_payments: true,
      allow_overpayments: true,
      allow_custom_amount: true,
      minimum_payment_amount: "0",
      grace_period_days: "10",
      is_active: true,
    });
    setIsCreateModalOpen(true);
  };

  const openEditModal = (plan: MembershipPlan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || "",
      currency: plan.currency,
      standard_amount: String(plan.standard_amount),
      billing_mode: plan.billing_mode,
      billing_interval_unit: plan.billing_interval_unit || "month",
      billing_interval_count: String(plan.billing_interval_count || 1),
      billing_anchor_mode: plan.billing_anchor_mode,
      fixed_anchor_day: String(plan.fixed_anchor_day || "1"),
      fixed_anchor_month: String(plan.fixed_anchor_month || ""),
      allow_partial_payments: plan.allow_partial_payments,
      allow_overpayments: plan.allow_overpayments,
      allow_custom_amount: plan.allow_custom_amount,
      minimum_payment_amount: String(plan.minimum_payment_amount),
      grace_period_days: String(plan.grace_period_days),
      is_active: plan.is_active,
    });
    setIsEditModalOpen(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Client-side validation for fixed anchor
    if (formData.billing_anchor_mode === "fixed") {
      const dayNum = Number(formData.fixed_anchor_day);
      if (!dayNum || dayNum < 1 || dayNum > 28) {
        alert("El día fijo del mes debe ser un número entre 1 y 28.");
        return;
      }
      if (formData.billing_interval_unit === "year" && formData.fixed_anchor_month) {
        const monthNum = Number(formData.fixed_anchor_month);
        if (!monthNum || monthNum < 1 || monthNum > 12) {
          alert("El mes fijo de anclaje debe estar entre 1 y 12.");
          return;
        }
      }
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/admin/memberships/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.error || "No se pudo crear el plan de membresía.");
        return;
      }

      alert(data.message || "Plan creado exitosamente.");
      setIsCreateModalOpen(false);
      void fetchPlans();
    } catch (err: unknown) {
      console.error("Error al crear plan:", err);
      alert("Error al conectar con el servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    // Client-side validation for fixed anchor
    if (formData.billing_anchor_mode === "fixed") {
      const dayNum = Number(formData.fixed_anchor_day);
      if (!dayNum || dayNum < 1 || dayNum > 28) {
        alert("El día fijo del mes debe ser un número entre 1 y 28.");
        return;
      }
      if (formData.billing_interval_unit === "year" && formData.fixed_anchor_month) {
        const monthNum = Number(formData.fixed_anchor_month);
        if (!monthNum || monthNum < 1 || monthNum > 12) {
          alert("El mes fijo de anclaje debe estar entre 1 y 12.");
          return;
        }
      }
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/admin/memberships/plans/${editingPlan.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        alert(data.error || "No se pudo actualizar el plan.");
        return;
      }

      alert(data.message || "Plan actualizado exitosamente.");
      setIsEditModalOpen(false);
      setEditingPlan(null);
      void fetchPlans();
    } catch (err: unknown) {
      console.error("Error al actualizar plan:", err);
      alert("Error al conectar con el servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-6">
        <div className="space-y-1">
          <Link
            href="/admin/membresias"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a Cartera General</span>
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 font-heading">
            Catálogo de Planes de Membresía
          </h1>
          <p className="text-slate-500 text-xs">
            Configuración de tarifas, frecuencias, modalidades de cobro y días de gracia.
          </p>
        </div>

        <Button
          onClick={openCreateModal}
          className="bg-[#006666] hover:bg-[#004d4d] h-12 px-6 rounded-xl font-bold text-white gap-2 shadow-md shadow-[#006666]/20"
        >
          <Plus className="w-5 h-5" />
          <span>Nuevo Plan</span>
        </Button>
      </div>

      {/* Info Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex items-start gap-3 text-xs text-blue-900">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Aviso sobre modificación de tarifas: </span>
          <span>
            Los cambios realizados en las propiedades y tarifas de un plan aplicarán a las futuras obligaciones de cobro emitidas. No alteran ni modifican retroactivamente cargos o comprobantes ya generados.
          </span>
        </div>
      </div>

      {/* Plans List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col justify-between space-y-6 hover:shadow-md transition-shadow"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-[#006666]/10 text-[#006666]">
                      {getBillingModeLabel(plan.billing_mode)}
                    </span>
                    <h3 className="text-xl font-bold text-slate-900 leading-tight pt-1">
                      {plan.name}
                    </h3>
                  </div>
                  {plan.is_active ? (
                    <span className="flex items-center gap-1 text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Activo
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[10px] font-extrabold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
                      <XCircle className="w-3 h-3 text-slate-400" />
                      Inactivo
                    </span>
                  )}
                </div>

                {plan.description && (
                  <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                    {plan.description}
                  </p>
                )}

                <div className="pt-2 border-t border-slate-100 space-y-3">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs text-slate-400 font-medium">Tarifa Estándar:</span>
                    <span className="text-2xl font-black text-slate-900">
                      {formatMoney(plan.standard_amount, plan.currency)}
                    </span>
                  </div>

                  {plan.billing_mode === "recurring" && (
                    <div className="flex justify-between text-xs text-slate-600">
                      <span className="text-slate-400">Frecuencia de Cobro:</span>
                      <span className="font-bold">
                        Cada {plan.billing_interval_count} {plan.billing_interval_unit}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-xs text-slate-600">
                    <span className="text-slate-400">Días de Gracia (Mora):</span>
                    <span className="font-bold">{plan.grace_period_days} días</span>
                  </div>

                  <div className="flex justify-between text-xs text-slate-600">
                    <span className="text-slate-400">Modo Anclaje:</span>
                    <span className="font-bold capitalize">
                      {plan.billing_anchor_mode === "fixed"
                        ? `Día Fijo (${plan.fixed_anchor_day}${plan.fixed_anchor_month ? `/${plan.fixed_anchor_month}` : ""})`
                        : plan.billing_anchor_mode === "anniversary"
                        ? "Aniversario"
                        : plan.billing_anchor_mode}
                    </span>
                  </div>
                </div>

                {/* Flags grid */}
                <div className="bg-slate-50 p-4 rounded-2xl space-y-2 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span>Pagos Parciales:</span>
                    <span className={plan.allow_partial_payments ? "text-emerald-700 font-bold" : "text-rose-600 font-bold"}>
                      {plan.allow_partial_payments ? "Permitidos" : "No permitidos"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Sobrepagos:</span>
                    <span className={plan.allow_overpayments ? "text-emerald-700 font-bold" : "text-rose-600 font-bold"}>
                      {plan.allow_overpayments ? "Permitidos" : "No permitidos"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Monto Mínimo:</span>
                    <span className="font-bold text-slate-800">
                      {formatMoney(plan.minimum_payment_amount, plan.currency)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  onClick={() => openEditModal(plan)}
                  variant="outline"
                  className="w-full h-10 text-xs font-bold text-slate-700 hover:bg-slate-50 border-slate-200 gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Editar Plan</span>
                </Button>
              </div>
            </div>
          ))}

          {plans.length === 0 && (
            <div className="col-span-full py-12 text-center text-slate-400 font-medium">
              No existen planes de membresía configurados.
            </div>
          )}
        </div>
      )}

      {/* CREATE PLAN MODAL */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="sm:max-w-[550px] rounded-[2.5rem] border-none shadow-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold font-heading">
              Nuevo Plan de Membresía
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateSubmit} className="space-y-5 pt-2">
            <div className="space-y-2">
              <Label>Nombre del Plan</Label>
              <Input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej. Plan Anual Miembro de Número"
                className="rounded-xl h-11"
              />
            </div>

            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripción detallada del plan..."
                className="rounded-xl h-11"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Modalidad de Cobro</Label>
                <select
                  value={formData.billing_mode}
                  onChange={(e) => setFormData({ ...formData, billing_mode: e.target.value })}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 font-bold text-xs text-slate-800"
                >
                  <option value="recurring">Recurrente Programado</option>
                  <option value="manual">Manual / Bajo Demanda</option>
                  <option value="free">Gratuito / Exento</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Moneda</Label>
                <Input
                  required
                  maxLength={3}
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value.toUpperCase() })}
                  placeholder="COP"
                  className="rounded-xl h-11"
                />
              </div>
            </div>

            {formData.billing_mode !== "free" && (
              <div className="space-y-2">
                <Label>Tarifa Estándar ({formData.currency})</Label>
                <Input
                  type="number"
                  required
                  min={0}
                  value={formData.standard_amount}
                  onChange={(e) => setFormData({ ...formData, standard_amount: e.target.value })}
                  placeholder="150000"
                  className="rounded-xl h-11 font-bold text-slate-900"
                />
              </div>
            )}

            {formData.billing_mode === "recurring" && (
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div className="space-y-2">
                  <Label>Unidad Intervalo</Label>
                  <select
                    value={formData.billing_interval_unit}
                    onChange={(e) => setFormData({ ...formData, billing_interval_unit: e.target.value })}
                    className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold"
                  >
                    <option value="month">Mes(es)</option>
                    <option value="year">Año(s)</option>
                    <option value="week">Semana(s)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Cantidad Intervalos</Label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.billing_interval_count}
                    onChange={(e) => setFormData({ ...formData, billing_interval_count: e.target.value })}
                    className="rounded-xl h-10"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Modo de Anclaje</Label>
                <select
                  value={formData.billing_anchor_mode}
                  onChange={(e) => {
                    const mode = e.target.value;
                    setFormData({
                      ...formData,
                      billing_anchor_mode: mode,
                      fixed_anchor_day: mode === "fixed" ? (formData.fixed_anchor_day || "1") : "",
                      fixed_anchor_month: mode === "fixed" ? formData.fixed_anchor_month : "",
                    });
                  }}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold"
                >
                  <option value="anniversary">Aniversario (Fecha de ingreso)</option>
                  <option value="fixed">Día Fijo del Mes</option>
                  <option value="manual">Manual</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Días de Gracia (Mora)</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.grace_period_days}
                  onChange={(e) => setFormData({ ...formData, grace_period_days: e.target.value })}
                  className="rounded-xl h-11"
                />
              </div>
            </div>

            {/* Campos condicionales para Anclaje Fijo */}
            {formData.billing_anchor_mode === "fixed" && (
              <div className="grid grid-cols-2 gap-4 bg-amber-50/70 p-4 rounded-2xl border border-amber-200/80">
                <div className="space-y-2">
                  <Label className="text-amber-900 font-bold">Día Fijo del Mes (1–28)</Label>
                  <Input
                    type="number"
                    required
                    min={1}
                    max={28}
                    value={formData.fixed_anchor_day}
                    onChange={(e) => setFormData({ ...formData, fixed_anchor_day: e.target.value })}
                    placeholder="1"
                    className="rounded-xl h-10 font-bold bg-white text-slate-900"
                  />
                  <p className="text-[10px] text-amber-700">Recomendado 1–28 para compatibilidad mensual.</p>
                </div>

                {formData.billing_interval_unit === "year" && (
                  <div className="space-y-2">
                    <Label className="text-amber-900 font-bold">Mes Fijo de Anclaje</Label>
                    <select
                      value={formData.fixed_anchor_month}
                      onChange={(e) => setFormData({ ...formData, fixed_anchor_month: e.target.value })}
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800"
                    >
                      <option value="">Seleccionar mes...</option>
                      <option value="1">Enero</option>
                      <option value="2">Febrero</option>
                      <option value="3">Marzo</option>
                      <option value="4">Abril</option>
                      <option value="5">Mayo</option>
                      <option value="6">Junio</option>
                      <option value="7">Julio</option>
                      <option value="8">Agosto</option>
                      <option value="9">Septiembre</option>
                      <option value="10">Octubre</option>
                      <option value="11">Noviembre</option>
                      <option value="12">Diciembre</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-13 rounded-xl font-bold bg-[#006666] text-white text-base mt-2"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Crear Plan de Membresía"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT PLAN MODAL */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-[550px] rounded-[2.5rem] border-none shadow-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold font-heading">
              Editar Plan de Membresía
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-5 pt-2">
            <div className="space-y-2">
              <Label>Nombre del Plan</Label>
              <Input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="rounded-xl h-11"
              />
            </div>

            <div className="space-y-2">
              <Label>Descripción</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="rounded-xl h-11"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Modo de Anclaje</Label>
                <select
                  value={formData.billing_anchor_mode}
                  onChange={(e) => {
                    const mode = e.target.value;
                    setFormData({
                      ...formData,
                      billing_anchor_mode: mode,
                      fixed_anchor_day: mode === "fixed" ? (formData.fixed_anchor_day || "1") : "",
                      fixed_anchor_month: mode === "fixed" ? formData.fixed_anchor_month : "",
                    });
                  }}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold"
                >
                  <option value="anniversary">Aniversario (Fecha de ingreso)</option>
                  <option value="fixed">Día Fijo del Mes</option>
                  <option value="manual">Manual</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Días de Gracia (Mora)</Label>
                <Input
                  type="number"
                  min={0}
                  value={formData.grace_period_days}
                  onChange={(e) => setFormData({ ...formData, grace_period_days: e.target.value })}
                  className="rounded-xl h-11"
                />
              </div>
            </div>

            {/* Campos condicionales para Anclaje Fijo en Edición */}
            {formData.billing_anchor_mode === "fixed" && (
              <div className="grid grid-cols-2 gap-4 bg-amber-50/70 p-4 rounded-2xl border border-amber-200/80">
                <div className="space-y-2">
                  <Label className="text-amber-900 font-bold">Día Fijo del Mes (1–28)</Label>
                  <Input
                    type="number"
                    required
                    min={1}
                    max={28}
                    value={formData.fixed_anchor_day}
                    onChange={(e) => setFormData({ ...formData, fixed_anchor_day: e.target.value })}
                    placeholder="1"
                    className="rounded-xl h-10 font-bold bg-white text-slate-900"
                  />
                  <p className="text-[10px] text-amber-700">Recomendado 1–28 para compatibilidad mensual.</p>
                </div>

                {formData.billing_interval_unit === "year" && (
                  <div className="space-y-2">
                    <Label className="text-amber-900 font-bold">Mes Fijo de Anclaje</Label>
                    <select
                      value={formData.fixed_anchor_month}
                      onChange={(e) => setFormData({ ...formData, fixed_anchor_month: e.target.value })}
                      className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-800"
                    >
                      <option value="">Seleccionar mes...</option>
                      <option value="1">Enero</option>
                      <option value="2">Febrero</option>
                      <option value="3">Marzo</option>
                      <option value="4">Abril</option>
                      <option value="5">Mayo</option>
                      <option value="6">Junio</option>
                      <option value="7">Julio</option>
                      <option value="8">Agosto</option>
                      <option value="9">Septiembre</option>
                      <option value="10">Octubre</option>
                      <option value="11">Noviembre</option>
                      <option value="12">Diciembre</option>
                    </select>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label>Estado del Plan</Label>
              <select
                value={formData.is_active ? "active" : "inactive"}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.value === "active" })}
                className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 font-bold text-xs"
              >
                <option value="active">Activo (Asignable)</option>
                <option value="inactive">Inactivo (Retirado)</option>
              </select>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl space-y-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={formData.allow_partial_payments}
                  onChange={(e) => setFormData({ ...formData, allow_partial_payments: e.target.checked })}
                  className="rounded border-slate-300 text-[#006666] focus:ring-[#006666]"
                />
                <span>Permitir pagos parciales</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={formData.allow_overpayments}
                  onChange={(e) => setFormData({ ...formData, allow_overpayments: e.target.checked })}
                  className="rounded border-slate-300 text-[#006666] focus:ring-[#006666]"
                />
                <span>Permitir sobrepagos (saldo a favor)</span>
              </label>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-13 rounded-xl font-bold bg-[#006666] text-white text-base mt-2"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Guardar Cambios"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
