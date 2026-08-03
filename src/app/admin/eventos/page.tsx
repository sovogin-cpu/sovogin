"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, MapPin, Loader2, Edit2, Trash2, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/utils/supabase/client";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PricingTier {
  name: string;
  presencial: number;
  virtual: number;
}

interface Speaker {
  name: string;
  description: string;
}

interface ProgramItem {
  time: string;
  topic: string;
  speakers: Speaker[];
  speaker?: string;
}

interface TieredPricing {
  tiers?: PricingTier[];
  presencial?: {
    general?: number;
    [key: string]: number | undefined;
  };
  virtual?: {
    general?: number;
    [key: string]: number | undefined;
  };
}

interface Event {
  id: string;
  title: string;
  description?: string | null;
  date: string;
  location?: string | null;
  image_url?: string | null;
  live_url?: string | null;
  moderators?: string | null;
  program_items?: ProgramItem[] | null;
  speakers_info?: string | null;
  tiered_pricing?: TieredPricing | null;
  created_at?: string;
}

interface EventFormData {
  title: string;
  description: string;
  date: string;
  location: string;
  image_url: string;
  live_url: string;
  moderators: string;
  program_items: ProgramItem[];
  speakers_info: string;
  pricing_tiers: PricingTier[];
}

export default function EventsAdmin() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const supabase = useMemo(() => createClient(), []);

  const [formData, setFormData] = useState<EventFormData>({
    title: "",
    description: "",
    date: "",
    location: "",
    image_url: "/img/1.jpeg",
    live_url: "",
    moderators: "",
    program_items: [],
    speakers_info: "",
    pricing_tiers: [
      { name: "General", presencial: 0, virtual: 0 },
      { name: "Residente", presencial: 0, virtual: 0 },
      { name: "Estudiante", presencial: 0, virtual: 0 },
      { name: "Asociado", presencial: 0, virtual: 0 }
    ]
  });

  const fetchEvents = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setEvents((data as Event[]) || []);
    } catch (error: unknown) {
      console.error("Error fetching events:", error instanceof Error ? error.message : error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialEvents() {
      await fetchEvents();
      if (!isMounted) return;
    }

    void loadInitialEvents();

    return () => {
      isMounted = false;
    };
  }, [fetchEvents]);

  function openCreateModal() {
    setEditingId(null);
    setSelectedFile(null);
    setFormData({
      title: "",
      description: "",
      date: "",
      location: "",
      image_url: "/img/1.jpeg",
      live_url: "",
      moderators: "",
      program_items: [{ time: "", topic: "", speakers: [{ name: "", description: "" }] }],
      speakers_info: "",
      pricing_tiers: [
        { name: "General", presencial: 0, virtual: 0 },
        { name: "Residente", presencial: 0, virtual: 0 },
        { name: "Estudiante", presencial: 0, virtual: 0 },
        { name: "Asociado", presencial: 0, virtual: 0 }
      ]
    });
    setIsModalOpen(true);
  }

  function openEditModal(eventItem: Event) {
    setEditingId(eventItem.id);
    setSelectedFile(null);
    setFormData({
      title: eventItem.title,
      description: eventItem.description || "",
      date: eventItem.date,
      location: eventItem.location || "",
      image_url: eventItem.image_url || "/img/1.jpeg",
      live_url: eventItem.live_url || "",
      moderators: eventItem.moderators || "",
      program_items: eventItem.program_items?.map((item) => ({
        ...item,
        speakers: item.speakers?.map((s) => typeof s === 'string' ? { name: s, description: "" } : s) || [{ name: item.speaker || "", description: "" }]
      })) || [],
      speakers_info: eventItem.speakers_info || "",
      pricing_tiers: eventItem.tiered_pricing?.tiers || [
        { name: "General", presencial: 0, virtual: 0 },
        { name: "Residente", presencial: 0, virtual: 0 },
        { name: "Estudiante", presencial: 0, virtual: 0 },
        { name: "Asociado", presencial: 0, virtual: 0 }
      ]
    });
    setIsModalOpen(true);
  }

  async function uploadImage(file: File) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;
    const { error: uploadError } = await supabase.storage.from('event-images').upload(filePath, file);
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('event-images').getPublicUrl(filePath);
    return data.publicUrl;
  }

  const addProgramItem = () => {
    setFormData({
      ...formData,
      program_items: [...formData.program_items, { time: "", topic: "", speakers: [{ name: "", description: "" }] }]
    });
  };

  const removeProgramItem = (index: number) => {
    const newItems = [...formData.program_items];
    newItems.splice(index, 1);
    setFormData({ ...formData, program_items: newItems });
  };

  const updateProgramItem = (index: number, field: keyof ProgramItem, value: string | Speaker[]) => {
    const newItems = [...formData.program_items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, program_items: newItems });
  };

  const addSpeakerToItem = (itemIndex: number) => {
    const newItems = [...formData.program_items];
    newItems[itemIndex].speakers = [...newItems[itemIndex].speakers, { name: "", description: "" }];
    setFormData({ ...formData, program_items: newItems });
  };

  const removeSpeakerFromItem = (itemIndex: number, speakerIndex: number) => {
    const newItems = [...formData.program_items];
    newItems[itemIndex].speakers.splice(speakerIndex, 1);
    setFormData({ ...formData, program_items: newItems });
  };

  const updateSpeakerInItem = (itemIndex: number, speakerIndex: number, field: keyof Speaker, value: string) => {
    const newItems = [...formData.program_items];
    newItems[itemIndex].speakers[speakerIndex] = { 
      ...newItems[itemIndex].speakers[speakerIndex], 
      [field]: value 
    };
    setFormData({ ...formData, program_items: newItems });
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let finalImageUrl = formData.image_url;
      if (selectedFile) {
        finalImageUrl = await uploadImage(selectedFile);
      }

      const payload = {
        title: formData.title,
        description: formData.description,
        date: formData.date,
        location: formData.location,
        image_url: finalImageUrl,
        live_url: formData.live_url,
        moderators: formData.moderators,
        program_items: formData.program_items,
        speakers_info: formData.speakers_info,
        tiered_pricing: { tiers: formData.pricing_tiers }
      };

      if (editingId) {
        const { error } = await supabase.from('events').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('events').insert([payload]);
        if (error) throw error;
      }

      setIsModalOpen(false);
      void fetchEvents();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error al procesar el evento";
      alert("Error: " + message);
    } finally {
      setIsSubmitting(false);
    }
  }

  const addTier = () => {
    setFormData({
      ...formData,
      pricing_tiers: [...formData.pricing_tiers, { name: "Nuevo", presencial: 0, virtual: 0 }]
    });
  };

  const removeTier = (index: number) => {
    const newTiers = [...formData.pricing_tiers];
    newTiers.splice(index, 1);
    setFormData({ ...formData, pricing_tiers: newTiers });
  };

  const updateTier = (index: number, field: keyof PricingTier, value: string | number) => {
    const newTiers = [...formData.pricing_tiers];
    newTiers[index] = { ...newTiers[index], [field]: value };
    setFormData({ ...formData, pricing_tiers: newTiers });
  };

  async function deleteEvent(id: string) {
    if (!confirm("¿Eliminar este evento?")) return;
    try {
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) throw error;
      void fetchEvents();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error al eliminar el evento";
      alert("Error: " + message);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-heading">Gestión de Eventos</h1>
          <p className="text-slate-500">Configura precios detallados para presencial y virtual.</p>
        </div>

        <Button onClick={openCreateModal} className="bg-primary hover:bg-primary/90 h-12 px-6 rounded-xl shadow-lg shadow-primary/20 gap-2 font-bold">
          <Plus className="w-5 h-5" />
          Crear Evento
        </Button>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[700px] rounded-[2.5rem] border-none shadow-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold font-heading">{editingId ? "Editar Evento" : "Nuevo Evento"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            <Tabs defaultValue="detalles" className="w-full">
              <TabsList className="grid grid-cols-2 rounded-2xl mb-8 bg-slate-100 p-1.5 h-14">
                <TabsTrigger value="detalles" className="rounded-xl font-bold">Detalles del Evento</TabsTrigger>
                <TabsTrigger value="precios" className="rounded-xl font-bold">Tabla de Precios</TabsTrigger>
              </TabsList>

              <TabsContent value="detalles" className="space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label>Imagen del Evento</Label>
                      <div className="flex items-center gap-4">
                        <div className="w-20 h-20 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                          {selectedFile ? (
                            <img src={URL.createObjectURL(selectedFile)} alt={`Previsualización de la imagen cargada para ${formData.title || "el evento"}`} className="w-full h-full object-cover" />
                          ) : (
                            <img src={formData.image_url} alt={`Vista previa de ${formData.title || "el evento"}`} className="w-full h-full object-cover" />
                          )}
                        </div>
                        <Input type="file" accept="image/*" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} className="h-10 text-xs" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Título del Evento</Label>
                      <Input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="rounded-xl h-12" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Fecha</Label>
                        <Input required type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="rounded-xl h-12" />
                      </div>
                      <div className="space-y-2">
                        <Label>Ubicación</Label>
                        <Input required value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="rounded-xl h-12" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-primary font-bold flex items-center gap-2">
                        <ImageIcon className="w-4 h-4" /> Link del Evento en Vivo (Virtual)
                      </Label>
                      <Input value={formData.live_url} onChange={e => setFormData({...formData, live_url: e.target.value})} placeholder="https://zoom.us/j/..." className="rounded-xl h-12 border-primary/20" />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label>Moderadores</Label>
                      <Input value={formData.moderators} onChange={e => setFormData({...formData, moderators: e.target.value})} placeholder="Lista de moderadores..." className="rounded-xl h-12" />
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <Label className="text-primary font-bold">Programa del Evento</Label>
                        <Button type="button" variant="outline" size="sm" onClick={addProgramItem} className="h-8 rounded-lg gap-1 border-primary text-primary">
                          <Plus className="w-4 h-4" /> Tema
                        </Button>
                      </div>
                      
                      <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                        {formData.program_items.map((item, index: number) => (
                          <div key={index} className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-3 relative group">
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => removeProgramItem(index)}
                              className="absolute top-2 right-2 h-6 w-6 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>

                            <div className="grid grid-cols-12 gap-3">
                               <div className="col-span-3">
                                  <Label className="text-[10px] uppercase font-bold text-slate-400">Hora</Label>
                                  <Input value={item.time} onChange={(e) => updateProgramItem(index, 'time', e.target.value)} placeholder="8:00 AM" className="h-9 text-xs rounded-lg" />
                               </div>
                               <div className="col-span-9">
                                  <Label className="text-[10px] uppercase font-bold text-slate-400">Tema del Bloque</Label>
                                  <Input value={item.topic} onChange={(e) => updateProgramItem(index, 'topic', e.target.value)} placeholder="Título de la charla" className="h-9 text-xs rounded-lg font-bold" />
                               </div>
                            </div>
                            
                            <div className="space-y-2 pt-2 border-t border-slate-200/50">
                               <div className="flex items-center justify-between">
                                  <Label className="text-[10px] uppercase font-bold text-primary">Ponentes / Panelistas</Label>
                                  <Button type="button" variant="ghost" size="sm" onClick={() => addSpeakerToItem(index)} className="h-5 text-[9px] font-bold text-primary hover:bg-primary/5 gap-1">
                                     <Plus className="w-3 h-3" /> Añadir Panelista
                                  </Button>
                               </div>
                               
                               <div className="space-y-3">
                                  {item.speakers?.map((speaker, sIdx: number) => (
                                     <div key={sIdx} className="p-3 rounded-xl bg-white border border-slate-100 shadow-sm space-y-2 relative">
                                        <div className="flex gap-2">
                                           <Input 
                                             value={speaker.name} 
                                             onChange={(e) => updateSpeakerInItem(index, sIdx, 'name', e.target.value)} 
                                             placeholder="Nombre del Panelista" 
                                             className="h-9 text-xs rounded-lg flex-1 font-bold" 
                                           />
                                           {item.speakers.length > 1 && (
                                              <Button 
                                                type="button" 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => removeSpeakerFromItem(index, sIdx)}
                                                className="h-9 w-9 text-slate-300 hover:text-red-400"
                                              >
                                                 <Trash2 className="w-3.5 h-3.5" />
                                              </Button>
                                           )}
                                        </div>
                                        <Input 
                                          value={speaker.description} 
                                          onChange={(e) => updateSpeakerInItem(index, sIdx, 'description', e.target.value)} 
                                          placeholder="Cargo o descripción corta (ej: Ginecobstetra, Cali)" 
                                          className="h-8 text-[10px] rounded-lg w-full bg-slate-50/50" 
                                        />
                                     </div>
                                  ))}
                               </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Otros Detalles de Ponentes</Label>
                      <Textarea value={formData.speakers_info} onChange={e => setFormData({...formData, speakers_info: e.target.value})} placeholder="Información adicional sobre ponentes..." className="rounded-xl min-h-[80px] resize-none" />
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="precios">

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-lg font-bold text-primary">Precios por Categoría</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addTier} className="h-8 rounded-lg gap-1 border-primary text-primary">
                    <Plus className="w-4 h-4" /> Tipo
                  </Button>
                </div>
                
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                  {formData.pricing_tiers.map((tier, index: number) => (
                    <div key={index} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3 relative">
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => removeTier(index)}
                        className="absolute top-2 right-2 h-8 w-8 text-slate-300 hover:text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>

                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase font-bold text-slate-400">Nombre del Tipo</Label>
                        <Input 
                          value={tier.name} 
                          onChange={(e) => updateTier(index, 'name', e.target.value)}
                          placeholder="Ej: General"
                          className="h-10 rounded-lg"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-bold text-slate-400">Presencial</Label>
                          <Input 
                            type="number"
                            value={tier.presencial} 
                            onChange={(e) => updateTier(index, 'presencial', parseFloat(e.target.value) || 0)}
                            className="h-10 rounded-lg text-right"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase font-bold text-slate-400">Virtual</Label>
                          <Input 
                            type="number"
                            value={tier.virtual} 
                            onChange={(e) => updateTier(index, 'virtual', parseFloat(e.target.value) || 0)}
                            className="h-10 rounded-lg text-right"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="space-y-2">
              <Label>Resumen / Descripción Corta</Label>
              <Textarea 
                required
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                className="w-full min-h-[80px] rounded-xl"
              />
            </div>
            
            <Button type="submit" disabled={isSubmitting} className="w-full h-14 rounded-2xl font-bold bg-primary text-white text-lg shadow-xl shadow-primary/20">
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Guardar Evento"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {events.map((eventItem) => (
            <Card key={eventItem.id} className="border-none shadow-sm rounded-[2.5rem] overflow-hidden bg-white border border-slate-50">
              <div className="aspect-video relative overflow-hidden">
                <img src={eventItem.image_url || "/img/1.jpeg"} alt={`Imagen promocional de ${eventItem.title}`} className="w-full h-full object-cover" />
                <div className="absolute top-4 right-4 flex gap-2">
                  <button onClick={() => openEditModal(eventItem)} className="p-2 bg-white/90 backdrop-blur-md rounded-xl text-slate-600 hover:text-primary"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => deleteEvent(eventItem.id)} className="p-2 bg-white/90 backdrop-blur-md rounded-xl text-slate-600 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold text-slate-900 mb-4">{eventItem.title}</h3>
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">General (Presencial):</span>
                    <span className="font-bold text-primary">${new Intl.NumberFormat('es-CO').format(eventItem.tiered_pricing?.presencial?.general || 0)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Asociados:</span>
                    <span className="font-bold text-emerald-500">Gratis</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-slate-400 text-sm"><MapPin className="w-4 h-4" />{eventItem.location}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
