"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  Calendar, 
  MapPin, 
  Users, 
  Clock, 
  FileText, 
  UserCircle2, 
  Video, 
  ChevronLeft,
  Share2,
  Building2,
  CheckCircle2,
  ArrowRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { MemberVerificationModal } from "@/components/MemberVerificationModal";

export default function EventDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createClient();
  const [event, setEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    async function fetchEvent() {
      const { data } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .single();
      if (data) setEvent(data);
      setLoading(false);
    }
    fetchEvent();
  }, [id]);

  const handleLiveAccess = (e: React.MouseEvent) => {
    e.preventDefault();
    const isVerified = sessionStorage.getItem("member_access") === "granted";
    
    if (isVerified) {
      window.open(event.live_url, "_blank");
    } else {
      setIsVerifying(true);
    }
  };

  const onVerified = () => {
    setIsVerifying(false);
    window.open(event.live_url, "_blank");
  };

  if (loading) return <div className="py-40 text-center"><div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto" /></div>;
  if (!event) return <div className="py-40 text-center text-slate-500 font-bold">Evento no encontrado.</div>;

  return (
    <main className="pt-24 min-h-screen bg-white pb-20">
      <MemberVerificationModal 
        isOpen={isVerifying}
        onClose={() => setIsVerifying(false)}
        onVerified={onVerified}
        targetUrl={event.live_url || ""}
        eventId={event.id}
      />
      {/* Hero Section */}
      <div className="relative h-[400px] md:h-[500px] w-full overflow-hidden bg-slate-900">
        <img src={event.image_url || "/img/banner.png"} alt={event.title} className="w-full h-full object-cover opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
        
        <div className="container mx-auto px-4 relative h-full flex flex-col justify-end pb-12">
           <button onClick={() => router.back()} className="absolute top-8 left-4 flex items-center gap-2 text-white/80 hover:text-white transition-colors font-bold">
              <ChevronLeft className="w-5 h-5" /> Volver a Simposios
           </button>

           <div className="max-w-4xl space-y-6">
              <span className="px-4 py-1.5 bg-primary text-white text-[10px] font-bold uppercase tracking-[0.2em] rounded-full">
                {event.category || "Simposio Científico"}
              </span>
              <h1 className="text-4xl md:text-6xl font-bold text-white font-heading leading-tight">{event.title}</h1>
              
              <div className="flex flex-wrap items-center gap-6 text-white/90">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                    <Calendar className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-white/50 tracking-widest">Fecha</div>
                    <div className="text-sm font-bold">{new Date(event.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-white/50 tracking-widest">Ubicación</div>
                    <div className="text-sm font-bold">{event.location}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase font-bold text-white/50 tracking-widest">Capacidad</div>
                    <div className="text-sm font-bold">{event.capacity || "Cupos Limitados"}</div>
                  </div>
                </div>
              </div>
           </div>
        </div>
      </div>

      <div className="container mx-auto px-4 mt-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          {/* Main Content Area */}
          <div className="lg:col-span-8">
            <Tabs defaultValue="info" className="space-y-8">
              <TabsList className="flex gap-4 bg-transparent border-b border-slate-100 p-0 h-auto">
                <TabsTrigger value="info" className="px-0 py-4 bg-transparent border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none font-bold text-lg">Información</TabsTrigger>
                <TabsTrigger value="programa" className="px-0 py-4 bg-transparent border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none font-bold text-lg">Programa</TabsTrigger>
                <TabsTrigger value="ponentes" className="px-0 py-4 bg-transparent border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary rounded-none font-bold text-lg">Moderadores y Ponentes</TabsTrigger>
              </TabsList>

              <TabsContent value="info" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                 <div className="prose prose-slate max-w-none">
                    <h3 className="text-2xl font-bold text-slate-900 mb-4">Sobre el Evento</h3>
                    <p className="text-slate-600 leading-relaxed text-lg whitespace-pre-wrap">{event.description || "No hay una descripción detallada disponible."}</p>
                 </div>
                 
                 {event.moderators && (
                    <div className="pt-8 border-t">
                       <h4 className="text-lg font-bold text-slate-900 mb-4">Moderadores</h4>
                       <p className="text-slate-600">{event.moderators}</p>
                    </div>
                 )}

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                    <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 flex items-start gap-4">
                       <CheckCircle2 className="w-6 h-6 text-primary shrink-0" />
                       <div>
                          <h4 className="font-bold text-slate-900">Respaldo Científico</h4>
                          <p className="text-sm text-slate-500 mt-1">Evento avalado por la junta directiva de SOVOGIN.</p>
                       </div>
                    </div>
                    <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 flex items-start gap-4">
                       <Video className="w-6 h-6 text-primary shrink-0" />
                       <div>
                          <h4 className="font-bold text-slate-900">Acceso Híbrido</h4>
                          <p className="text-sm text-slate-500 mt-1">Participación disponible de forma presencial y virtual.</p>
                       </div>
                    </div>
                 </div>
              </TabsContent>

              <TabsContent value="programa" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                 <div className="bg-slate-50 rounded-[3rem] p-8 md:p-12 border border-slate-100">
                    <h3 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-3">
                       <Clock className="w-6 h-6 text-primary" /> Programa Académico
                    </h3>
                    
                    {event.program_items && event.program_items.length > 0 ? (
                      <div className="space-y-6 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-primary/10">
                        {event.program_items.map((item: any, idx: number) => (
                          <div key={idx} className="relative pl-12 flex flex-col md:flex-row md:items-center gap-2 md:gap-8 group">
                             <div className="absolute left-[13px] top-2 w-2.5 h-2.5 rounded-full bg-primary shadow-lg shadow-primary/30 group-hover:scale-125 transition-transform" />
                             <div className="min-w-[100px] font-bold text-primary text-sm">{item.time}</div>
                             <div className="flex-1">
                                <h4 className="font-bold text-slate-900 text-lg leading-tight">{item.topic}</h4>
                               <div className="flex flex-col gap-3 mt-3">
                                   {item.speakers && item.speakers.length > 0 ? item.speakers.map((s: any, sIdx: number) => (
                                     <div key={sIdx} className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                           <UserCircle2 className="w-5 h-5 text-primary" />
                                        </div>
                                        <div className="flex flex-col">
                                           <span className="font-bold text-slate-900 text-sm">{s.name || s}</span>
                                           {s.description && (
                                              <span className="text-xs text-slate-500 leading-tight">{s.description}</span>
                                           )}
                                        </div>
                                     </div>
                                   )) : (
                                     <p className="text-slate-500 text-sm italic">Ponente por confirmar</p>
                                   )}
                                </div>
                             </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-slate-400">El programa detallado será publicado pronto.</div>
                    )}
                 </div>
              </TabsContent>

              <TabsContent value="ponentes" className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                 <div className="grid grid-cols-1 gap-6">
                    <div className="bg-white rounded-[3rem] p-8 md:p-12 border border-slate-100 shadow-sm">
                       <h3 className="text-2xl font-bold text-slate-900 mb-8 flex items-center gap-3">
                          <UserCircle2 className="w-6 h-6 text-primary" /> Expertos Invitados
                       </h3>
                       {event.speakers_info ? (
                         <p className="text-slate-600 whitespace-pre-wrap leading-relaxed">{event.speakers_info}</p>
                       ) : (
                         <div className="text-center py-20 text-slate-400">Información de ponentes en actualización.</div>
                       )}
                    </div>
                 </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Sidebar / CTA Area */}
          <div className="lg:col-span-4">
             <div className="sticky top-28 space-y-6">
                <div className="bg-white rounded-[3rem] p-8 border border-slate-100 shadow-2xl shadow-slate-200/50 space-y-8">
                   <div className="space-y-2">
                      <div className="text-slate-400 text-xs font-bold uppercase tracking-widest">Inscripción desde</div>
                      <div className="text-4xl font-bold text-slate-900">
                        {event.price ? `$${new Intl.NumberFormat('es-CO').format(event.price)}` : "Gratis"}
                        <span className="text-sm font-normal text-slate-400 ml-2">COP</span>
                      </div>
                   </div>

                   <div className="space-y-4">
                      <Link href={`/simposios/${event.id}/registro`} className="block">
                        <Button className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-lg shadow-lg shadow-primary/20 gap-2">
                          Inscribirse Ahora <ArrowRight className="w-5 h-5" />
                        </Button>
                      </Link>

                      {event.live_url && (
                        <Button 
                          onClick={handleLiveAccess}
                          variant="outline" 
                          className="w-full h-16 rounded-2xl border-primary text-primary hover:bg-primary/5 font-bold text-lg gap-2"
                        >
                          <Video className="w-5 h-5" /> Ingresar al Vivo
                        </Button>
                      )}
                   </div>

                   <div className="pt-8 border-t border-slate-50 space-y-4">
                      <div className="flex items-center gap-3 text-sm text-slate-500">
                         <Clock className="w-5 h-5 text-primary" />
                         <span>Soporte 24/7 disponible</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-500">
                         <Share2 className="w-5 h-5 text-primary" />
                         <span>Comparte con colegas</span>
                      </div>
                   </div>
                </div>

                <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
                   <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl rounded-full translate-x-1/2 -translate-y-1/2" />
                   <h4 className="text-lg font-bold relative z-10">¿Eres Asociado SOVOGIN?</h4>
                   <p className="text-white/60 text-sm mt-2 relative z-10">Recuerda que tienes tarifas preferenciales en todos nuestros eventos científicos.</p>
                   <Link href="/asociarse" className="inline-flex items-center gap-2 text-primary font-bold text-sm mt-6 hover:gap-3 transition-all relative z-10">
                      Saber más sobre beneficios <ArrowRight className="w-4 h-4" />
                   </Link>
                </div>
             </div>
          </div>
        </div>
      </div>
    </main>
  );
}
