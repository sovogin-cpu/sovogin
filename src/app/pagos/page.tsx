"use client";

import React, { useState } from "react";
import { CheckCircle2, AlertCircle, Loader2, ArrowRight, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { NEW_MEMBERSHIP_FEE_COP, formatCopAmount } from "@/config/membership";

export default function PaymentsPage() {
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentType, setPaymentType] = useState("membership");

  const handlePayment = async () => {
    const finalAmount = paymentType === "new" ? NEW_MEMBERSHIP_FEE_COP : parseFloat(amount);
    
    if (!finalAmount || finalAmount < 1000) {
      alert("Por favor ingresa un valor válido (mínimo $1.000)");
      return;
    }

    setIsProcessing(true);
    
    // Aquí se integraría el Widget de Wompi o la llamada a tu API de pagos
    // Por ahora simulamos la redirección
    setTimeout(() => {
      alert(`Redirigiendo a Wompi para pagar $${new Intl.NumberFormat('es-CO').format(finalAmount)} COP...`);
      setIsProcessing(false);
    }, 1500);
  };

  return (
    <main className="pt-32 pb-20 min-h-screen bg-slate-50">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 font-heading mb-4">Portal de Pagos</h1>
          <p className="text-slate-500 text-lg">Gestiona tus aportes y membresías de forma segura con Openpay.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Instrucciones */}
          <div className="md:col-span-1 space-y-6">
            <Card className="border-none shadow-sm rounded-3xl bg-primary text-white">
              <CardContent className="p-6 space-y-4">
                <Wallet className="w-10 h-10 opacity-20" />
                <h3 className="font-bold text-xl">¿Cómo pagar?</h3>
                <ul className="text-sm space-y-3 opacity-90">
                  <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 shrink-0" /> Selecciona el tipo de pago.</li>
                  <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 shrink-0" /> Ingresa el valor si es mensualidad.</li>
                  <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 shrink-0" /> Completa el pago en Openpay.</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm rounded-3xl bg-white">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 text-amber-600 mb-2">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Aviso</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Los pagos realizados después de las 5:00 PM se verán reflejados en tu estado de cuenta al siguiente día hábil.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Formulario de Pago */}
          <div className="md:col-span-2">
            <Card className="border-none shadow-xl rounded-[2.5rem] bg-white overflow-hidden">
              <CardHeader className="p-8 border-b border-slate-50">
                <CardTitle className="text-2xl font-bold font-heading">Detalles del Aporte</CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <Tabs defaultValue="membership" onValueChange={setPaymentType} className="w-full">
                  <TabsList className="grid grid-cols-2 rounded-2xl mb-8 bg-slate-100 p-1.5 h-14">
                    <TabsTrigger value="membership" className="rounded-xl font-bold text-sm">Mensualidad / Aporte</TabsTrigger>
                    <TabsTrigger value="new" className="rounded-xl font-bold text-sm">Nueva Inscripción</TabsTrigger>
                  </TabsList>

                  <TabsContent value="membership" className="space-y-6">
                    <div className="space-y-4">
                      <Label className="text-slate-600 font-bold">Valor a pagar (COP)</Label>
                      <div className="relative">
                        <span className="absolute left-6 top-1/2 -translate-y-1/2 text-2xl font-bold text-slate-400">$</span>
                        <Input 
                          type="number" 
                          placeholder="Ej: 100.000" 
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          className="h-20 pl-12 text-3xl font-bold rounded-2xl border-2 border-slate-100 focus:border-primary transition-all"
                        />
                      </div>
                      <p className="text-sm text-slate-400 italic">Ingresa el monto total que deseas abonar a tu cuenta.</p>
                    </div>
                  </TabsContent>

                  <TabsContent value="new" className="space-y-6">
                    <div className="p-8 rounded-3xl bg-slate-50 border border-slate-100 text-center">
                      <p className="text-slate-500 font-medium mb-2">Costo de inscripción para nuevos asociados</p>
                      <div className="text-5xl font-bold text-slate-900 font-heading">{formatCopAmount(NEW_MEMBERSHIP_FEE_COP)}</div>
                      <p className="text-primary font-bold mt-2 uppercase tracking-widest text-xs">Pago Único</p>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="pt-4">
                  <Button 
                    onClick={handlePayment} 
                    disabled={isProcessing}
                    className="w-full h-16 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xl shadow-2xl transition-all gap-3"
                  >
                    {isProcessing ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                      <>
                        Proceder al Pago Seguro
                        <ArrowRight className="w-6 h-6" />
                      </>
                    )}
                  </Button>
                  <div className="mt-6 flex items-center justify-center gap-4 grayscale opacity-50">
                    <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" alt="Visa" className="h-4" />
                    <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" alt="Mastercard" className="h-6" />
                    <img src="https://wompi.com/assets/img/logo-wompi.svg" alt="Wompi" className="h-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  );
}
