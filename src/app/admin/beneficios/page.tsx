"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Trash2, Edit2, CheckCircle2, Loader2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/utils/supabase/client";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface Benefit {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  order_index: number;
  created_at?: string;
}

interface BenefitFormData {
  title: string;
  description: string;
  icon: string;
  order_index: number;
}

export default function AssociationBenefitsAdmin() {
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const supabase = useMemo(() => createClient(), []);

  const [formData, setFormData] = useState<BenefitFormData>({
    title: "",
    description: "",
    icon: "CheckCircle2",
    order_index: 0
  });

  const fetchBenefits = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('association_benefits')
        .select('*')
        .order('order_index', { ascending: true });
      
      if (error) {
        console.error("Supabase error fetching benefits:", error);
        throw error;
      }
      
      setBenefits((data as Benefit[]) || []);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error desconocido";
      console.error("Detailed error fetching benefits:", error);
      alert("Error al cargar beneficios: " + message);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialBenefits() {
      try {
        const { data, error } = await supabase
          .from('association_benefits')
          .select('*')
          .order('order_index', { ascending: true });
        
        if (error) throw error;
        if (isMounted) {
          setBenefits((data as Benefit[]) || []);
        }
      } catch (error: unknown) {
        console.error("Error fetching benefits:", error instanceof Error ? error.message : error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadInitialBenefits();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  function openCreateModal() {
    setEditingId(null);
    setFormData({ title: "", description: "", icon: "CheckCircle2", order_index: benefits.length });
    setIsModalOpen(true);
  }

  function openEditModal(benefit: Benefit) {
    setEditingId(benefit.id);
    setFormData({
      title: benefit.title,
      description: benefit.description || "",
      icon: benefit.icon || "CheckCircle2",
      order_index: benefit.order_index || 0
    });
    setIsModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingId) {
        const { error } = await supabase
          .from('association_benefits')
          .update(formData)
          .eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('association_benefits')
          .insert([formData]);
        if (error) throw error;
      }
      setIsModalOpen(false);
      void fetchBenefits();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error al procesar la solicitud";
      alert("Error: " + message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function deleteBenefit(id: string) {
    if (!confirm("¿Eliminar este beneficio?")) return;
    try {
      const { error } = await supabase.from('association_benefits').delete().eq('id', id);
      if (error) throw error;
      void fetchBenefits();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Error al eliminar el beneficio";
      alert("Error: " + message);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-heading">Beneficios de Asociados</h1>
          <p className="text-slate-500">Administra los motivos por los cuales los médicos deberían unirse a SOVOGIN.</p>
        </div>
        
        <Button onClick={openCreateModal} className="bg-primary hover:bg-primary/90 h-12 px-6 rounded-xl shadow-lg shadow-primary/20 gap-2 font-bold">
          <Plus className="w-5 h-5" />
          Nuevo Beneficio
        </Button>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold font-heading">
              {editingId ? "Editar Beneficio" : "Nuevo Beneficio"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label>Título del Beneficio</Label>
              <Input 
                required 
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
                placeholder="Ej: Acceso a Congresos Internacionales" 
                className="rounded-xl h-12"
              />
            </div>
            <div className="space-y-2">
              <Label>Descripción</Label>
              <textarea 
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
                placeholder="Breve explicación de este beneficio..." 
                className="w-full h-32 px-4 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label>Orden (Posición)</Label>
              <Input 
                type="number"
                value={formData.order_index}
                onChange={e => setFormData({...formData, order_index: parseInt(e.target.value)})}
                className="rounded-xl h-12"
              />
            </div>
            <Button type="submit" disabled={isSubmitting} className="w-full h-14 rounded-xl font-bold bg-primary text-white text-lg">
              {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Guardar Beneficio"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((benefit) => (
            <div key={benefit.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 group hover:shadow-xl transition-all duration-300 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-2 h-full bg-primary/20 group-hover:bg-primary transition-colors" />
              
              <div className="flex justify-between items-start mb-6">
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => openEditModal(benefit)} className="h-8 w-8 rounded-lg text-slate-400 hover:text-primary">
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => deleteBenefit(benefit.id)} className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-500">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <h3 className="text-xl font-bold text-slate-900 mb-3 leading-tight">{benefit.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{benefit.description}</p>
              <div className="mt-6 flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <GripVertical className="w-3 h-3" />
                Posición: {benefit.order_index}
              </div>
            </div>
          ))}
          {benefits.length === 0 && (
            <div className="col-span-full py-20 text-center bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200">
              <p className="text-slate-400 font-medium">No hay beneficios registrados. Haz clic en &quot;Nuevo Beneficio&quot; para empezar.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
