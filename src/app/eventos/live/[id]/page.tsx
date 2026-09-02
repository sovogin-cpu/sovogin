"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import {
  Lock,
  Play,
  MessageSquare,
  AlertCircle,
  Loader2,
  User,
  Key,
  ChevronRight
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OpenpayRegistrationForm } from "@/components/payments/OpenpayRegistrationForm";
import { cn } from "@/lib/utils";
import { buildYouTubeEmbedUrl } from "@/lib/video/youtube-helper";
import { isUserAuthorizedForLiveStream } from "@/lib/video/live-authorization";

interface EventLive {
  id: string;
  title: string;
  youtube_video_id: string;
  youtube_chat_id?: string | null;
  banner_url?: string | null;
  is_active?: boolean;
  price?: number | null;
  event_id?: string;
  date?: string | null;
  location?: string | null;
}

interface EventData {
  id: string;
  title: string;
  price?: number | null;
  date?: string | null;
  location?: string | null;
}

interface CombinedEvent extends EventLive {
  price?: number | null;
  event_id?: string;
  date?: string | null;
  location?: string | null;
}

interface LoginCredentials {
  email: string;
  document: string;
}

export default function LiveEventPage() {
  const { id } = useParams();
  const eventIdStr = Array.isArray(id) ? id[0] : id;
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<CombinedEvent | null>(null);
  const [accessGranted, setAccessGranted] = useState(false);
  const [accessResolved, setAccessResolved] = useState(false);
  const [error, setError] = useState("");

  // Login Form
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: "",
    document: ""
  });
  const [isVerifying, setIsVerifying] = useState(false);

  const fetchEvent = useCallback(async () => {
    if (!eventIdStr) return;
    let combinedEvent: CombinedEvent | null = null;

    try {
      // 1. Check in event_lives
      const { data: liveData } = await supabase
        .from('event_lives')
        .select('*')
        .eq('id', eventIdStr)
        .single();

      if (liveData) {
        const live = liveData as EventLive;
        combinedEvent = live;
        // Check if corresponding entry exists in events table for pricing info
        const { data: eventData } = await supabase
          .from('events')
          .select('*')
          .eq('id', eventIdStr)
          .single();

        if (eventData) {
          const ev = eventData as EventData;
          combinedEvent = {
            ...live,
            price: ev.price ?? live.price ?? 0,
            event_id: ev.id,
            date: ev.date ?? live.date,
            location: ev.location ?? live.location
          };
        }
      } else {
        // 2. Fallback check directly in events table
        const { data: eventData } = await supabase
          .from('events')
          .select('*')
          .eq('id', eventIdStr)
          .single();

        if (eventData) {
          combinedEvent = eventData as CombinedEvent;
        }
      }

      if (combinedEvent) {
        setEvent(combinedEvent);
      }
    } catch (error: unknown) {
      console.error("Error fetching event:", error instanceof Error ? error.message : error);
    } finally {
      setLoading(false);
    }
  }, [eventIdStr, supabase]);

  useEffect(() => {
    let isMounted = true;

    async function initializePage() {
      await fetchEvent();
      if (typeof window !== "undefined" && eventIdStr) {
        const savedAccess = sessionStorage.getItem(`live_access_${eventIdStr}`);
        if (savedAccess === "granted" && isMounted) {
          setAccessGranted(true);
        }
      }
      if (isMounted) {
        setAccessResolved(true);
      }
    }

    void initializePage();

    return () => {
      isMounted = false;
    };
  }, [eventIdStr, fetchEvent]);

  function grantAccess() {
    setAccessGranted(true);
    if (typeof window !== "undefined" && eventIdStr) {
      sessionStorage.setItem(`live_access_${eventIdStr}`, "granted");
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsVerifying(true);
    setError("");

    try {
      let guest = null;
      let registration = null;

      // 1. Check in event_attendees (Guests specific to this event)
      const { data: guestData } = await supabase
        .from('event_attendees')
        .select('*')
        .eq('event_live_id', eventIdStr)
        .eq('email', credentials.email.toLowerCase())
        .eq('document_number', credentials.document.trim())
        .single();
      guest = guestData;

      // 2. Check in registrations for THIS event
      if (eventIdStr) {
        const { data: regData } = await supabase
          .from('registrations')
          .select('*')
          .eq('event_id', eventIdStr)
          .eq('email', credentials.email.toLowerCase())
          .eq('document_number', credentials.document.trim())
          .single();
        registration = regData;
      }

      const isAuthorized = isUserAuthorizedForLiveStream({
        targetEventId: eventIdStr || "",
        userEmail: credentials.email,
        userDocumentNumber: credentials.document,
        registration,
        guestAttendee: guest,
      });

      if (isAuthorized) {
        grantAccess();
        return;
      }

      setError("Acceso denegado. Verifica tus datos o contacta al administrador.");
    } catch (error: unknown) {
      console.error("Error verifying access:", error instanceof Error ? error.message : error);
      setError("Ocurrió un error al verificar el acceso.");
    } finally {
      setIsVerifying(false);
    }
  }

  if (loading || !accessResolved) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white space-y-4">
        <AlertCircle className="w-16 h-16 text-red-500" />
        <h1 className="text-2xl font-bold">Evento no encontrado</h1>
        <Button variant="outline" onClick={() => window.location.href = "/"}>Volver al Inicio</Button>
      </div>
    );
  }

  const isPaidEvent = Boolean(event.price && Number(event.price) > 0);

  if (!accessGranted) {
    return (
      <div className="min-h-screen bg-slate-950 relative overflow-hidden flex items-center justify-center px-4 py-16">
        {/* Background blobs */}
        <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/30 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]" />
        </div>

        <div className={cn(
          "w-full relative z-10 mx-auto space-y-8",
          isPaidEvent ? "max-w-5xl" : "max-w-md"
        )}>
          <div className={cn(
            "grid gap-8 items-start",
            isPaidEvent ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"
          )}>
            {/* Login Card */}
            <div className="bg-white/5 backdrop-blur-2xl p-8 md:p-10 rounded-[2.5rem] border border-white/10 shadow-2xl space-y-8">
              <div className="text-center space-y-2">
                <div className="w-20 h-20 bg-primary/20 rounded-3xl flex items-center justify-center mx-auto mb-6 ring-4 ring-primary/10">
                  <Lock className="w-10 h-10 text-primary" />
                </div>
                <h1 className="text-3xl font-bold text-white font-heading tracking-tight">Acceso Privado</h1>
                <p className="text-slate-400 text-sm">{event.title}</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Email Registrado</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <Input
                      required
                      type="email"
                      value={credentials.email}
                      onChange={e => setCredentials({...credentials, email: e.target.value})}
                      placeholder="ejemplo@correo.com"
                      className="h-14 pl-12 rounded-2xl bg-white/5 border-white/10 text-white focus:bg-white/10 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Número de Documento</label>
                  <div className="relative">
                    <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <Input
                      required
                      type="password"
                      value={credentials.document}
                      onChange={e => setCredentials({...credentials, document: e.target.value})}
                      placeholder="Tu identificación"
                      className="h-14 pl-12 rounded-2xl bg-white/5 border-white/10 text-white focus:bg-white/10 transition-all"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-400 bg-red-400/10 p-4 rounded-xl text-sm border border-red-400/20">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={isVerifying}
                  className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-lg shadow-xl shadow-primary/20 gap-2 mt-4 transition-all active:scale-[0.98]"
                >
                  {isVerifying ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                    <>
                      Ingresar al Evento
                      <ChevronRight className="w-5 h-5" />
                    </>
                  )}
                </Button>
              </form>

              <p className="text-center text-slate-500 text-xs pt-4">
                Si eres asociado activo o ya compraste tu entrada, ingresa tus datos para acceder.
              </p>
            </div>

            {/* Openpay Payment Form (Only if event.price > 0) */}
            {isPaidEvent && (
              <OpenpayRegistrationForm
                eventId={event.event_id || event.id || String(eventIdStr)}
                eventTitle={event.title}
                eventPrice={Number(event.price)}
                eventDate={event.date ? new Date(event.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : undefined}
                eventLocation={event.location ?? undefined}
              />
            )}
          </div>

          <p className="text-center text-slate-500 text-xs px-4">
            Si tienes dudas con tu inscripción o tu pago, por favor contacta a soporte técnico.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white">
      {/* Header Bar */}
      <div className="bg-white/5 backdrop-blur-md border-b border-white/5 py-4 px-6 sticky top-0 z-50">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
              <Play className="w-5 h-5 text-primary fill-current" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none">{event.title}</h1>
              <span className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider flex items-center gap-1 mt-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                En Vivo
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (typeof window !== "undefined" && eventIdStr) {
                sessionStorage.removeItem(`live_access_${eventIdStr}`);
              }
              setAccessGranted(false);
            }}
            className="text-slate-400 hover:text-white"
          >
            Salir
          </Button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-180px)]">

          {/* Video Player (Main) */}
          <div className="lg:col-span-3 flex flex-col gap-4">
            <div className="flex-1 bg-black rounded-3xl overflow-hidden shadow-2xl relative border border-white/5 group">
              {buildYouTubeEmbedUrl(event.youtube_video_id) ? (
                <iframe
                  src={buildYouTubeEmbedUrl(event.youtube_video_id)!}
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-slate-400 font-bold text-sm">
                  Enlace de transmisión no disponible o no válido.
                </div>
              )}
            </div>
          </div>

          {/* Chat / Info Area */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            {/* Chat Embed */}
            {event.youtube_chat_id ? (
              <div className="flex-1 bg-white rounded-3xl overflow-hidden shadow-2xl border border-slate-200">
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-primary" />
                  <span className="font-bold text-slate-900">Chat del Evento</span>
                </div>
                <iframe
                  src={`https://www.youtube.com/live_chat?v=${event.youtube_chat_id}&embed_domain=${typeof window !== 'undefined' ? window.location.hostname : ''}`}
                  className="w-full h-[calc(100%-56px)]"
                />
              </div>
            ) : (
              <div className="flex-1 bg-white/5 rounded-3xl p-8 flex flex-col items-center justify-center text-center space-y-4 border border-white/5">
                <MessageSquare className="w-12 h-12 text-slate-600" />
                <p className="text-slate-500 text-sm">El chat no está habilitado para esta sesión.</p>
              </div>
            )}

            {/* Event Info Card */}
            <div className="bg-primary/10 rounded-3xl p-6 border border-primary/20">
              <h4 className="font-bold text-primary mb-2">Acerca del evento</h4>
              <p className="text-xs text-primary/80 leading-relaxed">
                Bienvenido a la transmisión oficial de SOVOGIN. Para una mejor experiencia, asegúrese de tener una conexión estable a internet.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
