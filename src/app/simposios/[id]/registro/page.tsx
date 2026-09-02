"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Calendar,
  MapPin,
  User,
  Mail,
  Smartphone,
  CreditCard,
  Loader2,
  ChevronLeft,
  Building2,
  Video
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";
import { PaymentSelectionForm } from "@/components/payments/PaymentSelectionForm";
import {
  normalizePricingTiersToV2,
  formatCOP,
  MODALITY_SENTINEL,
  EventPricingTierV2,
} from "@/lib/payments/event-pricing";

interface SimposioEvent {
  id: string;
  title: string;
  date?: string;
  location?: string;
  category?: string;
  price?: number;
  image_url?: string;
  tiered_pricing?: {
    version?: number;
    tiers?: any[];
  };
}

export default function RegistrationPage() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [event, setEvent] = useState<SimposioEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    document: "",
    phone: "",
    category_index: 0,
  });

  useEffect(() => {
    let isMounted = true;
    async function loadEvent() {
      if (!id) return;
      const { data } = await supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .single();
      if (isMounted) {
        if (data) setEvent(data as SimposioEvent);
        setLoading(false);
      }
    }
    void loadEvent();
    return () => {
      isMounted = false;
    };
  }, [id, supabase]);

  const normalizedTiers = useMemo(() => {
    return normalizePricingTiersToV2(event?.tiered_pricing);
  }, [event]);

  const getPrice = () => {
    if (!event) return 0;
    if (normalizedTiers.length > 0) {
      const tier = normalizedTiers[formData.category_index];
      return tier ? tier.price : 0;
    }
    return typeof event.price === "number" ? event.price : 0;
  };

  async function handleFreeRegistration(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const tier = normalizedTiers.length > 0 ? normalizedTiers[formData.category_index] : null;
      const selectedCategory = tier?.name || "Participante";

      const { error: dbError } = await supabase.from("registrations").insert([{
        event_id: id,
        full_name: formData.full_name,
        email: formData.email,
        document_number: formData.document,
        phone: formData.phone,
        amount: 0,
        modality: MODALITY_SENTINEL,
        category: selectedCategory,
        status: "confirmed"
      }]);

      if (dbError) throw dbError;

      alert(`Inscripción exitosa como ${selectedCategory} (Evento gratuito).`);
      setIsSubmitting(false);
      router.push("/simposios");
    } catch (error: unknown) {
      console.error("Error en registro gratuito:", error);
      const errorMessage = error instanceof Error ? error.message : "Error al procesar la inscripción";
      alert("Ocurrió un error al procesar la inscripción: " + errorMessage);
      setIsSubmitting(false);
    }
  }

  if (loading) return <div className="flex justify-center py-40"><Loader2 className="animate-spin w-10 h-10 text-primary" /></div>;
  if (!event) return <div className="py-40 text-center">Evento no encontrado.</div>;

  const currentPrice = getPrice();

  return (
    <main className="pt-24 min-h-screen bg-slate-50 pb-20">
      <div className="container mx-auto px-4 max-w-6xl">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors mb-8 font-bold">
          <ChevronLeft className="w-5 h-5" />
          Volver
        </button>

        {currentPrice > 0 ? (
          /* Render de Pasarela Abierta (Openpay / Bre-B) para Eventos Pagos */
          <PaymentSelectionForm
            eventId={Array.isArray(id) ? id[0] : (id as string)}
            eventTitle={event.title}
            eventPrice={currentPrice}
            eventDate={
              event.date
                ? new Date(event.date).toLocaleDateString("es-ES", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : undefined
            }
            eventLocation={event.location}
            eventTiers={event.tiered_pricing?.tiers}
          />
        ) : (
          /* Formulario de Inscripción Directa para Eventos Gratuitos */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Resumen del Evento */}
            <div className="lg:col-span-4 space-y-8">
              <div className="bg-white rounded-[3rem] overflow-hidden border border-slate-100 shadow-sm p-8 space-y-8">
                <div className="aspect-square rounded-[2.5rem] overflow-hidden bg-slate-100">
                  <img src={event.image_url || "/img/banner.png"} alt={event.title} className="w-full h-full object-cover" />
                </div>

                <div className="space-y-4">
                  <span className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest rounded-full">
                    {event.category || "Simposio Gratuito"}
                  </span>
                  <h1 className="text-3xl font-bold text-slate-900 leading-tight font-heading">{event.title}</h1>
                  <div className="space-y-3 text-slate-500">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-primary" />
                      <span>{event.date ? new Date(event.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : "Fecha por confirmar"}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin className="w-5 h-5 text-primary" />
                      <span>{event.location}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t space-y-4">
                   <div className="text-sm font-bold text-slate-900 uppercase tracking-widest">Resumen de Inscripción</div>
                   <div className="flex justify-between items-center text-slate-600">
                      <span className="font-bold text-slate-900">{normalizedTiers?.[formData.category_index]?.name || "Participante"}</span>
                      <span className="font-bold text-emerald-600">GRATUITO</span>
                   </div>
                </div>
              </div>
            </div>

            {/* Formulario Gratuito */}
            <div className="lg:col-span-8">
              <div className="bg-white rounded-[4rem] p-10 md:p-16 border border-slate-100 shadow-xl space-y-12">
                <div className="space-y-4">
                  <h2 className="text-4xl font-bold text-slate-900 font-heading">Inscripción Gratuita</h2>
                  <p className="text-slate-500">Complete sus datos para asegurar su cupo sin costo.</p>
                </div>

                <form onSubmit={handleFreeRegistration} className="space-y-10">
                  {normalizedTiers.length > 0 && (
                    <div className="space-y-4">
                      <Label className="text-sm font-bold uppercase tracking-widest text-slate-400">Tipo de Inscripción</Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                         {normalizedTiers.map((cat, idx: number) => (
                           <button
                             key={idx}
                             type="button"
                             onClick={() => setFormData({...formData, category_index: idx})}
                             className={cn(
                               "p-4 rounded-2xl border-2 transition-all font-bold text-sm text-left flex justify-between items-center h-16",
                               formData.category_index === idx
                                 ? "border-primary bg-primary/5 text-primary shadow-sm"
                                 : "border-slate-100 hover:border-slate-200 text-slate-600"
                             )}
                           >
                             <span>{cat.name}</span>
                             <span className="text-emerald-600 font-extrabold">{formatCOP(cat.price)}</span>
                           </button>
                         ))}
                      </div>
                    </div>
                  )}

                  {/* Datos Personales */}
                  <div className="space-y-6 pt-6 border-t">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="ml-1 text-slate-600">Nombre Completo</Label>
                        <Input
                          required
                          value={formData.full_name}
                          onChange={e => setFormData({...formData, full_name: e.target.value})}
                          placeholder="Nombre y Apellidos"
                          className="h-12 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="ml-1 text-slate-600">Correo Electrónico</Label>
                        <Input
                          required
                          type="email"
                          value={formData.email}
                          onChange={e => setFormData({...formData, email: e.target.value})}
                          placeholder="ejemplo@correo.com"
                          className="h-12 rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="ml-1 text-slate-600">Número de Documento</Label>
                        <Input
                          required
                          value={formData.document}
                          onChange={e => setFormData({...formData, document: e.target.value})}
                          placeholder="Cédula o Pasaporte"
                          className="h-12 rounded-xl"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="ml-1 text-slate-600">Teléfono / WhatsApp</Label>
                        <Input
                          required
                          type="tel"
                          value={formData.phone}
                          onChange={e => setFormData({...formData, phone: e.target.value})}
                          placeholder="300 000 0000"
                          className="h-12 rounded-xl"
                        />
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-lg shadow-xl shadow-primary/20 transition-all active:scale-[0.99]"
                  >
                    {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : "Confirmar Inscripción Gratuita"}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
