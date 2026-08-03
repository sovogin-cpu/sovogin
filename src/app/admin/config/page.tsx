"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Shield, Bell, Palette, Globe, Save, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { createClient } from "@/utils/supabase/client";

interface SiteSettingsSocial {
  facebook: string;
  instagram: string;
  twitter: string;
}

interface SiteSettingsNotifications {
  newMembers: boolean;
  payments: boolean;
  alerts: boolean;
}

interface SiteSettingsData {
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  mapsUrl: string;
  description: string;
  social: SiteSettingsSocial;
  darkMode: boolean;
  brandColor: string;
  auth2FA: boolean;
  activityLogs: boolean;
  notifications: SiteSettingsNotifications;
}

export default function SettingsAdmin() {
  const supabase = useMemo(() => createClient(), []);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [settings, setSettings] = useState<SiteSettingsData>({
    name: "SOVOGIN",
    email: "contacto@sovogin.com",
    phone: "+57 (601) 123 4567",
    whatsapp: "+57 300 123 4567",
    address: "Calle 100 #15-32, Bogotá",
    mapsUrl: "",
    description: "Sociedad líder en ginecología y obstetricia comprometida con la excelencia...",
    social: {
      facebook: "",
      instagram: "",
      twitter: ""
    },
    darkMode: false,
    brandColor: "#FF6432",
    auth2FA: false,
    activityLogs: true,
    notifications: {
      newMembers: true,
      payments: true,
      alerts: false
    }
  });

  const fetchSettings = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('data')
        .eq('id', 'general')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching settings:", error);
      }
      
      if (data && data.data) {
        const fetchedData = data.data as Partial<SiteSettingsData>;
        setSettings(prev => ({
          ...prev,
          ...fetchedData,
          notifications: { ...prev.notifications, ...(fetchedData.notifications || {}) },
          social: { ...prev.social, ...(fetchedData.social || {}) }
        }));
      }
    } catch (error: unknown) {
      console.error("Error fetching settings:", error instanceof Error ? error.message : error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialSettings() {
      await fetchSettings();
      if (!isMounted) return;
    }

    void loadInitialSettings();

    return () => {
      isMounted = false;
    };
  }, [fetchSettings]);

  async function handleSave() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('site_settings')
        .upsert({ id: 'general', data: settings });
      
      if (error) throw error;
      
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      void fetchSettings();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      alert("Error guardando cambios: " + message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-heading">Configuración General</h1>
          <p className="text-slate-500">Ajusta los parámetros globales de la plataforma SOVOGIN.</p>
        </div>
        {showSuccess && (
          <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100 animate-in fade-in slide-in-from-top-4">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-bold">¡Cambios guardados con éxito!</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Perfil de la Asociación */}
          <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden bg-white/80 backdrop-blur-md">
            <CardHeader className="p-8 border-b border-slate-50">
              <CardTitle className="text-xl flex items-center gap-3">
                <Globe className="w-6 h-6 text-primary" />
                Información de la Asociación
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Nombre Oficial</Label>
                  <Input 
                    value={settings.name || ""} 
                    onChange={e => setSettings({...settings, name: e.target.value})}
                    className="h-12 rounded-xl" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email de Contacto</Label>
                  <Input 
                    value={settings.email || ""} 
                    onChange={e => setSettings({...settings, email: e.target.value})}
                    className="h-12 rounded-xl" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Teléfono</Label>
                  <Input 
                    value={settings.phone || ""} 
                    onChange={e => setSettings({...settings, phone: e.target.value})}
                    className="h-12 rounded-xl" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>WhatsApp</Label>
                  <Input 
                    value={settings.whatsapp || ""} 
                    onChange={e => setSettings({...settings, whatsapp: e.target.value})}
                    placeholder="+57 300..."
                    className="h-12 rounded-xl" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Dirección</Label>
                  <Input 
                    value={settings.address || ""} 
                    onChange={e => setSettings({...settings, address: e.target.value})}
                    className="h-12 rounded-xl" 
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>URL de Google Maps (Iframe Embed)</Label>
                  <Input 
                    value={settings.mapsUrl || ""} 
                    onChange={e => setSettings({...settings, mapsUrl: e.target.value})}
                    placeholder="https://www.google.com/maps/embed?..."
                    className="h-12 rounded-xl" 
                  />
                  <p className="text-[10px] text-slate-400">Instrucciones: En Google Maps, ve a Compartir &gt; Insertar un mapa &gt; Copia solo el contenido de &apos;src=&quot;...&quot;&apos;.</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Descripción de la Asociación</Label>
                <textarea 
                  className="w-full min-h-[120px] p-4 rounded-xl border border-slate-200 bg-slate-50/50 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                  value={settings.description}
                  onChange={e => setSettings({...settings, description: e.target.value})}
                />
              </div>

              {/* Social Media Links */}
              <div className="pt-6 border-t border-slate-50 space-y-4">
                <h4 className="font-bold text-slate-900">Redes Sociales</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label>Facebook URL</Label>
                    <Input 
                      value={settings.social?.facebook || ""} 
                      onChange={e => setSettings({...settings, social: {...settings.social, facebook: e.target.value}})}
                      placeholder="https://facebook.com/..."
                      className="h-12 rounded-xl" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Instagram URL</Label>
                    <Input 
                      value={settings.social?.instagram || ""} 
                      onChange={e => setSettings({...settings, social: {...settings.social, instagram: e.target.value}})}
                      placeholder="https://instagram.com/..."
                      className="h-12 rounded-xl" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Twitter (X) URL</Label>
                    <Input 
                      value={settings.social?.twitter || ""} 
                      onChange={e => setSettings({...settings, social: {...settings.social, twitter: e.target.value}})}
                      placeholder="https://twitter.com/..."
                      className="h-12 rounded-xl" 
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Apariencia */}
          <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden bg-white/80 backdrop-blur-md">
            <CardHeader className="p-8 border-b border-slate-50">
              <CardTitle className="text-xl flex items-center gap-3">
                <Palette className="w-6 h-6 text-primary" />
                Personalización Visual
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Modo Oscuro</Label>
                  <p className="text-sm text-slate-500 font-medium">Habilitar el tema oscuro en toda la plataforma.</p>
                </div>
                <Switch 
                  checked={settings.darkMode} 
                  onCheckedChange={checked => setSettings({...settings, darkMode: checked})} 
                />
              </div>
              <div className="flex items-center justify-between border-t border-slate-50 pt-6">
                <div className="space-y-0.5">
                  <Label className="text-base">Color de Marca</Label>
                  <p className="text-sm text-slate-500 font-medium">Color principal usado en botones y links.</p>
                </div>
                <div className="flex gap-2">
                  <div 
                    onClick={() => setSettings({...settings, brandColor: "#FF6432"})}
                    className={`w-8 h-8 rounded-full bg-[#FF6432] cursor-pointer transition-all ${settings.brandColor === '#FF6432' ? 'ring-2 ring-primary ring-offset-2' : ''}`} 
                  />
                  <div 
                    onClick={() => setSettings({...settings, brandColor: "#0F172A"})}
                    className={`w-8 h-8 rounded-full bg-[#0F172A] cursor-pointer transition-all ${settings.brandColor === '#0F172A' ? 'ring-2 ring-[#0F172A] ring-offset-2' : ''}`} 
                  />
                  <div 
                    onClick={() => setSettings({...settings, brandColor: "#2563EB"})}
                    className={`w-8 h-8 rounded-full bg-[#2563EB] cursor-pointer transition-all ${settings.brandColor === '#2563EB' ? 'ring-2 ring-[#2563EB] ring-offset-2' : ''}`} 
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-8">
          {/* Seguridad */}
          <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden bg-slate-900 text-white">
            <CardHeader className="p-8">
              <CardTitle className="text-xl flex items-center gap-3">
                <Shield className="w-6 h-6 text-primary" />
                Seguridad
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 pt-0 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Auth de 2 Pasos</span>
                  <Switch 
                    checked={settings.auth2FA}
                    onCheckedChange={checked => setSettings({...settings, auth2FA: checked})}
                    className="bg-white/10" 
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">Logs de Actividad</span>
                  <Switch 
                    checked={settings.activityLogs}
                    onCheckedChange={checked => setSettings({...settings, activityLogs: checked})}
                    className="bg-white/10" 
                  />
                </div>
              </div>
              <Button variant="outline" className="w-full rounded-xl border-white/20 text-white hover:bg-white/10 mt-4">
                Cambiar Contraseña
              </Button>
            </CardContent>
          </Card>

          {/* Notificaciones */}
          <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden bg-white">
            <CardHeader className="p-8">
              <CardTitle className="text-xl flex items-center gap-3">
                <Bell className="w-6 h-6 text-primary" />
                Notificaciones
              </CardTitle>
            </CardHeader>
            <CardContent className="p-8 pt-0 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500 font-medium">Nuevos Asociados</span>
                  <Switch 
                    checked={settings.notifications.newMembers}
                    onCheckedChange={checked => setSettings({...settings, notifications: {...settings.notifications, newMembers: checked}})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500 font-medium">Pagos Recibidos</span>
                  <Switch 
                    checked={settings.notifications.payments}
                    onCheckedChange={checked => setSettings({...settings, notifications: {...settings.notifications, payments: checked}})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500 font-medium">Alertas del Sistema</span>
                  <Switch 
                    checked={settings.notifications.alerts}
                    onCheckedChange={checked => setSettings({...settings, notifications: {...settings.notifications, alerts: checked}})}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Floating Save Button */}
      <div className="fixed bottom-10 right-10 z-50">
        <Button 
          onClick={handleSave}
          disabled={saving}
          size="lg" 
          className="h-16 px-10 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-lg shadow-2xl shadow-primary/40 gap-3 hover:scale-105 transition-all"
        >
          {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
          {saving ? "Guardando..." : "Guardar Cambios"}
        </Button>
      </div>
    </div>
  );
}
