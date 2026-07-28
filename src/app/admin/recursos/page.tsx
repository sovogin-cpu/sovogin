"use client";

import React, { useState, useEffect } from "react";
import { FileText, Download, Eye, Plus, Search, FileUp, Loader2, Trash2, Edit2, Play, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const resourceCategories = [
  "Documentación SOVOGIN", 
  "Simposios", 
  "Charlas", 
  "Lives",
  "Guías Clínicas",
  "Protocolos",
  "Otro"
];

const resourceTypes = [
  { id: "document", name: "Archivo (PDF, Word, PPT)", icon: FileText },
  { id: "video", name: "YouTube (Link)", icon: Play },
  { id: "link", name: "Enlace Externo", icon: Globe },
];

export default function ResourcesAdmin() {
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const supabase = createClient();

  const [formData, setFormData] = useState({
    title: "",
    category: "Documentación SOVOGIN",
    resource_type: "document",
    file_url: "",
    youtube_url: "",
    external_link: "",
    description: ""
  });

  useEffect(() => {
    fetchResources();
  }, []);

  async function fetchResources() {
    try {
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setResources(data || []);
    } catch (error) {
      console.error("Error fetching resources:", error);
    } finally {
      setLoading(false);
    }
  }

  async function uploadFile(file: File) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('resources')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('resources')
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      let finalFileUrl = formData.file_url;
      
      // If it's a document, we might need to upload it
      if (formData.resource_type === 'document' && selectedFile) {
        finalFileUrl = await uploadFile(selectedFile);
      } else if (formData.resource_type === 'video') {
        finalFileUrl = formData.youtube_url;
      } else if (formData.resource_type === 'link') {
        finalFileUrl = formData.external_link;
      }

      if (!finalFileUrl && !editingId) throw new Error("Debes proporcionar un archivo o enlace");

      const payload = { 
        title: formData.title,
        category: formData.category,
        resource_type: formData.resource_type,
        file_url: finalFileUrl,
        description: formData.description
      };

      if (editingId) {
        const { error } = await supabase.from('resources').update(payload).eq('id', editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('resources').insert([payload]);
        if (error) throw error;
      }
      setIsModalOpen(false);
      setSelectedFile(null);
      fetchResources();
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function openEditModal(res: any) {
    setEditingId(res.id);
    setFormData({
      title: res.title,
      category: res.category || "Documentación SOVOGIN",
      resource_type: res.resource_type || "document",
      file_url: res.file_url || "",
      youtube_url: res.resource_type === 'video' ? res.file_url : "",
      external_link: res.resource_type === 'link' ? res.file_url : "",
      description: res.description || ""
    });
    setIsModalOpen(true);
  }

  async function deleteResource(id: string) {
    if (!confirm("¿Eliminar este recurso?")) return;
    try {
      const { error } = await supabase.from('resources').delete().eq('id', id);
      if (error) throw error;
      fetchResources();
    } catch (error: any) {
      alert("Error: " + error.message);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-heading">Biblioteca de Recursos</h1>
          <p className="text-slate-500">Administra guías clínicas, protocolos y material educativo.</p>
        </div>
        
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <Button
            type="button"
            onClick={() => {
              setEditingId(null);
              setSelectedFile(null);

              setFormData({
                title: "",
                category: "Documentación SOVOGIN",
                resource_type: "document",
                file_url: "",
                youtube_url: "",
                external_link: "",
                description: ""
              });
              setIsModalOpen(true);
            }}
          >
            <Plus className="w-5 h-5" />
            Subir Recurso
          </Button>
          <DialogContent className="sm:max-w-[550px] rounded-[2.5rem] border-none shadow-2xl overflow-y-auto max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold font-heading">
                {editingId ? "Editar Recurso" : "Nuevo Recurso"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 pt-4">
              <div className="space-y-4">
                <Label className="font-bold text-slate-700">Tipo de Recurso</Label>
                <div className="grid grid-cols-3 gap-3">
                  {resourceTypes.map((type) => {
                    const Icon = type.icon;
                    const isSelected = formData.resource_type === type.id;
                    return (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setFormData({...formData, resource_type: type.id})}
                        className={cn(
                          "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2",
                          isSelected 
                            ? "border-primary bg-primary/5 text-primary shadow-sm" 
                            : "border-slate-100 bg-white text-slate-400 hover:border-slate-200"
                        )}
                      >
                        <Icon className="w-6 h-6" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">{type.name.split(' (')[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {formData.resource_type === 'document' && (
                <div className="space-y-2">
                  <Label>Archivo (PDF, Word, PPT)</Label>
                  <div className="p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 flex flex-col items-center justify-center gap-2">
                    <FileUp className="w-8 h-8 text-slate-300" />
                    <input 
                      type="file" 
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} 
                      className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:bg-primary/90"
                    />
                    {selectedFile && <p className="text-xs font-bold text-primary">{selectedFile.name}</p>}
                  </div>
                </div>
              )}

              {formData.resource_type === 'video' && (
                <div className="space-y-2">
                  <Label>Link de YouTube</Label>
                  <Input 
                    required 
                    placeholder="https://www.youtube.com/watch?v=..." 
                    value={formData.youtube_url}
                    onChange={e => setFormData({...formData, youtube_url: e.target.value})}
                    className="rounded-xl h-12"
                  />
                </div>
              )}

              {formData.resource_type === 'link' && (
                <div className="space-y-2">
                  <Label>URL del Enlace</Label>
                  <Input 
                    required 
                    placeholder="https://ejemplo.com/recurso" 
                    value={formData.external_link}
                    onChange={e => setFormData({...formData, external_link: e.target.value})}
                    className="rounded-xl h-12"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Nombre del Recurso</Label>
                <Input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="rounded-xl h-12" />
              </div>

              <div className="space-y-2">
                <Label>Categoría</Label>
                <select 
                  value={formData.category} 
                  onChange={e => setFormData({...formData, category: e.target.value})}
                  className="w-full h-12 px-4 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {resourceCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              
              <Button type="submit" disabled={isSubmitting} className="w-full h-14 rounded-xl font-bold bg-primary text-white text-lg">
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Publicar Recurso"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-50 flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input placeholder="Buscar recursos..." className="w-full h-12 pl-12 pr-4 rounded-xl border border-slate-100 bg-slate-50/50" />
          </div>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead className="pl-8 py-4">Nombre del Recurso</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Descargas</TableHead>
                <TableHead className="text-right pr-8">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {resources.map((res) => (
                <TableRow key={res.id} className="hover:bg-slate-50 transition-colors">
                  <TableCell className="pl-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                        {res.resource_type === 'video' ? <Play className="w-5 h-5" /> : 
                         res.resource_type === 'link' ? <Globe className="w-5 h-5" /> : 
                         <FileText className="w-5 h-5" />}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{res.title}</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{res.resource_type || 'Documento'}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold uppercase tracking-widest">{res.category}</span>
                  </TableCell>
                  <TableCell className="text-slate-500 font-medium text-xs">
                    {new Date(res.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right pr-8">
                    <div className="flex items-center justify-end gap-2">
                      <a 
                        href={res.file_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center h-10 w-10 rounded-xl hover:bg-slate-100 text-slate-400"
                      >
                        <Eye className="w-5 h-5" />
                      </a>
                      <Button variant="ghost" size="icon" onClick={() => openEditModal(res)} className="h-10 w-10 rounded-xl text-slate-400 hover:text-primary">
                        <Edit2 className="w-5 h-5" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteResource(res.id)} className="h-10 w-10 rounded-xl text-slate-400 hover:text-red-500">
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {resources.length === 0 && (
                <TableRow><TableCell colSpan={4} className="text-center py-20 text-slate-400">No hay recursos subidos aún.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
