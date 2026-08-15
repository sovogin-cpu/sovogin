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

interface EventTier {
  name: string;
  presencial?: number;
  virtual?: number;
}

interface SimposioEvent {
  id: string;
  title: string;
  date?: string;
  location?: string;
  category?: string;
  price?: number;
  image_url?: string;
  tiered_pricing?: {
    tiers?: EventTier[];
  };
}

export default function RegistrationPage() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [event, setEvent] = useState<SimposioEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State para Evento Gratuito
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    document: "",
    phone: "",
    modality: "presencial", // presencial | virtual
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

  const getPrice = () => {
    if (!event) return 0;
    // Si el evento posee tiered_pricing
    if (event.tiered_pricing?.tiers && Array.isArray(event.tiered_pricing.tiers)) {
      const tier = event.tiered_pricing.tiers[formData.category_index];
      if (tier) {
        return formData.modality === "presencial" ? (tier.presencial || 0) : (tier.virtual || 0);
      }
    }
    // Si el evento utiliza la propiedad price directa
    return typeof event.price === "number" ? event.price : 0;
  };

  // Procesamiento exclusivo para eventos gratuitos (price === 0)
  async function handleFreeRegistration(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const tiers = event?.tiered_pricing?.tiers;
      const tier = Array.isArray(tiers) ? tiers[formData.category_index] : null;

      const { error: dbError } = await supabase.from("registrations").insert([{
        event_id: id,
        full_name: formData.full_name,
        email: formData.email,
        document_number: formData.document,
        phone: formData.phone,
        amount: 0,
        modality: formData.modality,
        category: tier?.name || "Participante",
        status: "confirmed"
      }]);

      if (dbError) throw dbError;

      alert(`Inscripción exitosa como ${tier?.name || "Participante"} (Evento gratuito).`);
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
                      <span className="capitalize">{formData.modality} - {event.tiered_pricing?.tiers?.[formData.category_index]?.name || "Participante"}</span>
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
                  {/* Modalidad */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-4">
                      <Label className="text-sm font-bold uppercase tracking-widest text-slate-400">Modalidad de Asistencia</Label>
                      <div className="grid grid-cols-2 gap-3">
                         {[
                           { id: "presencial", label: "Presencial", icon: Building2 },
                           { id: "virtual", label: "Virtual", icon: Video }
                         ].map((mod) => (
                           <button
                             key={mod.id}
                             type="button"
                             onClick={() => setFormData({...formData, modality: mod.id})}
                             className={cn(
                               "flex flex-col items-center justify-center p-6 rounded-3xl border-2 transition-all gap-2",
                               formData.modality === mod.id 
                                 ? "border-primary bg-primary/5 text-primary shadow-lg shadow-primary/10" 
                                 : "border-slate-100 hover:border-slate-200 text-slate-500"
                             )}
                           >
                             <mod.icon className="w-6 h-6" />
                             <span className="font-bold text-sm">{mod.label}</span>
                           </button>
                         ))}
                      </div>
                    </div>

                    {event.tiered_pricing?.tiers && (
                      <div className="space-y-4">
                        <Label className="text-sm font-bold uppercase tracking-widest text-slate-400">Tipo de Participante</Label>
                        <div className="grid grid-cols-2 gap-3">
                           {event.tiered_pricing.tiers.map((cat: EventTier, idx: number) => (
                             <button
                               key={idx}
                               type="button"
                               onClick={() => setFormData({...formData, category_index: idx})}
                               className={cn(
                                 "p-4 rounded-2xl border-2 transition-all font-bold text-xs text-center h-16 flex items-center justify-center",
                                 formData.category_index === idx 
                                   ? "border-primary bg-primary/5 text-primary shadow-sm" 
                                   : "border-slate-100 hover:border-slate-200 text-slate-500"
                               )}
                             >
                               {cat.name}
                             </button>
                           ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Datos Personales */}
                  <div className="space-y-6 pt-10 border-t">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="ml-1 text-slate-600">Nombre Completo</Label>
                        <div className="relative">
                          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                          <Input required value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} placeholder="Ej: Dr. Juan Pérez" className="h-14 pl-12 rounded-2xl border-slate-100 bg-slate-50 focus:bg-white" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="ml-1 text-slate-600">Número de Identificación</Label>
                        <div className="relative">
                          <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                          <Input required value={formData.document} onChange={e => setFormData({...formData, document: e.target.value})} placeholder="C.C. o T.P." className="h-14 pl-12 rounded-2xl border-slate-100 bg-slate-50 focus:bg-white" />
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="ml-1 text-slate-600">Correo Electrónico</Label>
                        <div className="relative">
                          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                          <Input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="correo@ejemplo.com" className="h-14 pl-12 rounded-2xl border-slate-100 bg-slate-50 focus:bg-white" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="ml-1 text-slate-600">Celular</Label>
                        <div className="relative">
                          <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                          <Input required value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+57 300 000 0000" className="h-14 pl-12 rounded-2xl border-slate-100 bg-slate-50 focus:bg-white" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Botón Confirmar */}
                  <div className="pt-10 border-t flex flex-col md:flex-row items-center justify-between gap-8">
                     <div className="space-y-1">
                        <div className="text-slate-400 text-sm font-bold uppercase tracking-widest">Costo del Evento</div>
                        <div className="text-4xl font-bold text-emerald-600 font-heading">
                          GRATIS
                        </div>
                     </div>

                     <Button 
                      type="submit" 
                      disabled={isSubmitting}
                      className="w-full md:w-auto h-20 px-12 bg-primary hover:bg-primary/90 text-white rounded-[2rem] font-bold text-xl shadow-2xl shadow-primary/30 gap-4"
                     >
                       {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : "Completar Inscripción Gratuita"}
                     </Button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
