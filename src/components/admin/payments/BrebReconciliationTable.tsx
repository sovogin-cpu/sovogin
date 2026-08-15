"use client";

import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Building2,
  CreditCard,
  Eye,
  CheckCircle2,
  Clock,
  Ban,
  AlertTriangle,
  Tag,
} from "lucide-react";
import {
  BrebPaymentDetailDialog,
  PaymentOrderRecord,
} from "./BrebPaymentDetailDialog";

interface BrebReconciliationTableProps {
  orders: PaymentOrderRecord[];
  loading: boolean;
  onRefresh: () => void;
}

export const BrebReconciliationTable: React.FC<
  BrebReconciliationTableProps
> = ({ orders, loading, onRefresh }) => {
  const [selectedOrder, setSelectedOrder] = useState<PaymentOrderRecord | null>(
    null
  );
  const [detailOpen, setDetailOpen] = useState(false);

  const handleOpenDetail = (order: PaymentOrderRecord) => {
    setSelectedOrder(order);
    setDetailOpen(true);
  };

  const formatCOP = (val: number) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(val);

  const renderMethodBadge = (method: string) => {
    if (method === "breb_qr") {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
          <Building2 className="w-3.5 h-3.5 text-blue-600" />
          Bre-B QR
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
        <CreditCard className="w-3.5 h-3.5 text-purple-600" />
        {method || "Openpay"}
      </span>
    );
  };

  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "pending_verification":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300 animate-pulse">
            <Clock className="w-3.5 h-3.5 text-amber-700" />
            Pendiente Verificación
          </span>
        );
      case "paid":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Pagado
          </span>
        );
      case "cancelled":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-red-50 text-red-700 border border-red-200">
            <Ban className="w-3.5 h-3.5 text-red-600" />
            Rechazado
          </span>
        );
      case "pending":
      case "processing":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            {status === "pending" ? "Pendiente" : "Procesando"}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 uppercase">
            <AlertTriangle className="w-3.5 h-3.5 text-slate-400" />
            {status}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400 font-medium text-sm">
        Cargando órdenes de pago...
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="py-16 text-center bg-slate-50 rounded-3xl border border-slate-200/60 p-8 space-y-2">
        <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
        <h4 className="text-base font-bold text-slate-700">
          No se encontraron órdenes de pago
        </h4>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          No existen registros de pago que coincidan con los filtros seleccionados.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50/80">
            <TableRow>
              <TableHead className="font-bold text-slate-700 text-xs">
                Referencia / Fecha
              </TableHead>
              <TableHead className="font-bold text-slate-700 text-xs">
                Asistente
              </TableHead>
              <TableHead className="font-bold text-slate-700 text-xs">
                Evento / Categoría
              </TableHead>
              <TableHead className="font-bold text-slate-700 text-xs text-right">
                Monto
              </TableHead>
              <TableHead className="font-bold text-slate-700 text-xs text-center">
                Método
              </TableHead>
              <TableHead className="font-bold text-slate-700 text-xs text-center">
                Estado
              </TableHead>
              <TableHead className="font-bold text-slate-700 text-xs text-right">
                Acción
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => {
              const fullName = `${order.customer_name || ""} ${order.customer_last_name || ""}`.trim() || "Asistente";
              const dateStr = new Date(order.created_at).toLocaleDateString("es-CO", {
                day: "numeric",
                month: "short",
                year: "numeric",
              });

              const isPendingVerif = order.status === "pending_verification";

              return (
                <TableRow
                  key={order.id}
                  className={`hover:bg-slate-50/80 transition-colors ${
                    isPendingVerif ? "bg-amber-50/30" : ""
                  }`}
                >
                  <TableCell className="align-middle">
                    <div className="font-mono text-xs font-bold text-slate-900">
                      {order.reference}
                    </div>
                    <div className="text-[11px] text-slate-400">{dateStr}</div>
                  </TableCell>

                  <TableCell className="align-middle">
                    <div className="text-xs font-bold text-slate-900">
                      {fullName}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {order.customer_email}
                    </div>
                  </TableCell>

                  <TableCell className="align-middle">
                    <div className="text-xs font-semibold text-slate-800 line-clamp-1">
                      {order.product_name}
                    </div>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Tag className="w-3 h-3 text-slate-400" />
                      <span>{order.category || "General"}</span>
                      <span className="uppercase text-[10px] bg-slate-100 px-1 rounded">
                        ({order.modality || "presencial"})
                      </span>
                    </div>
                  </TableCell>

                  <TableCell className="align-middle text-right font-mono font-bold text-xs text-slate-900">
                    {formatCOP(order.amount)}
                  </TableCell>

                  <TableCell className="align-middle text-center">
                    {renderMethodBadge(order.payment_method)}
                  </TableCell>

                  <TableCell className="align-middle text-center">
                    {renderStatusBadge(order.status)}
                  </TableCell>

                  <TableCell className="align-middle text-right">
                    {isPendingVerif ? (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleOpenDetail(order)}
                        className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl h-8 px-3 shadow-sm flex items-center gap-1.5 ml-auto"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Revisar
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDetail(order)}
                        className="h-8 px-2 text-xs text-slate-600 hover:text-slate-900"
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Modal de Detalle y Conciliación */}
      <BrebPaymentDetailDialog
        isOpen={detailOpen}
        order={selectedOrder}
        onClose={() => setDetailOpen(false)}
        onSuccess={onRefresh}
      />
    </>
  );
};
