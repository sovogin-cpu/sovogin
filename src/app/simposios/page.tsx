"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Calendar, MapPin, Users, Filter, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";
import { MemberVerificationModal } from "@/components/MemberVerificationModal";
import { EventHeaderCarousel } from "@/components/EventHeaderCarousel";

interface SimposioEvent {
  id: string;
  title: string;
  description?: string | null;
  date: string;
  location: string;
  image_url?: string | null;
  price?: number | null;
  capacity?: string | number | null;
  category?: string | null;
  live_url?: string | null;
  is_active?: boolean;
  created_at?: string;
}

export default function SimposiosPage() {
  const [events, setEvents] = useState<SimposioEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [targetEvent, setTargetEvent] = useState<{id: string, url: string} | null>(null);
  const supabase = useMemo(() => createClient(), []);

  useEffect(() => {
    let isMounted = true;

    async function fetchEvents() {
      const { data } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true });

      if (isMounted) {
        if (data) setEvents(data as SimposioEvent[]);
        setLoading(false);
      }
    }

    void fetchEvents();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  const handleLiveAccess = (e: React.MouseEvent, eventId: string, url?: string | null) => {
    if (!url) return;
    e.preventDefault();
    // Check if already verified in this session
    const isVerified = sessionStorage.getItem("member_access") === "granted";
    
    if (isVerified) {
      window.open(url, "_blank");
    } else {
      setTargetEvent({ id: eventId, url });
      setIsVerifying(true);
    }
  };

  const onVerified = (url: string) => {
    setIsVerifying(false);
    window.open(url, "_blank");
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-24">
      <MemberVerificationModal 
        isOpen={isVerifying}
        onClose={() => setIsVerifying(false)}
        onVerified={onVerified}
        targetUrl={targetEvent?.url || ""}
        eventId={targetEvent?.id}
      />

      <div className="border-b border-slate-100 bg-white py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[0.8fr_1.2fr] xl:gap-14">
            <div className="space-y-5">
              <h1 className="text-4xl font-bold tracking-tight text-slate-900 md:text-6xl">
                Eventos
              </h1>

              <p className="max-w-xl text-lg leading-relaxed text-slate-600 md:text-xl">
                Manténgase a la vanguardia de la especialidad con nuestra programación académica de alto nivel.
              </p>
            </div>

            <EventHeaderCarousel />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="flex flex-wrap items-center gap-4 mb-12 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-xl border border-slate-100 text-sm font-medium">
            <Filter className="w-4 h-4" />
            <span>Filtrar por:</span>
          </div>
          <Button variant="ghost" className="rounded-xl">Todos</Button>
          <Button variant="ghost" className="rounded-xl">Próximos</Button>
          <Button variant="ghost" className="rounded-xl">Anteriores</Button>
          <Button variant="ghost" className="rounded-xl">Virtuales</Button>
        </div>

        <div className="grid grid-cols-1 gap-10">
          {loading ? (
             <div className="py-20 text-center"><div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto" /></div>
          ) : events && events.length > 0 ? (
            events.map((event) => (
              <div key={event.id} className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all border border-slate-100 flex flex-col lg:flex-row">
                <div className="lg:w-1/3 aspect-video lg:aspect-auto bg-slate-200 relative">
                  <img 
                    src={event.image_url || "/img/banner.png"} 
                    alt={event.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  />
                  <div className="absolute top-4 left-4 z-20">
                    <span className="px-3 py-1 bg-white/90 backdrop-blur-sm text-primary text-xs font-bold rounded-full uppercase tracking-wider">
                      {event.category || "Académico"}
                    </span>
                  </div>
                </div>
                
                <div className="p-8 lg:p-12 flex-1 flex flex-col justify-between space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-6 text-sm text-slate-500 font-medium">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary" />
                        {new Date(event.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        {event.location}
                      </div>
                    </div>
                    
                    <h2 className="text-3xl font-bold text-slate-900 group-hover:text-primary transition-colors">
                      {event.title}
                    </h2>
                    
                    <div className="flex flex-wrap gap-4 pt-2">
                      <div className="flex items-center gap-2 text-sm bg-slate-50 px-3 py-1 rounded-full text-slate-600">
                        <Users className="w-4 h-4" />
                        <span>Capacidad: {event.capacity || "Limitada"}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm bg-slate-50 px-3 py-1 rounded-full text-slate-600">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>Inscripciones Abiertas</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-50 flex flex-col sm:flex-row items-center justify-between gap-6">
                    <div>
                      <div className="text-sm text-slate-400">Inversión desde:</div>
                      <div className="text-2xl font-bold text-slate-900">
                        {event.price ? `$${new Intl.NumberFormat('es-CO').format(event.price)} COP` : "Gratis"}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 w-full sm:w-auto">
                      <Link href={`/simposios/${event.id}`} className="flex-1 sm:flex-none">
                        <Button variant="outline" size="lg" className="w-full px-8 rounded-xl">Más Información</Button>
                      </Link>
                      
                      {event.live_url && (
                        <Button 
                          onClick={(e) => handleLiveAccess(e, event.id, event.live_url)}
                          variant="secondary" 
                          size="lg" 
                          className="flex-1 sm:flex-none px-8 rounded-xl bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 gap-2"
                        >
                          <ImageIcon className="w-4 h-4" /> Ingresar al Evento
                        </Button>
                      )}

                      <Link href={`/simposios/${event.id}/registro`} className="flex-1 sm:flex-none">
                        <Button size="lg" className="w-full px-8 bg-primary hover:bg-primary/90 rounded-xl shadow-lg shadow-primary/20">
                          Inscribirse
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-20 text-center text-slate-500 bg-white rounded-3xl border border-slate-100">
              No hay eventos disponibles en este momento.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
