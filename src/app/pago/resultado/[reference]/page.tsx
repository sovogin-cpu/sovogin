import React from "react";
import Link from "next/link";
import { CheckCircle2, XCircle, Clock, ArrowLeft, Calendar, RefreshCcw, Mail, BadgeCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { StatusPoller } from "@/components/payments/StatusPoller";

interface PageProps {
  params: Promise<{ reference: string }>;
}

function maskEmail(email?: string) {
  if (!email) return "";
  const parts = email.split("@");
  if (parts.length !== 2) return email;
  const [name, domain] = parts;
  const visible = name.length > 2 ? name.slice(0, 2) : name.slice(0, 1);
  const maskedName = visible + "*".repeat(Math.max(1, name.length - visible.length));
  return `${maskedName}@${domain}`;
}

export default async function DynamicPaymentResultPage({ params }: PageProps) {
  const { reference } = await params;
  const decodedReference = decodeURIComponent(reference || "");

  let order: any = null;
  let error: any = null;

  if (decodedReference) {
    const response = await supabaseAdmin
      .from("payment_orders")
      .select(`
        reference,
        product_id,
        product_name,
        customer_email,
        amount,
        currency,
        status,
        openpay_status,
        authorization_code,
        registration_id,
        confirmation_email_sent_at,
        paid_at,
        created_at
      `)
      .eq("reference", decodedReference)
      .maybeSingle();

    order = response.data;
    error = response.error;

    if (error) {
      console.error("Error buscando orden de pago:", {
        reference: decodedReference,
        message: error.message,
        code: error.code,
      });
    }
  }

  // Handle "Orden no encontrada" case
  if (!decodedReference || (!order && !error)) {
    return (
      <main className="pt-32 pb-20 min-h-screen bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto bg-white rounded-[3rem] p-12 border border-slate-100 shadow-xl text-center space-y-6">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400">
              <XCircle className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 font-heading">Orden no encontrada</h2>
            <p className="text-slate-500 max-w-md mx-auto text-sm leading-relaxed">
              No pudimos localizar la referencia <span className="font-mono font-bold text-slate-700">{decodedReference || "N/A"}</span> en la base de datos de SOVOGIN. Si realizaste el pago en Openpay, conserva tu comprobante de transacción.
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

  if (error && !order) {
    return (
      <main className="pt-32 pb-20 min-h-screen bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto bg-white rounded-[3rem] p-12 border border-slate-100 shadow-xl text-center space-y-6">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500">
              <XCircle className="w-10 h-10" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 font-heading">Error al consultar la orden</h2>
            <p className="text-slate-500 max-w-md mx-auto text-sm leading-relaxed">
              Ocurrió un problema temporal al comunicarse con el servidor. Por favor intenta recargar la página.
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

  const isPaid = order.status === "paid";
  const isPending = order.status === "pending" || order.status === "processing";
  const isRefunded = order.status === "refunded";
  const isFailed = order.status === "failed" || order.status === "cancelled" || order.status === "expired";

  return (
    <main className="pt-32 pb-20 min-h-screen bg-slate-50">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto bg-white rounded-[3rem] p-8 md:p-12 border border-slate-100 shadow-xl text-center space-y-8">
          {/* Status Icons & Messages */}
          {isPaid && (
            <>
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <div className="space-y-3">
                <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full uppercase tracking-wider">
                  Pago Aprobado
                </span>
                <h1 className="text-3xl md:text-4xl font-bold text-slate-900 font-heading">Pago aprobado</h1>
                <p className="text-slate-500 text-sm">
                  Tu pago ha sido verificado y registrado exitosamente en el sistema de SOVOGIN.
                </p>

                {/* Additional registration & email confirmation notices */}
                <div className="pt-2 flex flex-col items-center gap-2 text-xs font-medium text-slate-600">
                  {order.registration_id && (
                    <div className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-100 font-semibold">
                      <BadgeCheck className="w-4 h-4 text-emerald-600" />
                      <span>Tu inscripción fue registrada correctamente</span>
                    </div>
                  )}

                  {order.customer_email && (
                    <div className="inline-flex items-center gap-1.5 text-slate-500">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {order.confirmation_email_sent_at
                          ? `Enviamos la confirmación a ${maskEmail(order.customer_email)}`
                          : `Enviando correo de confirmación a ${maskEmail(order.customer_email)}...`}
                      </span>
                    </div>
                  )}
                </div>
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
                <h1 className="text-3xl md:text-4xl font-bold text-slate-900 font-heading">Estamos verificando tu pago</h1>
                <p className="text-slate-500 text-sm">
                  Estamos procesando la confirmación de Openpay. Esta pantalla actualizará el estado automáticamente.
                </p>
                <StatusPoller reference={decodedReference} initialStatus={order.status} />
              </div>
            </>
          )}

          {isRefunded && (
            <>
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto text-blue-600">
                <RefreshCcw className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full uppercase tracking-wider">
                  Pago Reembolsado
                </span>
                <h1 className="text-3xl md:text-4xl font-bold text-slate-900 font-heading">Pago reembolsado</h1>
                <p className="text-slate-500 text-sm">
                  El importe de este pago ha sido devuelto a tu medio de pago original.
                </p>
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
                <h1 className="text-3xl md:text-4xl font-bold text-slate-900 font-heading">Pago no completado</h1>
                <p className="text-slate-500 text-sm">
                  La transacción fue declinada por la entidad financiera o cancelada antes de su procesamiento.
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
              <span className="font-bold text-slate-900">
                ${new Intl.NumberFormat('es-CO').format(order.amount)} {order.currency || "COP"}
              </span>
            </div>
            {order.authorization_code && (
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500 font-medium">Autorización:</span>
                <span className="font-bold text-slate-900 font-mono">{order.authorization_code}</span>
              </div>
            )}
            {order.paid_at && (
              <div className="flex justify-between py-1">
                <span className="text-slate-500 font-medium">Fecha de Pago:</span>
                <span className="font-bold text-slate-900">
                  {new Date(order.paid_at).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })}
                </span>
              </div>
            )}
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
