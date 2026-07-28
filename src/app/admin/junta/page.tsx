"use client";

import React, { useState, useEffect } from "react";
import { Users2, Plus, Edit2, Trash2, Loader2, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function BoardAdmin() {
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const supabase = createClient();

  const [formData, setFormData] = useState({
    name: "",
    role: "",
    image_url: ""
  });

  useEffect(() => {
    fetchMembers();
  }, []);

  async function fetchMembers() {
    try {
      const { data, error } = await supabase
        .from('board_members')
        .select('*')
        .order('order_index', { ascending: true });
      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error("Error fetching board members:", error);
    } finally {
      setLoading(false);
    }
  }

  async function uploadImage(file: File) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('board-members')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('board-members')
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let finalImageUrl = formData.image_url;

      if (selectedFile) {
        finalImageUrl = await uploadImage(selectedFile);
      }

      const payload = {
        name: formData.name,
        role: formData.role,
        image_url: finalImageUrl
      };

      if (editingId) {
        const { error } = await supabase.from('board_members').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('board_members').insert([payload]);
        if (error) throw error;
      }
      setIsModalOpen(false);
      setSelectedFile(null);
      fetchMembers();
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function openCreateModal() {
    setEditingId(null);
    setSelectedFile(null);
    setFormData({ name: "", role: "", image_url: "" });
    setIsModalOpen(true);
  }

  function openEditModal(member: any) {
    setEditingId(member.id);
    setSelectedFile(null);
    setFormData({
      name: member.name,
      role: member.role,
      image_url: member.image_url || ""
    });
    setIsModalOpen(true);
  }

  async function deleteMember(id: string) {
    if (!confirm("¿Eliminar este integrante?")) return;
    try {
      const { error } = await supabase.from('board_members').delete().eq('id', id);
      if (error) throw error;
      fetchMembers();
    } catch (error: any) {
      alert("Error: " + error.message);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-heading">Gestión de Junta Directiva</h1>
          <p className="text-slate-500">Administra los integrantes y sus cargos oficiales.</p>
        </div>
        
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <Button
            type="button"
            onClick={openCreateModal}
            className="bg-primary hover:bg-primary/90 h-12 px-6 rounded-xl"
          >
            <Plus className="w-5 h-5" />
            Agregar Integrante
          </Button>
          <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] border-none shadow-2xl overflow-y-auto max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold font-heading">
                {editingId ? "Editar Integrante" : "Nuevo Integrante"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 pt-4">
              <div className="space-y-2">
                <Label>Foto del Integrante</Label>
                <div className="flex items-center gap-4">
                  <div className="w-20 h-20 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden">
                    {selectedFile ? (
                      <img src={URL.createObjectURL(selectedFile)} className="w-full h-full object-cover" />
                    ) : formData.image_url ? (
                      <img src={formData.image_url} className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-slate-300" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <Input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="cursor-pointer file:bg-primary/10 file:text-primary file:border-none file:rounded-lg file:px-3 file:py-1 file:mr-4 file:font-bold h-12 pt-2"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Nombre Completo</Label>
                <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="rounded-xl h-12" />
              </div>
              <div className="space-y-2">
                <Label>Cargo / Rol</Label>
                <Input required value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="rounded-xl h-12" />
              </div>
              
              <Button type="submit" disabled={isSubmitting} className="w-full h-14 rounded-xl font-bold bg-primary text-white text-lg">
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Guardar Integrante"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
          <Users2 className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <p className="text-slate-500 font-medium font-heading text-xl">No hay integrantes todavía.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {members.map((member, index) => (
            <motion.div key={member.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.1 }}>
              <Card className="border-none shadow-sm rounded-2xl hover:shadow-md transition-all overflow-hidden bg-white/80 backdrop-blur-md">
                <CardContent className="p-4 flex items-center gap-6">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 border-2 border-white shadow-sm shrink-0">
                    <img src={member.image_url || "/img/logo.png"} alt={member.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-slate-900">{member.name}</h3>
                    <p className="text-primary text-sm font-bold uppercase tracking-wider">{member.role}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => openEditModal(member)} className="h-10 w-10 rounded-xl text-slate-400 hover:text-primary"><Edit2 className="w-5 h-5" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMember(member.id)} className="h-10 w-10 rounded-xl text-slate-400 hover:text-red-500"><Trash2 className="w-5 h-5" /></Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
