"use client";

import React, { useEffect, useState, use } from "react";
import { CheckCircle2, XCircle, Clock, ArrowLeft, Loader2, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";

interface PageProps {
  params: Promise<{ reference: string }>;
}

export default function DynamicPaymentResultPage({ params }: PageProps) {
  const { reference: rawReference } = use(params);
  const decodedReference = decodeURIComponent(rawReference || "");

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pollCount, setPollCount] = useState(0);

  const supabase = createClient();

  async function fetchOrder() {
    if (!decodedReference) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("payment_orders")
        .select("*")
        .eq("reference", decodedReference)
        .maybeSingle();

      if (!error && data) {
        setOrder(data);
      }
    } catch (err) {
      console.error("Error al consultar la orden:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOrder();
  }, [decodedReference]);

  // Polling logic: if pending or processing, poll every 3 seconds for up to 30s (10 attempts)
  useEffect(() => {
    if (!order) return;

    const isPending = order.status === "pending" || order.status === "processing";
    if (!isPending || pollCount >= 10) return;

    const timer = setTimeout(() => {
      setPollCount((prev) => prev + 1);
      fetchOrder();
    }, 3000);

    return () => clearTimeout(timer);
  }, [order, pollCount]);

  if (loading) {
    return (
      <main className="pt-32 pb-20 min-h-screen bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto bg-white rounded-[3rem] p-12 border border-slate-100 shadow-xl text-center space-y-6">
            <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
            <h2 className="text-2xl font-bold text-slate-900 font-heading">Consultando estado del pago</h2>
            <p className="text-slate-500 font-medium text-sm">Verificando en la base de datos de SOVOGIN...</p>
          </div>
        </div>
      </main>
    );
  }

  if (!decodedReference || !order) {
    return (
      <main className="pt-32 pb-20 min-h-screen bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto bg-white rounded-[3rem] p-12 border border-slate-100 shadow-xl text-center space-y-6">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <XCircle className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 font-heading">Orden no encontrada</h2>
            <p className="text-slate-500 max-w-md mx-auto text-sm">
              No pudimos localizar la referencia <span className="font-mono font-bold text-slate-700">{decodedReference}</span> en la base de datos. Si realizaste el pago en Openpay, tu comprobante sirve de constancia.
            </p>
            <div className="pt-2">
              <Link href="/simposios">
                <Button className="h-12 px-8 rounded-xl font-bold bg-primary text-white gap-2">
                  <Calendar className="w-4 h-4" />
                  Ver Simposios
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  const isSuccess = order.status === "paid";
  const isPending = order.status === "pending" || order.status === "processing";
  const isFailed = order.status === "failed" || order.status === "cancelled" || order.status === "expired";

  return (
    <main className="pt-32 pb-20 min-h-screen bg-slate-50">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto bg-white rounded-[3rem] p-8 md:p-12 border border-slate-100 shadow-xl text-center space-y-8">
          {isSuccess && (
            <>
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full uppercase tracking-wider">
                  Pago Aprobado
                </span>
                <h1 className="text-3xl md:text-4xl font-bold text-slate-900 font-heading">Pago aprobado</h1>
                <p className="text-slate-500 text-sm">
                  Tu pago ha sido verificado y registrado exitosamente en el sistema.
                </p>
              </div>
            </>
          )}

          {isPending && (
            <>
              <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-600">
                <Clock className="w-10 h-10 animate-pulse" />
              </div>
              <div className="space-y-2">
                <span className="px-3 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full uppercase tracking-wider">
                  Pago Pendiente
                </span>
                <h1 className="text-3xl md:text-4xl font-bold text-slate-900 font-heading">Pago pendiente</h1>
                <p className="text-slate-500 text-sm">
                  Estamos esperando la confirmación final de Openpay. La página se actualizará automáticamente.
                </p>
                {pollCount > 0 && pollCount < 10 && (
                  <p className="text-xs text-amber-600 font-medium animate-pulse">
                    Verificando estado... (intento {pollCount}/10)
                  </p>
                )}
              </div>
            </>
          )}

          {isFailed && (
            <>
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
                <XCircle className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <span className="px-3 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-full uppercase tracking-wider">
                  Pago Rechazado
                </span>
                <h1 className="text-3xl md:text-4xl font-bold text-slate-900 font-heading">Pago rechazado</h1>
                <p className="text-slate-500 text-sm">
                  La transacción no pudo ser completada por la entidad financiera o fue cancelada.
                </p>
              </div>
            </>
          )}

          {/* Details Box */}
          <div className="bg-slate-50 rounded-2xl p-6 text-left space-y-3 border border-slate-100 text-sm">
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Referencia:</span>
              <span className="font-bold text-slate-900 font-mono">{order.reference}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Concepto:</span>
              <span className="font-bold text-slate-900">{order.product_name}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Monto:</span>
              <span className="font-bold text-slate-900">${new Intl.NumberFormat('es-CO').format(order.amount)} COP</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500 font-medium">Comprador:</span>
              <span className="font-bold text-slate-900">{order.customer_name} {order.customer_last_name}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-500 font-medium">Identificación:</span>
              <span className="font-bold text-slate-900">{order.customer_document_type} - {order.customer_document_number}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            {order.product_id && (
              <Link href={`/eventos/live/${order.product_id}`}>
                <Button className="w-full sm:w-auto h-12 px-8 rounded-xl font-bold bg-primary text-white gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Volver al Evento
                </Button>
              </Link>
            )}
            <Link href="/simposios">
              <Button variant="outline" className="w-full sm:w-auto h-12 px-8 rounded-xl font-bold border-slate-200 text-slate-700 hover:bg-slate-50 gap-2">
                <Calendar className="w-4 h-4" />
                Ver más Simposios
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
