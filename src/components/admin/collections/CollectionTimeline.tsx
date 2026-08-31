"use client";

import React from "react";
import {
  Mail,
  Phone,
  MessageSquare,
  UserCheck,
  HelpCircle,
  Laptop,
  Calendar,
  Clock,
  DollarSign,
  AlertCircle,
  FileText,
} from "lucide-react";
import { CollectionAction } from "@/lib/collections/types";

export interface ExtendedCollectionAction extends CollectionAction {
  performed_by_profile?: {
    full_name?: string | null;
  } | null;
}

interface CollectionTimelineProps {
  actions: ExtendedCollectionAction[];
}

export function CollectionTimeline({ actions }: CollectionTimelineProps) {
  if (!actions || actions.length === 0) {
    return (
      <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-8 text-center my-4">
        <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <h4 className="text-sm font-semibold text-slate-700">Sin gestiones registradas</h4>
        <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
          No hay interacciones de cobranza registradas para este asociado. Utiliza el botón &quot;Registrar Gestión&quot; para agregar una.
        </p>
      </div>
    );
  }

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case "email":
        return <Mail className="w-4 h-4 text-blue-600" />;
      case "phone":
        return <Phone className="w-4 h-4 text-emerald-600" />;
      case "whatsapp":
        return <MessageSquare className="w-4 h-4 text-green-600" />;
      case "in_person":
        return <UserCheck className="w-4 h-4 text-purple-600" />;
      case "system":
        return <Laptop className="w-4 h-4 text-slate-600" />;
      default:
        return <HelpCircle className="w-4 h-4 text-slate-500" />;
    }
  };

  const getChannelLabel = (channel: string) => {
    switch (channel) {
      case "email":
        return "Correo Electrónico";
      case "phone":
        return "Llamada Telefónica";
      case "whatsapp":
        return "WhatsApp";
      case "in_person":
        return "Presencial";
      case "system":
        return "Sistema";
      default:
        return "Otro Canal";
    }
  };

  const getActionTypeLabel = (actionType: string) => {
    switch (actionType) {
      case "initial_reminder":
        return "Recordatorio Inicial";
      case "payment_notice":
        return "Aviso de Pago";
      case "follow_up":
        return "Seguimiento General";
      case "payment_promise":
        return "Promesa de Pago";
      case "dispute":
        return "Disputa / Objeción";
      case "escalation":
        return "Escalamiento";
      case "note":
        return "Nota Interna";
      default:
        return actionType;
    }
  };

  const getResultStatusBadge = (status: string) => {
    switch (status) {
      case "contacted":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            Contactado
          </span>
        );
      case "no_answer":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            Sin Respuesta
          </span>
        );
      case "promise_agreed":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            Compromiso Acordado
          </span>
        );
      case "disputed":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
            En Disputa
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            Pendiente
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
            {status}
          </span>
        );
    }
  };

  const formatDate = (isoStr: string) => {
    try {
      const date = new Date(isoStr);
      return date.toLocaleString("es-CO", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Bogota",
      });
    } catch {
      return isoStr;
    }
  };

  const formatMoney = (amount: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="relative pl-6 border-l-2 border-slate-200 space-y-6 my-4">
      {actions.map((action) => {
        const adminName =
          action.performed_by_profile?.full_name ||
          "Administrador";

        return (
          <div key={action.id} className="relative group">
            {/* Dot icon en el timeline */}
            <div className="absolute -left-[31px] top-1 bg-white border-2 border-slate-300 group-hover:border-blue-500 rounded-full p-1 transition-colors">
              {getChannelIcon(action.channel)}
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
              {/* Header de la gestión */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 text-sm">
                    {getActionTypeLabel(action.action_type)}
                  </span>
                  <span className="text-slate-400 text-xs">•</span>
                  <span className="text-xs font-medium text-slate-600 flex items-center gap-1">
                    {getChannelLabel(action.channel)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {getResultStatusBadge(action.result_status)}
                  <span className="text-xs text-slate-400">
                    {formatDate(action.created_at)}
                  </span>
                </div>
              </div>

              {/* Notas de la gestión */}
              {action.notes && (
                <p className="text-sm text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100 whitespace-pre-wrap mb-3">
                  {action.notes}
                </p>
              )}

              {/* Promesa de Pago o Próximo Seguimiento */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                {action.promised_payment_date && (
                  <div className="flex items-center gap-1.5 bg-emerald-50/60 text-emerald-800 p-2 rounded-md border border-emerald-100">
                    <DollarSign className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="font-medium">Promesa de Pago:</span>{" "}
                      {action.promised_payment_amount
                        ? formatMoney(action.promised_payment_amount)
                        : ""}{" "}
                      el <span className="font-bold">{action.promised_payment_date}</span>
                    </div>
                  </div>
                )}

                {action.next_follow_up_at && (
                  <div className="flex items-center gap-1.5 bg-blue-50/60 text-blue-800 p-2 rounded-md border border-blue-100">
                    <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                    <div>
                      <span className="font-medium">Próximo Seguimiento:</span>{" "}
                      <span className="font-bold">{formatDate(action.next_follow_up_at)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer de Auditoría */}
              <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Registrado por: <strong className="text-slate-600 font-medium">{adminName}</strong></span>
                <span className="font-mono text-[10px] text-slate-300">ID: {action.id.substring(0, 8)}...</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
