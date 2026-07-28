"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Calendar, ArrowLeft } from "lucide-react";

export default function PaymentResultFallbackPage() {
  return (
    <main className="pt-32 pb-20 min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="container mx-auto px-4 max-w-xl">
        <div className="bg-white rounded-[3rem] p-10 md:p-12 border border-slate-100 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto text-primary">
            <Calendar className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 font-heading">Portal de Resultado de Pagos</h1>
          <p className="text-slate-500 text-sm leading-relaxed">
            Esta es la página de retorno general. Para consultar el estado de una transacción en específico, ingresa al enlace que te redirigió la pasarela de pagos o regresa a la lista de eventos.
          </p>
          <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/simposios">
              <Button className="w-full sm:w-auto h-12 px-8 rounded-xl font-bold bg-primary text-white gap-2">
                <ArrowLeft className="w-4 h-4" />
                Volver a Simposios
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
