"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Loader2,
  DollarSign,
  TrendingDown,
  CreditCard,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  History,
  Info,
  Layers,
  Plus,
  RefreshCw,
  RotateCcw,
  Sliders,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FinancialStatus,
  MembershipAdjustment,
  MembershipCategory,
  MembershipCharge,
  MembershipLedgerDetail,
  MembershipPayment,
  MembershipPlan,
} from "@/lib/memberships/types";
import { createClient } from "@/utils/supabase/client";
import { formatMembershipDateOnly, formatMembershipDateOnlyShort } from "@/lib/memberships/date-utils";

export default function AssociateMembershipDetailPage() {
  const params = useParams();
  const associateId = params.associateId as string;

  const [ledgerDetail, setLedgerDetail] = useState<MembershipLedgerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"RESUMEN" | "CARGOS" | "PAGOS" | "AJUSTES" | "HISTORIAL">(
    "RESUMEN"
  );

  // Available options
  const [activePlans, setActivePlans] = useState<MembershipPlan[]>([]);
  const [activeCategories, setActiveCategories] = useState<MembershipCategory[]>([]);

  // Modals state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isChangePlanModalOpen, setIsChangePlanModalOpen] = useState(false);
  const [isCreateChargeModalOpen, setIsCreateChargeModalOpen] = useState(false);
  const [isRegisterPaymentModalOpen, setIsRegisterPaymentModalOpen] = useState(false);
  const [isCreateAdjustmentModalOpen, setIsCreateAdjustmentModalOpen] = useState(false);
  const [isReversePaymentModalOpen, setIsReversePaymentModalOpen] = useState(false);
  const [isReverseAdjustmentModalOpen, setIsReverseAdjustmentModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Target items for actions
  const [selectedChargeForAdjustment, setSelectedChargeForAdjustment] = useState<MembershipCharge | null>(null);
  const [selectedPaymentForReversal, setSelectedPaymentForReversal] = useState<MembershipPayment | null>(null);
  const [selectedAdjustmentForReversal, setSelectedAdjustmentForReversal] = useState<MembershipAdjustment | null>(null);

  // Form states
  const [assignForm, setAssignForm] = useState({
    planId: "",
    categoryId: "",
    billingAnchorDate: new Date().toISOString().substring(0, 10),
  });

  const [changePlanForm, setChangePlanForm] = useState({
    newPlanId: "",
    reason: "",
  });

  const [createChargeForm, setCreateChargeForm] = useState({
    concept: "",
    originalAmount: "",
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().substring(0, 10),
    currency: "COP",
    periodStart: "",
    periodEnd: "",
  });

  const [registerPaymentForm, setRegisterPaymentForm] = useState({
    amount: "",
    paymentMethod: "bank_transfer",
    paidAt: new Date().toISOString().substring(0, 10),
    currency: "COP",
    notes: "",
  });

  const [createAdjustmentForm, setCreateAdjustmentForm] = useState({
    type: "waiver",
    amount: "",
    reason: "",
  });

  const [reversalReason, setReversalReason] = useState("");

  const fetchLedgerDetail = useCallback(async () => {
    if (!associateId) return;

    try {
      const res = await fetch(`/api/admin/memberships/${associateId}`);
      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "No se encontró el expediente del asociado.");
      }

      setLedgerDetail(data.detail);
    } catch (err: unknown) {
      console.error("Error al cargar expediente:", err);
    } finally {
      setLoading(false);
    }
  }, [associateId]);

  useEffect(() => {
    void fetchLedgerDetail();
  }, [fetchLedgerDetail]);

  const loadModalOptions = async () => {
    try {
      const supabase = createClient();
      const [plansRes, catRes] = await Promise.all([
        fetch("/api/admin/memberships/plans").then((r) => r.json()),
        supabase.from("membership_categories").select("*").eq("is_active", true),
      ]);

      let loadedPlans: MembershipPlan[] = [];
      let loadedCategories: MembershipCategory[] = [];

      if (plansRes?.success) {
        loadedPlans = (plansRes.plans || []).filter((p: MembershipPlan) => p.is_active);
        setActivePlans(loadedPlans);
      }

      if (catRes.data) {
        loadedCategories = catRes.data as MembershipCategory[];
        setActiveCategories(loadedCategories);
      }

      return { plans: loadedPlans, categories: loadedCategories };
    } catch (err) {
      console.error("Error al cargar opciones:", err);
      return { plans: [], categories: [] };
    }
  };

  const openAssignModal = async () => {
    const { plans, categories } = await loadModalOptions();
    const defaultPlanId = plans[0]?.id || activePlans[0]?.id || "";
    const defaultCatId = categories[0]?.id || activeCategories[0]?.id || "";

    setAssignForm({
      planId: defaultPlanId,
      categoryId: defaultCatId,
      billingAnchorDate: new Date().toISOString().substring(0, 10),
    });
    setIsAssignModalOpen(true);
  };

  const openChangePlanModal = async () => {
    const { plans } = await loadModalOptions();
    const currentPlanId = ledgerDetail?.membership?.membership_plan_id;
    const availablePlans = plans.length > 0 ? plans : activePlans;
    const availableNewPlans = availablePlans.filter((p) => p.id !== currentPlanId);

    setChangePlanForm({
      newPlanId: availableNewPlans[0]?.id || "",
      reason: "",
    });
    setIsChangePlanModalOpen(true);
  };

  const openCreateChargeModal = () => {
    const plan = ledgerDetail?.membership?.plan;
    const anchorDateStr = ledgerDetail?.membership?.billing_anchor_date || new Date().toISOString().substring(0, 10);
    const currency = plan?.currency || ledgerDetail?.summary?.currency || "COP";
    const amount = plan?.standard_amount && plan.standard_amount > 0 ? String(plan.standard_amount) : "";

    let defaultConcept = "Cuota de Membresía";
    const defaultDueDate = anchorDateStr;

    if (plan?.billing_interval_unit === "month") {
      const anchorDate = new Date(anchorDateStr + "T00:00:00");
      const monthNames = [
        "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
        "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
      ];
      const monthName = !isNaN(anchorDate.getTime()) ? monthNames[anchorDate.getMonth()] : "";
      const year = !isNaN(anchorDate.getTime()) ? anchorDate.getFullYear() : "";
      defaultConcept = monthName && year ? `Cuota de Membresía - ${monthName} ${year}` : "Cuota de Membresía Mensual";
    } else if (plan?.billing_interval_unit === "year") {
      const anchorDate = new Date(anchorDateStr + "T00:00:00");
      const year = !isNaN(anchorDate.getTime()) ? anchorDate.getFullYear() : "";
      defaultConcept = year ? `Cuota de Membresía - ${year}` : "Cuota de Membresía Anual";
    }

    setCreateChargeForm({
      concept: defaultConcept,
      originalAmount: amount,
      dueDate: defaultDueDate,
      currency: currency,
      periodStart: anchorDateStr,
      periodEnd: "",
    });
    setIsCreateChargeModalOpen(true);
  };

  const openRegisterPaymentModal = () => {
    const debt = ledgerDetail?.summary?.outstanding_balance || 0;
    setRegisterPaymentForm({
      amount: debt > 0 ? String(debt) : "",
      paymentMethod: "bank_transfer",
      paidAt: new Date().toISOString().substring(0, 10),
      currency: ledgerDetail?.summary?.currency || "COP",
      notes: "",
    });
    setIsRegisterPaymentModalOpen(true);
  };

  const openCreateAdjustmentModal = (charge: MembershipCharge) => {
    setSelectedChargeForAdjustment(charge);
    setCreateAdjustmentForm({
      type: "waiver",
      amount: String(charge.net_debt || 0),
      reason: "",
    });
    setIsCreateAdjustmentModalOpen(true);
  };

  const openReversePaymentModal = (payment: MembershipPayment) => {
    setSelectedPaymentForReversal(payment);
    setReversalReason("");
    setIsReversePaymentModalOpen(true);
  };

  const openReverseAdjustmentModal = (adjustment: MembershipAdjustment) => {
    setSelectedAdjustmentForReversal(adjustment);
    setReversalReason("");
    setIsReverseAdjustmentModalOpen(true);
  };

  // Submit Handlers
  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignForm.planId || assignForm.planId.trim() === "") {
      alert("Por favor seleccione un plan de membresía válido.");
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/memberships/${associateId}/assign-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(assignForm),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "No se pudo asignar la membresía inicial.");
        return;
      }
      alert(data.message || "Membresía asignada exitosamente.");
      setIsAssignModalOpen(false);
      void fetchLedgerDetail();
    } catch (err) {
      console.error(err);
      alert("Error al conectar con el servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/memberships/${associateId}/change-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(changePlanForm),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "No se pudo cambiar el plan de membresía.");
        return;
      }
      alert(data.message || "Plan cambiado exitosamente.");
      setIsChangePlanModalOpen(false);
      void fetchLedgerDetail();
    } catch (err) {
      console.error(err);
      alert("Error al conectar con el servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateChargeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/memberships/${associateId}/charges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createChargeForm),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "No se pudo emitir el cargo.");
        return;
      }
      alert(data.message || "Cargo emitido exitosamente.");
      setIsCreateChargeModalOpen(false);
      void fetchLedgerDetail();
    } catch (err) {
      console.error(err);
      alert("Error al conectar con el servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/memberships/${associateId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(registerPaymentForm),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "No se pudo registrar el pago.");
        return;
      }
      alert(data.message || "Pago registrado exitosamente.");
      setIsRegisterPaymentModalOpen(false);
      void fetchLedgerDetail();
    } catch (err) {
      console.error(err);
      alert("Error al conectar con el servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChargeForAdjustment) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/memberships/${associateId}/adjustments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chargeId: selectedChargeForAdjustment.id,
          ...createAdjustmentForm,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "No se pudo aplicar el ajuste.");
        return;
      }
      alert(data.message || "Ajuste aplicado exitosamente.");
      setIsCreateAdjustmentModalOpen(false);
      setSelectedChargeForAdjustment(null);
      void fetchLedgerDetail();
    } catch (err) {
      console.error(err);
      alert("Error al conectar con el servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReversePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPaymentForReversal) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/memberships/payments/${selectedPaymentForReversal.id}/reverse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reversalReason }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "No se pudo revertir el pago.");
        return;
      }
      alert(data.message || "Pago revertido exitosamente.");
      setIsReversePaymentModalOpen(false);
      setSelectedPaymentForReversal(null);
      void fetchLedgerDetail();
    } catch (err) {
      console.error(err);
      alert("Error al conectar con el servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReverseAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdjustmentForReversal) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/memberships/adjustments/${selectedAdjustmentForReversal.id}/reverse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reversalReason }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "No se pudo revertir el ajuste.");
        return;
      }
      alert(data.message || "Ajuste revertido exitosamente.");
      setIsReverseAdjustmentModalOpen(false);
      setSelectedAdjustmentForReversal(null);
      void fetchLedgerDetail();
    } catch (err) {
      console.error(err);
      alert("Error al conectar con el servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatMoney = (amount: number, currency = "COP") => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: currency || "COP",
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

  const getFinancialStatusBadge = (status?: FinancialStatus) => {
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

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!ledgerDetail) {
    return (
      <div className="space-y-6 text-center py-16">
        <h2 className="text-2xl font-bold text-slate-800">Expediente no encontrado</h2>
        <Link href="/admin/membresias">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="w-4 h-4" /> Volver a Cartera
          </Button>
        </Link>
      </div>
    );
  }

  const { associate, membership, summary, charges, payments, adjustments, plan_changes } = ledgerDetail;
  const hasMembership = Boolean(membership);

  // Set of adjustment IDs that have already been reversed
  const reversedAdjustmentIds = new Set(
    adjustments.filter((a) => a.type === "reversal" && a.reverses_adjustment_id).map((a) => a.reverses_adjustment_id!)
  );

  return (
    <div className="space-y-8">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-6">
        <div className="space-y-1">
          <Link
            href="/admin/membresias"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a Cartera General</span>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-900 font-heading">
              {associate.full_name}
            </h1>
            {getFinancialStatusBadge(summary.financial_status)}
          </div>
          <p className="text-xs text-slate-500 font-medium">
            {associate.email} • Doc: {associate.document_number || "Sin cédula"} • Especialidad: {associate.specialty || "Ginecología y Obstetricia"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {!hasMembership ? (
            <Button
              onClick={openAssignModal}
              className="bg-[#006666] hover:bg-[#004d4d] h-11 px-4 rounded-xl font-bold text-white text-xs gap-2 shadow-md shadow-[#006666]/20"
            >
              <Plus className="w-4 h-4" />
              <span>Asignar Membresía</span>
            </Button>
          ) : (
            <Button
              onClick={openChangePlanModal}
              variant="outline"
              className="h-11 px-4 rounded-xl font-bold text-slate-700 hover:bg-slate-50 text-xs gap-2 border-slate-200"
            >
              <RefreshCw className="w-4 h-4 text-[#006666]" />
              <span>Cambiar Plan</span>
            </Button>
          )}

          <Button
            onClick={openCreateChargeModal}
            className="bg-slate-900 hover:bg-slate-800 h-11 px-4 rounded-xl font-bold text-white text-xs gap-2 shadow-md"
          >
            <FileText className="w-4 h-4" />
            <span>Emitir Cargo</span>
          </Button>

          <Button
            onClick={openRegisterPaymentModal}
            className="bg-emerald-600 hover:bg-emerald-700 h-11 px-4 rounded-xl font-bold text-white text-xs gap-2 shadow-md shadow-emerald-600/20"
          >
            <DollarSign className="w-4 h-4" />
            <span>Registrar Pago</span>
          </Button>
        </div>
      </div>

      {/* Identity Summary Card */}
      <div className="bg-slate-900 text-white rounded-3xl p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#006666]/20 blur-3xl rounded-full -mr-20 -mt-20" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative z-10">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Plan Actual
            </span>
            <p className="text-xl font-bold text-white mt-1">{summary.plan_name}</p>
            <p className="text-xs text-[#006666] font-semibold mt-0.5">{summary.category_name}</p>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Estado Gremial & Billing
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {associate.status}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-800 text-slate-300 border border-slate-700">
                {summary.billing_status}
              </span>
            </div>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Vencimiento Pendiente
            </span>
            <p className="text-lg font-bold text-slate-200 mt-1">
              {summary.next_due_date
                ? formatMembershipDateOnly(summary.next_due_date)
                : "Sin cargos pendientes"}
            </p>
          </div>

          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Último Pago
            </span>
            <p className="text-lg font-bold text-slate-200 mt-1">
              {summary.last_payment_date
                ? formatMembershipDateOnly(summary.last_payment_date)
                : "Sin pagos registrados"}
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs space-y-1">
          <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
            Deuda Pendiente
          </span>
          <div className="text-2xl font-black text-rose-600">
            {formatMoney(summary.outstanding_balance, summary.currency)}
          </div>
          <p className="text-[11px] text-slate-500">Cargos abiertos vigentes</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs space-y-1">
          <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
            Crédito Disponible
          </span>
          <div className="text-2xl font-black text-blue-600">
            {formatMoney(summary.credit_balance, summary.currency)}
          </div>
          <p className="text-[11px] text-slate-500">Saldo a favor en pagos</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs space-y-1">
          <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
            Total Pagado
          </span>
          <div className="text-2xl font-black text-emerald-600">
            {formatMoney(summary.total_paid, summary.currency)}
          </div>
          <p className="text-[11px] text-slate-500">Histórico de recaudos</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs space-y-1">
          <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
            Total Cargado
          </span>
          <div className="text-2xl font-black text-slate-800">
            {formatMoney(summary.total_charged, summary.currency)}
          </div>
          <p className="text-[11px] text-slate-500">Histórico de obligaciones</p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 gap-6">
        {[
          { id: "RESUMEN", label: "Resumen Contable", icon: Info },
          { id: "CARGOS", label: `Cargos (${charges.length})`, icon: FileText },
          { id: "PAGOS", label: `Pagos (${payments.length})`, icon: DollarSign },
          { id: "AJUSTES", label: `Ajustes (${adjustments.length})`, icon: TrendingDown },
          { id: "HISTORIAL", label: `Historial Plan (${plan_changes.length})`, icon: History },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`pb-4 font-bold text-sm flex items-center gap-2 border-b-2 transition-all ${
                isActive
                  ? "border-[#006666] text-[#006666]"
                  : "border-transparent text-slate-400 hover:text-slate-700"
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
        {/* TAB 1: RESUMEN */}
        {activeTab === "RESUMEN" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Info className="w-5 h-5 text-[#006666]" />
                  <span>Detalles de la Membresía</span>
                </h3>
                {!hasMembership ? (
                  <Button
                    size="sm"
                    onClick={openAssignModal}
                    className="bg-[#006666] text-white text-xs font-bold rounded-lg"
                  >
                    Asignar Membresía
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={openChangePlanModal}
                    className="text-[#006666] border-[#006666]/30 text-xs font-bold rounded-lg"
                  >
                    Cambiar Plan
                  </Button>
                )}
              </div>

              <div className="space-y-3 text-xs divide-y divide-slate-100">
                <div className="flex justify-between py-2">
                  <span className="text-slate-500 font-medium">Categoría Gremial:</span>
                  <span className="font-bold text-slate-800">{summary.category_name}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-500 font-medium">Plan de Cobro:</span>
                  <span className="font-bold text-slate-800">{summary.plan_name}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-500 font-medium">Estado de Cobro (Billing):</span>
                  <span className="font-bold text-slate-800">{summary.billing_status}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-500 font-medium">Días de Gracia para Mora:</span>
                  <span className="font-bold text-slate-800">{summary.grace_period_days} días</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-500 font-medium">Moneda Predeterminada:</span>
                  <span className="font-bold text-slate-800">{summary.currency}</span>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-100 space-y-4">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#006666]" />
                <span>Reglas del Ledger 4A1</span>
              </h3>
              <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
                <p>• <strong>Semántica FIFO:</strong> Los pagos registrados se asignan automáticamente a las deudas más antiguas.</p>
                <p>• <strong>Inmutabilidad Contable:</strong> Los montos de cargos y pagos no pueden ser alterados o eliminados destructivamente.</p>
                <p>• <strong>Reversiones Auditables:</strong> Las anulaciones de pagos o condonaciones se registran mediante reversiones con sello de auditoría.</p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CARGOS */}
        {activeTab === "CARGOS" && (
          <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-xs">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="pl-6 py-4">Concepto</TableHead>
                  <TableHead>Monto Original</TableHead>
                  <TableHead>Asignado Pagos</TableHead>
                  <TableHead>Ajustes</TableHead>
                  <TableHead>Deuda Neta</TableHead>
                  <TableHead>Vencimiento</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right pr-6">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {charges.map((chg) => (
                  <TableRow key={chg.id} className="hover:bg-slate-50">
                    <TableCell className="pl-6 py-4 font-bold text-slate-900 text-xs">
                      {chg.concept}
                    </TableCell>
                    <TableCell className="text-xs font-bold">
                      {formatMoney(chg.original_amount, chg.currency)}
                    </TableCell>
                    <TableCell className="text-xs text-emerald-700 font-semibold">
                      {formatMoney(chg.allocated_amount || 0, chg.currency)}
                    </TableCell>
                    <TableCell className="text-xs text-blue-700 font-semibold">
                      {formatMoney(chg.adjustments_amount || 0, chg.currency)}
                    </TableCell>
                    <TableCell className="text-xs font-extrabold">
                      <span className={chg.net_debt! > 0 ? "text-rose-600" : "text-slate-400"}>
                        {formatMoney(chg.net_debt || 0, chg.currency)}
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-slate-500">
                      {formatMembershipDateOnlyShort(chg.due_date)}
                      {chg.is_overdue && (
                        <span className="ml-2 px-2 py-0.5 text-[9px] font-bold bg-rose-100 text-rose-700 rounded-full">
                          Vencido
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          chg.admin_status === "open"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {chg.admin_status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      {chg.admin_status === "open" && chg.net_debt! > 0 ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openCreateAdjustmentModal(chg)}
                          className="h-8 px-2.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg gap-1"
                        >
                          <Sliders className="w-3.5 h-3.5" />
                          <span>Aplicar Ajuste</span>
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-300 font-medium">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {charges.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-10 text-slate-400">
                      No hay cargos registrados para este asociado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* TAB 3: PAGOS */}
        {activeTab === "PAGOS" && (
          <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-xs">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="pl-6 py-4">Fecha Pago</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Asignado a Cargos</TableHead>
                  <TableHead>Crédito No Asignado</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right pr-6">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((pay) => (
                  <TableRow key={pay.id} className="hover:bg-slate-50">
                    <TableCell className="pl-6 py-4 text-xs font-bold text-slate-900">
                      {formatMembershipDateOnlyShort(pay.paid_at)}
                    </TableCell>
                    <TableCell className="text-xs font-extrabold text-emerald-700">
                      {formatMoney(pay.amount, pay.currency)}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-slate-700 uppercase">
                      {pay.payment_method}
                    </TableCell>
                    <TableCell className="text-xs font-semibold text-slate-800">
                      {formatMoney(pay.allocated_amount || 0, pay.currency)}
                    </TableCell>
                    <TableCell className="text-xs font-bold text-blue-600">
                      {formatMoney(pay.unallocated_credit || 0, pay.currency)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          pay.status === "completed"
                            ? "bg-emerald-100 text-emerald-700"
                            : pay.status === "refunded"
                            ? "bg-rose-100 text-rose-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {pay.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      {pay.status === "completed" ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openReversePaymentModal(pay)}
                          className="h-8 px-2.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg gap-1"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reversar</span>
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-400 font-medium">Revertido</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {payments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-slate-400">
                      No hay pagos registrados para este asociado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* TAB 4: AJUSTES */}
        {activeTab === "AJUSTES" && (
          <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-xs">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="pl-6 py-4">Fecha</TableHead>
                  <TableHead>Tipo Ajuste</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead className="text-right pr-6">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adjustments.map((adj) => {
                  const isReversalRow = adj.type === "reversal";
                  const isAlreadyReversed = reversedAdjustmentIds.has(adj.id);
                  const canReverse = !isReversalRow && !isAlreadyReversed;

                  return (
                    <TableRow key={adj.id} className="hover:bg-slate-50">
                      <TableCell className="pl-6 py-4 text-xs text-slate-500">
                        {new Date(adj.created_at).toLocaleDateString("es-ES")}
                      </TableCell>
                      <TableCell className="text-xs font-bold uppercase">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] ${
                            adj.type === "reversal"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-blue-100 text-blue-800"
                          }`}
                        >
                          {adj.type}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs font-extrabold">
                        {formatMoney(adj.amount, summary.currency)}
                      </TableCell>
                      <TableCell className="text-xs text-slate-600">{adj.reason}</TableCell>
                      <TableCell className="text-right pr-6">
                        {canReverse ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => openReverseAdjustmentModal(adj)}
                            className="h-8 px-2.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg gap-1"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Reversar Ajuste</span>
                          </Button>
                        ) : isAlreadyReversed ? (
                          <span className="text-xs text-slate-400 font-medium">Revertido</span>
                        ) : (
                          <span className="text-xs text-slate-300 font-medium">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {adjustments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-slate-400">
                      No hay ajustes contables registrados para este asociado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* TAB 5: HISTORIAL PLAN */}
        {activeTab === "HISTORIAL" && (
          <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-xs">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="pl-6 py-4">Fecha Cambio</TableHead>
                  <TableHead>Plan Anterior</TableHead>
                  <TableHead>Nuevo Plan</TableHead>
                  <TableHead>Motivo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plan_changes.map((pc) => (
                  <TableRow key={pc.id} className="hover:bg-slate-50">
                    <TableCell className="pl-6 py-4 text-xs text-slate-500">
                      {new Date(pc.changed_at).toLocaleDateString("es-ES")}
                    </TableCell>
                    <TableCell className="text-xs font-medium text-slate-600">
                      {pc.old_plan?.name || "Sin plan previo"}
                    </TableCell>
                    <TableCell className="text-xs font-bold text-[#006666]">
                      {pc.new_plan?.name}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600">{pc.reason || "-"}</TableCell>
                  </TableRow>
                ))}
                {plan_changes.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-slate-400">
                      No se han registrado cambios de plan para este asociado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* MODAL 1: EMITIR CARGO MANUAL */}
      <Dialog open={isCreateChargeModalOpen} onOpenChange={setIsCreateChargeModalOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold font-heading">
              Emitir Cargo Manual
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateChargeSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>Concepto del Cargo</Label>
              <Input
                required
                value={createChargeForm.concept}
                onChange={(e) => setCreateChargeForm({ ...createChargeForm, concept: e.target.value })}
                placeholder="Ej. Cuota de Membresía 2026"
                className="rounded-xl h-11"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Monto del Cargo ({summary.currency})</Label>
                <Input
                  type="number"
                  required
                  min={1}
                  value={createChargeForm.originalAmount}
                  onChange={(e) => setCreateChargeForm({ ...createChargeForm, originalAmount: e.target.value })}
                  placeholder="150000"
                  className="rounded-xl h-11 font-bold text-slate-900"
                />
              </div>

              <div className="space-y-2">
                <Label>Fecha Vencimiento</Label>
                <Input
                  type="date"
                  required
                  value={createChargeForm.dueDate}
                  onChange={(e) => setCreateChargeForm({ ...createChargeForm, dueDate: e.target.value })}
                  className="rounded-xl h-11"
                />
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 text-xs text-blue-900 flex items-start gap-2">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                Si el asociado posee saldo a favor no asignado ({formatMoney(summary.credit_balance, summary.currency)}), este se aplicará automáticamente al nuevo cargo tras ser emitido.
              </span>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-13 rounded-xl font-bold bg-slate-900 text-white text-base mt-2"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Emitir Cargo Manual"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 2: REGISTRAR PAGO MANUAL */}
      <Dialog open={isRegisterPaymentModalOpen} onOpenChange={setIsRegisterPaymentModalOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold font-heading">
              Registrar Pago Manual
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleRegisterPaymentSubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Monto del Pago ({summary.currency})</Label>
                <Input
                  type="number"
                  required
                  min={1}
                  value={registerPaymentForm.amount}
                  onChange={(e) => setRegisterPaymentForm({ ...registerPaymentForm, amount: e.target.value })}
                  placeholder="150000"
                  className="rounded-xl h-11 font-bold text-emerald-700"
                />
              </div>

              <div className="space-y-2">
                <Label>Método de Pago</Label>
                <select
                  value={registerPaymentForm.paymentMethod}
                  onChange={(e) => setRegisterPaymentForm({ ...registerPaymentForm, paymentMethod: e.target.value })}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 font-bold text-xs text-slate-800"
                >
                  <option value="bank_transfer">Transferencia Bancaria</option>
                  <option value="cash">Efectivo</option>
                  <option value="manual_admin">Consignación Administrativa</option>
                  <option value="credit_card">Tarjeta de Crédito / Débito</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Fecha del Pago</Label>
              <Input
                type="date"
                required
                value={registerPaymentForm.paidAt}
                onChange={(e) => setRegisterPaymentForm({ ...registerPaymentForm, paidAt: e.target.value })}
                className="rounded-xl h-11"
              />
            </div>

            <div className="space-y-2">
              <Label>Notas o Referencia de Pago</Label>
              <Input
                value={registerPaymentForm.notes}
                onChange={(e) => setRegisterPaymentForm({ ...registerPaymentForm, notes: e.target.value })}
                placeholder="Ej. Comprobante de transferencia bancaria #123456"
                className="rounded-xl h-11 text-xs"
              />
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-xs text-emerald-900 flex items-start gap-2">
              <Info className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>
                El pago se aplicará automáticamente a las obligaciones más antiguas del asociado (semántica FIFO). Cualquier excedente quedará como crédito a favor.
              </span>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-13 rounded-xl font-bold bg-emerald-600 text-white text-base mt-2"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Registrar Pago"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL 3: APLICAR AJUSTE CONTABLE */}
      <Dialog open={isCreateAdjustmentModalOpen} onOpenChange={setIsCreateAdjustmentModalOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold font-heading">
              Aplicar Ajuste Contable
            </DialogTitle>
          </DialogHeader>

          {selectedChargeForAdjustment && (
            <form onSubmit={handleCreateAdjustmentSubmit} className="space-y-4 pt-2">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs space-y-1">
                <span className="text-slate-400 font-medium">Cargo Seleccionado:</span>
                <p className="font-bold text-slate-800">{selectedChargeForAdjustment.concept}</p>
                <div className="flex justify-between pt-2 border-t border-slate-200">
                  <span className="text-slate-500">Deuda Ajustable Restante:</span>
                  <span className="font-black text-rose-600">
                    {formatMoney(selectedChargeForAdjustment.net_debt || 0, selectedChargeForAdjustment.currency)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Tipo de Ajuste</Label>
                <select
                  value={createAdjustmentForm.type}
                  onChange={(e) => setCreateAdjustmentForm({ ...createAdjustmentForm, type: e.target.value })}
                  className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 font-bold text-xs text-slate-800"
                >
                  <option value="waiver">Condonación (Waiver)</option>
                  <option value="discount">Descuento Promocional (Discount)</option>
                  <option value="write_off">Castigo de Cartera (Write-Off)</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Monto a Ajustar ({summary.currency})</Label>
                <Input
                  type="number"
                  required
                  min={1}
                  max={selectedChargeForAdjustment.net_debt || 0}
                  value={createAdjustmentForm.amount}
                  onChange={(e) => setCreateAdjustmentForm({ ...createAdjustmentForm, amount: e.target.value })}
                  className="rounded-xl h-11 font-bold text-blue-700"
                />
              </div>

              <div className="space-y-2">
                <Label>Motivo Administrativo (Auditable)</Label>
                <Input
                  required
                  minLength={3}
                  value={createAdjustmentForm.reason}
                  onChange={(e) => setCreateAdjustmentForm({ ...createAdjustmentForm, reason: e.target.value })}
                  placeholder="Ej. Condonación aprobada por Junta Directiva Acta #45"
                  className="rounded-xl h-11 text-xs"
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-13 rounded-xl font-bold bg-blue-700 text-white text-base mt-2"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Aplicar Ajuste Contable"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL 4: REVERSAR PAGO */}
      <Dialog open={isReversePaymentModalOpen} onOpenChange={setIsReversePaymentModalOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold font-heading text-rose-700">
              Reversar Pago
            </DialogTitle>
          </DialogHeader>

          {selectedPaymentForReversal && (
            <form onSubmit={handleReversePaymentSubmit} className="space-y-4 pt-2">
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-rose-900 space-y-2">
                <div className="flex items-center gap-2 font-bold text-rose-800">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Advertencia de Reversión Financiera</span>
                </div>
                <p>
                  Al reversar este pago de <strong>{formatMoney(selectedPaymentForReversal.amount, selectedPaymentForReversal.currency)}</strong>, sus asignaciones a deudas pendientes dejarán de tener efecto y las obligaciones correspondientes volverán a aparecer como deudas activas.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Motivo de la Reversión (Auditable)</Label>
                <Input
                  required
                  minLength={3}
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  placeholder="Ej. Anulación por cheque devuelto o error de digitación..."
                  className="rounded-xl h-11 text-xs"
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-13 rounded-xl font-bold bg-rose-700 text-white text-base mt-2"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirmar Reversión de Pago"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* MODAL 5: REVERSAR AJUSTE */}
      <Dialog open={isReverseAdjustmentModalOpen} onOpenChange={setIsReverseAdjustmentModalOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold font-heading text-rose-700">
              Reversar Ajuste Contable
            </DialogTitle>
          </DialogHeader>

          {selectedAdjustmentForReversal && (
            <form onSubmit={handleReverseAdjustmentSubmit} className="space-y-4 pt-2">
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-xs text-rose-900 space-y-2">
                <div className="flex items-center gap-2 font-bold text-rose-800">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Advertencia de Reversión de Ajuste</span>
                </div>
                <p>
                  Al reversar el ajuste de <strong>{selectedAdjustmentForReversal.type.toUpperCase()}</strong> por <strong>{formatMoney(selectedAdjustmentForReversal.amount, summary.currency)}</strong>, la deuda del cargo aumentará nuevamente en ese mismo monto.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Motivo de la Reversión del Ajuste (Auditable)</Label>
                <Input
                  required
                  minLength={3}
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  placeholder="Ej. Revocación de descuento por incumplimiento de acuerdo..."
                  className="rounded-xl h-11 text-xs"
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-13 rounded-xl font-bold bg-rose-700 text-white text-base mt-2"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Confirmar Reversión de Ajuste"}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ASSIGN INITIAL MEMBERSHIP MODAL */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold font-heading">
              Asignar Membresía Inicial
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAssignSubmit} className="space-y-5 pt-2">
            <div className="space-y-2">
              <Label>Categoría Gremial</Label>
              <select
                value={assignForm.categoryId}
                onChange={(e) => setAssignForm({ ...assignForm, categoryId: e.target.value })}
                className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 font-bold text-xs text-slate-800"
              >
                {activeCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Plan de Membresía</Label>
              <select
                required
                value={assignForm.planId}
                onChange={(e) => setAssignForm({ ...assignForm, planId: e.target.value })}
                className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 font-bold text-xs text-slate-800"
              >
                {activePlans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({formatMoney(p.standard_amount, p.currency)})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Fecha Anclaje de Cobro (billing_anchor_date)</Label>
              <Input
                type="date"
                required
                value={assignForm.billingAnchorDate}
                onChange={(e) => setAssignForm({ ...assignForm, billingAnchorDate: e.target.value })}
                className="rounded-xl h-11"
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-13 rounded-xl font-bold bg-[#006666] text-white text-base mt-2"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Guardar y Asignar Plan"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ATOMIC CHANGE PLAN MODAL */}
      <Dialog open={isChangePlanModalOpen} onOpenChange={setIsChangePlanModalOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold font-heading">
              Cambiar Plan de Membresía (Atómico)
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleChangePlanSubmit} className="space-y-5 pt-2">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs space-y-1">
              <span className="text-slate-400 font-medium">Plan Actual Registrado:</span>
              <p className="font-bold text-slate-800 text-sm">{summary.plan_name}</p>
            </div>

            <div className="space-y-2">
              <Label>Nuevo Plan de Membresía</Label>
              <select
                required
                value={changePlanForm.newPlanId}
                onChange={(e) => setChangePlanForm({ ...changePlanForm, newPlanId: e.target.value })}
                className="w-full h-11 rounded-xl border border-slate-200 bg-white px-3 font-bold text-xs text-slate-800"
              >
                {activePlans
                  .filter((p) => p.id !== membership?.membership_plan_id)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({formatMoney(p.standard_amount, p.currency)})
                    </option>
                  ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Motivo del Cambio de Plan (Auditable)</Label>
              <Input
                required
                minLength={3}
                value={changePlanForm.reason}
                onChange={(e) => setChangePlanForm({ ...changePlanForm, reason: e.target.value })}
                placeholder="Ej. Solicitud escrita del asociado para cambio a tarifa anual..."
                className="rounded-xl h-11 text-xs"
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-13 rounded-xl font-bold bg-[#006666] text-white text-base mt-2"
            >
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Ejecutar Cambio de Plan Atómico"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
