"use client";

import React, { useState, useEffect } from "react";
import { 
  Video, 
  Plus, 
  Users, 
  Search, 
  MoreVertical, 
  Play, 
  Settings2, 
  Trash2, 
  CheckCircle2, 
  X,
  Upload,
  AlertCircle,
  Loader2,
  FileText,
  Link as LinkIcon
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export default function LiveEventsAdmin() {
  const supabase = createClient();
  const [lives, setLives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAttendeesModalOpen, setIsAttendeesModalOpen] = useState(false);
  const [selectedLive, setSelectedLive] = useState<any>(null);
  
  // Form states
  const [formData, setFormData] = useState({
    title: "",
    youtube_video_id: "",
    youtube_chat_id: "",
    banner_url: "",
    is_active: true
  });

  // Attendees Bulk Upload
  const [bulkData, setBulkData] = useState("");

  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchLives();
  }, []);

  async function fetchLives() {
    const { data, error } = await supabase
      .from('event_lives')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setLives(data);
    setLoading(false);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || e.target.files.length === 0) return;
    
    setUploading(true);
    const file = e.target.files[0];
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `banners/${fileName}`;

    try {
      const { error: uploadError } = await supabase.storage
        .from('event-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('event-images')
        .getPublicUrl(filePath);

      setFormData({ ...formData, banner_url: publicUrl });
    } catch (error: any) {
      alert("Error al subir imagen: " + error.message);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const payload = { ...formData };
    
    if (selectedLive) {
      const { error } = await supabase.from('event_lives').update(payload).eq('id', selectedLive.id);
      if (!error) setIsModalOpen(false);
    } else {
      const { error } = await supabase.from('event_lives').insert([payload]);
      if (!error) setIsModalOpen(false);
    }
    fetchLives();
  }

  async function handleExcelUpload(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.files || !selectedLive) return;
    
    setUploading(true);
    const file = e.target.files[0];
    console.log("Archivo seleccionado:", file.name, file.size, "bytes");

    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        console.log("FileReader terminó de leer el archivo");
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        console.log("Libro de Excel leído. Hojas:", workbook.SheetNames);

        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        console.log("Filas encontradas en Excel:", jsonData.length);

        if (jsonData.length === 0) {
          alert("El archivo parece estar vacío.");
          setUploading(false);
          return;
        }

        const attendees = jsonData.map((row: any, index: number) => {
          const values = Object.values(row);
          // Try to find columns by name or position
          const name = row.Nombre || row.nombre || row.NAME || row.FullName || values[0];
          const email = row.Email || row.email || row.EMAIL || values[1];
          const doc = row.Documento || row.documento || row.Cedula || row.cedula || row.DOCUMENTO || row.Identification || values[2];

          if (index === 0) console.log("Ejemplo de mapeo Fila 1:", { name, email, doc });

          return {
            event_live_id: selectedLive.id,
            name: name?.toString().trim() || "Sin Nombre",
            email: email?.toString().trim().toLowerCase() || "",
            document_number: doc?.toString().trim() || ""
          };
        }).filter(a => a.email && a.document_number);

        // Filter out duplicates within the same file/list to avoid Postgres "cannot affect row a second time" error
        const uniqueAttendees = Array.from(new Map(attendees.map(item => [item.email, item])).values());

        console.log("Asistentes únicos procesados para subir:", uniqueAttendees.length);

        if (uniqueAttendees.length === 0) {
          alert("No se encontraron registros con Email y Documento válidos. Verifique que el archivo tenga datos.");
          setUploading(false);
          return;
        }

        const { error } = await supabase
          .from('event_attendees')
          .upsert(uniqueAttendees, { onConflict: 'event_live_id,email' });
        
        if (error) {
          console.error("Error de Supabase:", error);
          alert("Error de base de datos: " + error.message);
        } else {
          alert(`${attendees.length} asistentes cargados con éxito.`);
          setIsAttendeesModalOpen(false);
          setBulkData("");
        }
      } catch (err: any) {
        console.error("Error crítico en handleExcelUpload:", err);
        alert("Error al procesar el archivo Excel: " + err.message);
      } finally {
        setUploading(false);
        // Reset the input value so the same file can be selected again
        e.target.value = "";
      }
    };

    reader.onerror = (err) => {
      console.error("Error de FileReader:", err);
      alert("Error al leer el archivo.");
      setUploading(false);
    };

    reader.readAsArrayBuffer(file);
  }

  async function handleBulkUpload() {
    if (!selectedLive || !bulkData) return;
    
    // Parse TSV/Excel data: Name \t Email \t Doc
    const rows = bulkData.split('\n').filter(r => r.trim());
    const attendees = rows.map(row => {
      const parts = row.split('\t');
      return {
        event_live_id: selectedLive.id,
        name: parts[0]?.trim(),
        email: parts[1]?.trim()?.toLowerCase(),
        document_number: parts[2]?.trim()
      };
    }).filter(a => a.email && a.document_number);

    // Filter out duplicates within the same list
    const uniqueAttendees = Array.from(new Map(attendees.map(item => [item.email, item])).values());

    const { error } = await supabase
      .from('event_attendees')
      .upsert(uniqueAttendees, { onConflict: 'event_live_id,email' });
    
    if (error) {
      alert("Error al cargar: " + error.message);
    } else {
      alert(`${attendees.length} asistentes cargados con éxito.`);
      setIsAttendeesModalOpen(false);
      setBulkData("");
    }
  }

  async function deleteLive(id: string) {
    if (!confirm("¿Eliminar esta transmisión? Se borrarán también los inscritos.")) return;
    await supabase.from('event_lives').delete().eq('id', id);
    fetchLives();
  }

  const copyLiveLink = (id: string) => {
    const url = `${window.location.origin}/eventos/live/${id}`;
    navigator.clipboard.writeText(url);
    alert("Enlace copiado al portapapeles");
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-heading">Transmisiones en Vivo</h1>
          <p className="text-slate-500">Configura los accesos y links para tus eventos streaming.</p>
        </div>
        
        <button 
          onClick={() => { 
            setSelectedLive(null); 
            setFormData({ title: "", youtube_video_id: "", youtube_chat_id: "", banner_url: "", is_active: true }); 
            setIsModalOpen(true);
          }} 
          className={cn(buttonVariants({ variant: "default" }), "rounded-2xl h-14 px-8 bg-primary hover:bg-primary/90 text-white font-bold gap-2 shadow-lg shadow-primary/20")}
        >
          <Plus className="w-5 h-5" />
          Nueva Transmisión
        </button>

        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogContent className="sm:max-w-[500px] rounded-[2rem] border-none shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold font-heading">
                {selectedLive ? "Editar Transmisión" : "Crear Transmisión"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">Título del Evento</label>
                <Input 
                  required 
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  placeholder="Ej. Simposio Nacional de Ginecología" 
                  className="h-12 rounded-xl bg-slate-50 border-slate-200"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">YouTube Video ID</label>
                  <Input 
                    required 
                    value={formData.youtube_video_id}
                    onChange={e => setFormData({...formData, youtube_video_id: e.target.value})}
                    placeholder="Ej. dQw4w9WgXcQ" 
                    className="h-12 rounded-xl bg-slate-50 border-slate-200"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700 ml-1">YouTube Chat ID</label>
                  <Input 
                    value={formData.youtube_chat_id}
                    onChange={e => setFormData({...formData, youtube_chat_id: e.target.value})}
                    placeholder="Opcional" 
                    className="h-12 rounded-xl bg-slate-50 border-slate-200"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 ml-1">Banner del Evento</label>
                <div className="flex flex-col gap-4">
                  {formData.banner_url && (
                    <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-100 shadow-sm">
                      <img src={formData.banner_url} alt="Banner Preview" className="w-full h-full object-cover" />
                      <button 
                        type="button" 
                        onClick={() => setFormData({...formData, banner_url: ""})}
                        className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 shadow-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <div className="relative">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileUpload}
                      className="hidden" 
                      id="banner-upload" 
                      disabled={uploading}
                    />
                    <label 
                      htmlFor="banner-upload" 
                      className={cn(
                        "flex items-center justify-center gap-2 h-14 w-full rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 text-slate-500 font-bold cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all",
                        uploading && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Subiendo...
                        </>
                      ) : (
                        <>
                          <Upload className="w-5 h-5" />
                          {formData.banner_url ? "Cambiar Imagen" : "Subir Imagen de Banner"}
                        </>
                      )}
                    </label>
                  </div>
                </div>
              </div>
              <Button type="submit" className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold text-lg">
                {selectedLive ? "Guardar Cambios" : "Publicar Transmisión"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {lives.map((live) => (
          <div key={live.id} className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden group hover:shadow-xl transition-all duration-300">
            <div className="aspect-video bg-slate-900 relative">
              <img 
                src={live.banner_url || "/img/1.jpeg"} 
                className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-500" 
                alt="" 
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white ring-4 ring-white/10 group-hover:scale-110 transition-transform">
                  <Play className="w-8 h-8 fill-current" />
                </div>
              </div>
              <div className="absolute top-4 right-4">
                <Badge className={live.is_active ? "bg-emerald-500" : "bg-slate-400"}>
                  {live.is_active ? "Activo" : "Inactivo"}
                </Badge>
              </div>
            </div>
            
            <div className="p-8 space-y-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900 leading-tight mb-2">{live.title}</h3>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                  <Video className="w-4 h-4" />
                  <span>ID: {live.youtube_video_id}</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => { setSelectedLive(live); setIsAttendeesModalOpen(true); }}
                    className="h-10 w-10 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100"
                    title="Gestionar Asistentes"
                  >
                    <Users className="w-5 h-5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => copyLiveLink(live.id)}
                    className="h-10 w-10 rounded-xl bg-primary/5 text-primary hover:bg-primary/10"
                    title="Copiar Enlace del Evento"
                  >
                    <LinkIcon className="w-5 h-5" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => { setSelectedLive(live); setFormData(live); setIsModalOpen(true); }}
                    className="h-10 w-10 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100"
                    title="Editar"
                  >
                    <Settings2 className="w-5 h-5" />
                  </Button>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => deleteLive(live.id)}
                  className="h-10 w-10 rounded-xl bg-red-50 text-red-600 hover:bg-red-100"
                  title="Eliminar"
                >
                  <Trash2 className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Attendees Modal */}
      <Dialog open={isAttendeesModalOpen} onOpenChange={setIsAttendeesModalOpen}>
        <DialogContent className="sm:max-w-[600px] rounded-[2rem] border-none shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold font-heading flex items-center gap-3">
              <Users className="w-6 h-6 text-primary" />
              Gestión de Inscritos
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 space-y-3">
                <div className="flex items-center gap-2 text-emerald-700 font-bold">
                  <FileText className="w-5 h-5" />
                  Archivo Excel (.xlsx)
                </div>
                <p className="text-[10px] text-emerald-600/80 leading-relaxed">
                  Sube un archivo con columnas: <br/>
                  <strong>Nombre, Email, Documento</strong>
                </p>
                <div className="relative">
                  <input 
                    type="file" 
                    accept=".xlsx, .xls" 
                    onChange={handleExcelUpload}
                    className="hidden" 
                    id="excel-upload" 
                  />
                  <label 
                    htmlFor="excel-upload" 
                    className={cn(
                      "flex items-center justify-center gap-2 h-10 w-full rounded-xl bg-emerald-500 text-white font-bold text-xs cursor-pointer hover:bg-emerald-600 transition-all shadow-md shadow-emerald-200",
                      uploading && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Seleccionar Archivo
                      </>
                    )}
                  </label>
                </div>
              </div>

              <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 space-y-3">
                <div className="flex items-center gap-2 text-blue-700 font-bold">
                  <Upload className="w-5 h-5" />
                  Copiar y Pegar
                </div>
                <p className="text-[10px] text-blue-600/80 leading-relaxed">
                  Pega directamente desde Excel:<br />
                  <span className="font-mono bg-blue-100 px-1 rounded">Nombre [TAB] Email [TAB] Doc</span>
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 ml-1">O pega los datos aquí manualmente:</label>
              <textarea 
                value={bulkData}
                onChange={e => setBulkData(e.target.value)}
                placeholder="Juan Perez\tjuan@mail.com\t123456789..."
                className="w-full h-32 p-4 rounded-2xl border border-slate-200 bg-slate-50 font-mono text-xs focus:ring-2 focus:ring-primary/20 outline-none"
              />
            </div>

            <div className="flex gap-3">
              <Button onClick={() => setIsAttendeesModalOpen(false)} variant="outline" className="flex-1 h-14 rounded-2xl font-bold">
                Cancelar
              </Button>
              <Button onClick={handleBulkUpload} className="flex-1 h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold gap-2">
                <CheckCircle2 className="w-5 h-5" />
                Cargar Asistentes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
