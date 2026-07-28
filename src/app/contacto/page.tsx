import React from "react";
import { Mail, Phone, MapPin, Send, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/utils/supabase/server";

export default async function ContactoPage() {
  const supabase = await createClient();
  const { data } = await supabase.from('site_settings').select('data').eq('id', 'general').single();
  const settings = data?.data || {
    email: "info@sovogin.org",
    phone: "+57 (601) 123 4567",
    whatsapp: "+57 300 123 4567",
    address: "Calle 100 #15-32, Bogotá"
  };

  return (
    <div className="bg-slate-50 min-h-screen pb-24">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 py-20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-primary/5 blur-3xl rounded-l-full" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold text-slate-900 tracking-tight">
              Contacto
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl leading-relaxed">
              Estamos aquí para escucharte. Ponte en contacto con nosotros para resolver tus dudas sobre membresías, eventos o recursos.
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-10 relative z-20">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Contact Info Cards */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex items-start gap-6">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shrink-0">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 mb-1">Dirección</h3>
                <p className="text-slate-600 text-sm">{settings.address}</p>
              </div>
            </div>
            
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex items-start gap-6">
              <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary shrink-0">
                <Phone className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 mb-1">Teléfono</h3>
                <p className="text-slate-600 text-sm">{settings.phone}</p>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex items-start gap-6">
              <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0">
                <MessageCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 mb-1">WhatsApp</h3>
                <p className="text-slate-600 text-sm">{settings.whatsapp}</p>
                <a 
                  href={`https://wa.me/${settings.whatsapp?.replace(/[^0-9]/g, '')}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-emerald-600 font-bold text-sm mt-2 hover:underline block"
                >
                  Iniciar Chat →
                </a>
              </div>
            </div>

            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex items-start gap-6">
              <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 shrink-0">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 mb-1">Email</h3>
                <p className="text-slate-600 text-sm">{settings.email}</p>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2 bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
            <div className="p-10 space-y-8">
              <div>
                <h2 className="text-3xl font-bold text-slate-900 mb-2">Envíanos un mensaje</h2>
                <p className="text-slate-500">Te responderemos en un plazo máximo de 24 horas hábiles.</p>
              </div>
              
              <form className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Nombre Completo</Label>
                  <Input id="name" placeholder="Ej. Dr. Juan Pérez" className="rounded-xl h-12" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <Input id="email" type="email" placeholder="juan@ejemplo.com" className="rounded-xl h-12" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono / WhatsApp</Label>
                  <Input id="phone" placeholder="+57 300..." className="rounded-xl h-12" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject">Asunto</Label>
                  <Input id="subject" placeholder="Inscripción, Membresía..." className="rounded-xl h-12" />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="message">Mensaje</Label>
                  <textarea 
                    id="message" 
                    rows={5} 
                    className="w-full rounded-xl border border-slate-200 p-4 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-sm"
                    placeholder="¿En qué podemos ayudarte?"
                  />
                </div>
                <div className="md:col-span-2 pt-4">
                  <Button className="w-full md:w-auto px-12 h-14 bg-primary hover:bg-primary/90 rounded-xl text-lg gap-2 shadow-lg shadow-primary/20">
                    Enviar Mensaje
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
              </form>
            </div>
            
            {/* Google Maps Integration */}
            <div className="h-80 bg-slate-100 w-full relative overflow-hidden">
              {settings.mapsUrl ? (
                <iframe 
                  src={settings.mapsUrl}
                  width="100%" 
                  height="100%" 
                  style={{ border: 0 }} 
                  allowFullScreen={true} 
                  loading="lazy" 
                  referrerPolicy="no-referrer-when-downgrade"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-medium">Configura el mapa en el panel de administración</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
