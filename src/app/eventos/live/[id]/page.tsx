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
  ChevronRight,
  ExternalLink,
  Video,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OpenpayRegistrationForm } from "@/components/payments/OpenpayRegistrationForm";
import { cn } from "@/lib/utils";
import {
  extractYouTubeVideoId,
  buildYouTubeEmbedUrl,
  buildYouTubeLiveChatUrl,
  parseTransmissionConfig,
  validateExternalTransmissionUrl,
  TransmissionConfig,
} from "@/lib/video/youtube-helper";
import { isUserAuthorizedForLiveStream } from "@/lib/video/live-authorization";

interface EventLive {
  id: string;
  title: string;
  youtube_video_id?: string | null;
  youtube_chat_id?: string | null;
  live_url?: string | null;
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
  live_url?: string | null;
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
    document: "",
  });
  const [isVerifying, setIsVerifying] = useState(false);

  const fetchEvent = useCallback(async () => {
    if (!eventIdStr) return;
    let combinedEvent: CombinedEvent | null = null;

    try {
      // 1. Check in event_lives
      const { data: liveData } = await supabase
        .from("event_lives")
        .select("*")
        .eq("id", eventIdStr)
        .single();

      if (liveData) {
        const live = liveData as EventLive;
        combinedEvent = live;
        // Check if corresponding entry exists in events table for pricing info
        const { data: eventData } = await supabase
          .from("events")
          .select("*")
          .eq("id", eventIdStr)
          .single();

        if (eventData) {
          const ev = eventData as EventData;
          combinedEvent = {
            ...live,
            live_url: ev.live_url || live.live_url,
            price: ev.price ?? live.price ?? 0,
            event_id: ev.id,
            date: ev.date ?? live.date,
            location: ev.location ?? live.location,
          };
        }
      } else {
        // 2. Fallback check directly in events table
        const { data: eventData } = await supabase
          .from("events")
          .select("*")
          .eq("id", eventIdStr)
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
        .from("event_attendees")
        .select("*")
        .eq("event_live_id", eventIdStr)
        .eq("email", credentials.email.toLowerCase())
        .eq("document_number", credentials.document.trim())
        .single();
      guest = guestData;

      // 2. Check in registrations for THIS event
      if (eventIdStr) {
        const { data: regData } = await supabase
          .from("registrations")
          .select("*")
          .eq("event_id", eventIdStr)
          .eq("email", credentials.email.toLowerCase())
          .eq("document_number", credentials.document.trim())
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

  const transmission: TransmissionConfig = useMemo(() => {
    if (!event) return { provider: "youtube", url: "", showLiveChat: false };
    const rawUrl = event.live_url || event.youtube_video_id || "";
    const parsed = parseTransmissionConfig(rawUrl);
    // Explicit legacy fallback check for youtube_chat_id
    if (parsed.provider === "youtube" && event.youtube_chat_id) {
      parsed.showLiveChat = true;
    }
    return parsed;
  }, [event]);

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
        <Button variant="outline" onClick={() => (window.location.href = "/")}>
          Volver al Inicio
        </Button>
      </div>
    );
  }

  const isPaidEvent = Boolean(event.price && Number(event.price) > 0);

  if (!accessGranted) {
    return (
      <div className="min-h-screen bg-slate-950 relative overflow-hidden flex items-center justify-center px-4 py-16">
        <div className="absolute top-0 left-0 w-full h-full opacity-20 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/30 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px]" />
        </div>

        <div className={cn("w-full relative z-10 mx-auto space-y-8", isPaidEvent ? "max-w-5xl" : "max-w-md")}>
          <div className={cn("grid gap-8 items-start", isPaidEvent ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1")}>
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
                      onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
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
                      onChange={(e) => setCredentials({ ...credentials, document: e.target.value })}
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
                  {isVerifying ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
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

            {isPaidEvent && (
              <OpenpayRegistrationForm
                eventId={event.event_id || event.id || String(eventIdStr)}
                eventTitle={event.title}
                eventPrice={Number(event.price)}
                eventDate={
                  event.date
                    ? new Date(event.date).toLocaleDateString("es-ES", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : undefined
                }
                eventLocation={event.location ?? undefined}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- AUTHORIZED ATTENDEE PLAYBACK AREA ---
  const videoId = extractYouTubeVideoId(transmission.url || event.youtube_video_id);
  const embedUrl = buildYouTubeEmbedUrl(videoId);
  const currentHost = typeof window !== "undefined" ? window.location.hostname : "sovogin.com";
  const chatUrl =
    transmission.showLiveChat || event.youtube_chat_id
      ? buildYouTubeLiveChatUrl(videoId || event.youtube_chat_id, currentHost)
      : null;

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
                Transmisión Oficial
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
        {transmission.provider === "youtube" ? (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 min-h-[calc(100vh-180px)]">
            {/* YouTube Player */}
            <div className={cn("flex flex-col gap-4", chatUrl ? "lg:col-span-3" : "lg:col-span-4")}>
              <div className="relative w-full aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10">
                {embedUrl ? (
                  <iframe
                    src={embedUrl}
                    className="absolute inset-0 w-full h-full border-0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    title={event.title}
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-slate-400 font-bold text-sm p-6 text-center">
                    Enlace de transmisión de YouTube no disponible o no válido.
                  </div>
                )}
              </div>
            </div>

            {/* Live Chat (Side-by-side on desktop ~30%, below on mobile) */}
            {chatUrl && (
              <div className="lg:col-span-1 flex flex-col gap-4">
                <div className="flex-1 bg-white/5 rounded-3xl overflow-hidden border border-white/10 min-h-[450px]">
                  <div className="bg-white/10 px-5 py-3 border-b border-white/10 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-primary" />
                    <span className="font-bold text-sm text-white">Chat en Vivo</span>
                  </div>
                  <iframe
                    src={chatUrl}
                    className="w-full h-[calc(100%-48px)] min-h-[400px] border-0"
                    title="YouTube Live Chat"
                  />
                </div>
              </div>
            )}
          </div>
        ) : (
          /* External Provider Access Card (Zoom, Meet, Teams, External) */
          <div className="max-w-2xl mx-auto py-16 px-6">
            <div className="bg-white/5 backdrop-blur-2xl p-10 rounded-[2.5rem] border border-white/10 shadow-2xl text-center space-y-8">
              <div className="w-20 h-20 bg-primary/20 rounded-3xl flex items-center justify-center mx-auto ring-4 ring-primary/10">
                <Video className="w-10 h-10 text-primary" />
              </div>

              <div className="space-y-2">
                <h2 className="text-3xl font-bold text-white font-heading">
                  {transmission.provider === "zoom" && "Transmisión por Zoom"}
                  {transmission.provider === "google_meet" && "Transmisión por Google Meet"}
                  {transmission.provider === "microsoft_teams" && "Transmisión por Microsoft Teams"}
                  {transmission.provider === "external" && "Transmisión en Vivo Externa"}
                </h2>
                <p className="text-slate-400 text-sm">
                  Su acceso a esta transmisión ha sido verificado. Haga clic a continuación para ingresar a la sala oficial.
                </p>
              </div>

              {(() => {
                const validation = validateExternalTransmissionUrl(transmission.url);
                if (!validation.isValid || !validation.url) {
                  return (
                    <div className="bg-red-400/10 border border-red-400/20 text-red-400 p-4 rounded-2xl text-sm font-medium">
                      {validation.error || "Enlace de transmisión no seguro o no válido."}
                    </div>
                  );
                }

                let buttonLabel = "Ingresar al Evento";
                if (transmission.provider === "zoom") buttonLabel = "Ingresar a Zoom";
                if (transmission.provider === "google_meet") buttonLabel = "Ingresar a Google Meet";
                if (transmission.provider === "microsoft_teams") buttonLabel = "Ingresar a Teams";

                return (
                  <a
                    href={validation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-lg shadow-xl shadow-primary/20 gap-3 transition-all active:scale-[0.98]"
                  >
                    {buttonLabel}
                    <ExternalLink className="w-5 h-5" />
                  </a>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
