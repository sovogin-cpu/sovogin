"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  FileText, 
  Download, 
  Search, 
  Lock, 
  Filter, 
  Video, 
  Globe, 
  Play, 
  Loader2, 
  User, 
  Key, 
  ChevronRight,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";

export default function RecursosPage() {
  const supabase = createClient();
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [accessGranted, setAccessGranted] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const [selectedType, setSelectedType] = useState("Todos");

  // Login Form
  const [credentials, setCredentials] = useState({ email: "", document: "" });
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState("");

  const categories = [
    "Todas",
    "Documentación SOVOGIN", 
    "Simposios", 
    "Charlas", 
    "Lives",
    "Guías Clínicas",
    "Protocolos",
    "Otro"
  ];

  useEffect(() => {
    const savedAccess = sessionStorage.getItem("member_access");
    if (savedAccess === "granted") {
      setAccessGranted(true);
    }
    fetchResources();
  }, []);

  async function fetchResources() {
    const { data } = await supabase
      .from('resources')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setResources(data);
    setLoading(false);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setIsVerifying(true);
    setError("");

    try {
      const { data: associate, error: err } = await supabase
        .from('associates')
        .select('*')
        .eq('email', credentials.email.toLowerCase())
        .eq('document_number', credentials.document.trim())
        .eq('status', 'Activo')
        .single();

      if (associate) {
        setAccessGranted(true);
        sessionStorage.setItem("member_access", "granted");
      } else {
        setError("Credenciales incorrectas o asociado inactivo.");
      }
    } catch (err) {
      setError("Error al verificar credenciales. Verifique sus datos.");
    } finally {
      setIsVerifying(false);
    }
  }

  const filteredResources = resources.filter(res => {
    const matchesSearch = res.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "Todas" || res.category === selectedCategory;
    const matchesType = selectedType === "Todos" || res.resource_type === selectedType;
    return matchesSearch && matchesCategory && matchesType;
  });

  if (!accessGranted) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 pt-20 pb-20">
        <div className="max-w-md w-full relative">
          <div className="absolute inset-0 bg-primary/20 blur-[100px] rounded-full -z-10" />
          <div className="bg-white/5 backdrop-blur-2xl p-10 rounded-[3rem] border border-white/10 shadow-2xl space-y-8">
            <div className="text-center space-y-3">
              <div className="w-20 h-20 bg-primary/20 rounded-3xl flex items-center justify-center mx-auto mb-6 ring-4 ring-primary/10">
                <Lock className="w-10 h-10 text-primary" />
              </div>
              <h1 className="text-3xl font-bold text-white font-heading tracking-tight">Zona de Asociados</h1>
              <p className="text-slate-400 text-sm leading-relaxed">
                Este contenido es exclusivo para miembros activos de SOVOGIN. Ingrese sus datos para continuar.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] ml-1">Email Registrado</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <Input 
                    required
                    type="email"
                    value={credentials.email}
                    onChange={e => setCredentials({...credentials, email: e.target.value})}
                    placeholder="ejemplo@correo.com"
                    className="h-14 pl-12 rounded-2xl bg-white/5 border-white/10 text-white focus:bg-white/10 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] ml-1">Número de Documento</label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <Input 
                    required
                    type="password"
                    value={credentials.document}
                    onChange={e => setCredentials({...credentials, document: e.target.value})}
                    placeholder="••••••••"
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
                {isVerifying ? <Loader2 className="w-6 h-6 animate-spin" /> : (
                  <>
                    Ingresar a Recursos
                    <ChevronRight className="w-5 h-5" />
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen pt-24 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 py-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row justify-between items-center gap-12">
            <div className="max-w-2xl space-y-4">
              <div className="flex items-center gap-3 text-primary font-bold text-sm uppercase tracking-widest">
                <Lock className="w-4 h-4" />
                Acceso Miembro
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-slate-900 tracking-tight font-heading leading-none">
                Biblioteca de Recursos
              </h1>
              <p className="text-xl text-slate-600 font-light">
                Material exclusivo, guías técnicas e investigaciones premium para asociados SOVOGIN.
              </p>
            </div>
            
            <div className="w-full lg:w-96">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input 
                  placeholder="Buscar por título..." 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-12 h-16 rounded-2xl bg-slate-50 border-slate-200 focus:bg-white transition-all shadow-sm" 
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Filters */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8 sticky top-28">
              <div>
                <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2 text-sm uppercase tracking-widest">
                  <Filter className="w-4 h-4 text-primary" />
                  Categorías
                </h3>
                <div className="space-y-1">
                  {categories.map((cat) => (
                    <button 
                      key={cat} 
                      onClick={() => setSelectedCategory(cat)}
                      className={cn(
                        "w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all",
                        selectedCategory === cat 
                          ? "bg-primary/10 text-primary shadow-sm" 
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="pt-8 border-t">
                <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2 text-sm uppercase tracking-widest">
                  Tipo de Material
                </h3>
                <div className="space-y-3">
                  {[
                    {id: "Todos", label: "Todos", icon: Globe},
                    {id: "document", label: "Documentos", icon: FileText},
                    {id: "video", label: "Videos / YouTube", icon: Play},
                    {id: "link", label: "Enlaces", icon: Globe},
                  ].map((type) => (
                    <label key={type.id} className="flex items-center gap-3 cursor-pointer group">
                      <input 
                        type="radio" 
                        name="type"
                        checked={selectedType === type.id}
                        onChange={() => setSelectedType(type.id)}
                        className="w-4 h-4 rounded-full border-slate-300 text-primary focus:ring-primary" 
                      />
                      <span className={cn(
                        "text-sm transition-colors",
                        selectedType === type.id ? "text-primary font-bold" : "text-slate-500 group-hover:text-slate-900"
                      )}>
                        {type.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <Button 
                variant="outline" 
                onClick={() => { sessionStorage.removeItem("member_access"); window.location.reload(); }}
                className="w-full h-12 rounded-xl border-slate-100 text-slate-400 hover:text-red-500 hover:bg-red-50"
              >
                Cerrar Sesión
              </Button>
            </div>
          </div>

          {/* Resources List */}
          <div className="lg:col-span-3 space-y-6">
            {loading ? (
              <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
            ) : filteredResources.length > 0 ? (
              filteredResources.map((res) => {
                const isVideo = res.resource_type === "video";
                const isLink = res.resource_type === "link";
                
                return (
                  <motion.div 
                    layout
                    key={res.id} 
                    className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all flex flex-col md:flex-row md:items-center justify-between group gap-6"
                  >
                    <div className="flex items-center gap-6">
                      <div className={cn(
                        "w-16 h-16 rounded-[1.5rem] flex items-center justify-center shrink-0 shadow-lg transition-transform group-hover:scale-105",
                        isVideo ? "bg-red-50 text-red-600 shadow-red-100" : 
                        isLink ? "bg-amber-50 text-amber-600 shadow-amber-100" : 
                        "bg-blue-50 text-blue-600 shadow-blue-100"
                      )}>
                        {isVideo ? <Video className="w-8 h-8" /> : isLink ? <Globe className="w-8 h-8" /> : <FileText className="w-8 h-8" />}
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                            {res.category}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {new Date(res.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 group-hover:text-primary transition-colors leading-tight">
                          {res.title}
                        </h3>
                        {res.description && (
                          <p className="text-sm text-slate-500 mt-1 line-clamp-1">{res.description}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 md:self-center">
                      <a 
                        href={res.file_url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="h-14 px-8 rounded-2xl bg-slate-50 hover:bg-primary hover:text-white text-slate-600 font-bold text-sm transition-all flex items-center gap-2 whitespace-nowrap border border-slate-100"
                      >
                        {isVideo ? <Play className="w-4 h-4" /> : isLink ? <Globe className="w-4 h-4" /> : <Download className="w-4 h-4" />}
                        {isVideo ? "Ver Video" : isLink ? "Visitar" : "Descargar"}
                      </a>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="py-24 text-center text-slate-500 bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                <Search className="w-12 h-12 mx-auto mb-4 opacity-10" />
                No se encontraron recursos con esos filtros.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
