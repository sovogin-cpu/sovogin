"use client";

import React, { useState, useEffect } from "react";
import { Image as ImageIcon, Plus, Trash2, Edit2, Loader2, ExternalLink } from "lucide-react";
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

const levels = ["Diamante", "Oro", "Plata", "Bronce"];

export default function SponsorsAdmin() {
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const supabase = createClient();

  const [formData, setFormData] = useState({
    name: "",
    level: "Bronce",
    logo_url: "",
    website_url: ""
  });

  useEffect(() => {
    fetchSponsors();
  }, []);

  async function fetchSponsors() {
    try {
      const { data, error } = await supabase
        .from('sponsors')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setSponsors(data || []);
    } catch (error) {
      console.error("Error fetching sponsors:", error);
    } finally {
      setLoading(false);
    }
  }

  async function uploadImage(file: File) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('sponsors')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('sponsors')
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let finalLogoUrl = formData.logo_url;
      if (selectedFile) {
        finalLogoUrl = await uploadImage(selectedFile);
      }

      const payload = { ...formData, logo_url: finalLogoUrl };

      if (editingId) {
        const { error } = await supabase.from('sponsors').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('sponsors').insert([payload]);
        if (error) throw error;
      }
      setIsModalOpen(false);
      setSelectedFile(null);
      fetchSponsors();
    } catch (error: any) {
      if (error.message.includes("Bucket not found")) {
        alert("Error: El bucket de almacenamiento 'sponsors' no existe. Por favor, créalo en el panel de Supabase como un bucket PÚBLICO.");
      } else {
        alert("Error: " + error.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function openCreateModal() {
    setEditingId(null);
    setSelectedFile(null);
    setFormData({ name: "", level: "Bronce", logo_url: "", website_url: "" });
    setIsModalOpen(true);
  }

  function openEditModal(sponsor: any) {
    setEditingId(sponsor.id);
    setSelectedFile(null);
    setFormData({
      name: sponsor.name,
      level: sponsor.level,
      logo_url: sponsor.logo_url || "",
      website_url: sponsor.website_url || ""
    });
    setIsModalOpen(true);
  }

  async function deleteSponsor(id: string) {
    if (!confirm("¿Eliminar este patrocinador?")) return;
    try {
      const { error } = await supabase.from('sponsors').delete().eq('id', id);
      if (error) throw error;
      fetchSponsors();
    } catch (error: any) {
      alert("Error: " + error.message);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-heading">Patrocinadores y Aliados</h1>
          <p className="text-slate-500">Gestiona las marcas que apoyan a SOVOGIN.</p>
        </div>
        
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <Button onClick={openCreateModal} className="bg-primary hover:bg-primary/90 h-12 px-6 rounded-xl shadow-lg shadow-primary/20 gap-2 font-bold">
            <Plus className="w-5 h-5" />
            Nuevo Patrocinador
          </Button>
          <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] border-none shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold font-heading">
                {editingId ? "Editar Marca" : "Nueva Marca"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 pt-4">
              <div className="space-y-2">
                <Label>Logo de la Marca</Label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
                    {selectedFile ? (
                      <img src={URL.createObjectURL(selectedFile)} className="w-full h-full object-contain p-2" />
                    ) : formData.logo_url ? (
                      <img src={formData.logo_url} className="w-full h-full object-contain p-2" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <Input type="file" accept="image/*" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} className="cursor-pointer h-12 pt-2" />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Nombre de la Empresa</Label>
                <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="rounded-xl h-12" />
              </div>

              <div className="space-y-2">
                <Label>Nivel de Patrocinio</Label>
                <select 
                  value={formData.level} 
                  onChange={e => setFormData({...formData, level: e.target.value})}
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {levels.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Sitio Web (opcional)</Label>
                <Input value={formData.website_url} onChange={e => setFormData({...formData, website_url: e.target.value})} placeholder="https://..." className="rounded-xl h-12" />
              </div>
              
              <Button type="submit" disabled={isSubmitting} className="w-full h-14 rounded-xl font-bold bg-primary text-white text-lg">
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Guardar Patrocinador"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      ) : sponsors.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
          <ImageIcon className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-500 font-medium font-heading text-xl">No hay patrocinadores todavía.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {sponsors.map((sponsor) => (
            <Card key={sponsor.id} className="border-none shadow-sm rounded-[2.5rem] overflow-hidden group hover:shadow-xl transition-all duration-300 bg-white/80 backdrop-blur-md">
              <div className="aspect-[2/1] bg-slate-50 flex items-center justify-center relative overflow-hidden p-8">
                <img src={sponsor.logo_url || "/img/logo.png"} alt={sponsor.name} className="max-w-full max-h-full object-contain group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute top-4 left-4">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest shadow-sm ${
                    sponsor.level === 'Diamante' ? 'bg-indigo-500 text-white' : 
                    sponsor.level === 'Oro' ? 'bg-amber-400 text-white' : 'bg-slate-400 text-white'
                  }`}>
                    {sponsor.level}
                  </span>
                </div>
              </div>
              <CardContent className="p-8 space-y-6">
                <div className="space-y-1">
                  <h3 className="text-2xl font-bold text-slate-900">{sponsor.name}</h3>
                  {sponsor.website_url && (
                    <div className="flex items-center gap-2 text-slate-400 text-sm">
                      <ExternalLink className="w-4 h-4" />
                      <span className="truncate">{sponsor.website_url}</span>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => openEditModal(sponsor)} className="flex-1 rounded-xl h-12 font-bold">Editar</Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteSponsor(sponsor.id)} className="h-12 w-12 rounded-xl text-red-500 hover:bg-red-50">
                    <Trash2 className="w-5 h-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
