"use client";

import React, { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
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
  ShieldCheck,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import { SectionBannerCarousel } from "@/components/banners/SectionBannerCarousel";

interface PublicResource {
  id: string;
  title: string;
  description?: string | null;
  file_url: string;
  resource_type: string;
  format?: string | null;
  category: string;
  visibility?: string | null;
  created_at: string;
}

export default function RecursosPage() {
  const supabase = useMemo(() => createClient(), []);
  const [resources, setResources] = useState<PublicResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const [selectedType, setSelectedType] = useState("Todos");

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
    let isMounted = true;

    async function checkAuthAndFetchResources() {
      // 1. Verificar si hay sesión Auth activa en el cliente Supabase
      const { data: authData } = await supabase.auth.getSession();
      if (isMounted && authData?.session) {
        setIsLoggedIn(true);
      }

      // 2. Consultar catálogo público (visibility = 'public')
      const { data, error } = await supabase
        .from('resources')
        .select('*')
        .eq('visibility', 'public')
        .order('created_at', { ascending: false });

      if (isMounted) {
        if (!error && data) setResources(data as PublicResource[]);
        setLoading(false);
      }
    }

    void checkAuthAndFetchResources();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  const filteredResources = resources.filter(res => {
    const matchesSearch = res.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "Todas" || res.category === selectedCategory;
    const matchesType = selectedType === "Todos" || res.resource_type === selectedType;
    return matchesSearch && matchesCategory && matchesType;
  });

  return (
    <div className="bg-slate-50 min-h-screen pt-24 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 py-16">
        <div className="container mx-auto px-4 space-y-8">
          <SectionBannerCarousel position="RESOURCES_HEADER" />

          <div className="flex flex-col lg:flex-row justify-between items-center gap-12">
            <div className="max-w-2xl space-y-4">
              <div className="flex items-center gap-3 text-[#006666] font-bold text-sm uppercase tracking-widest">
                <Globe className="w-4 h-4" />
                Catálogo Público de Recursos
              </div>
              <h1 className="text-4xl md:text-6xl font-bold text-slate-900 tracking-tight font-heading leading-none">
                Biblioteca Abierta
              </h1>
              <p className="text-xl text-slate-600 font-light">
                Documentación científica, guías clínicas e información técnica de acceso abierto para la comunidad médica.
              </p>
            </div>

            <div className="w-full lg:w-96">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="Buscar por título..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-12 h-16 rounded-2xl bg-slate-50 border-slate-200 focus:bg-white transition-all shadow-sm text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-12 space-y-12">
        {/* Banner Promocional para Zona de Asociados */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-[2.5rem] p-8 md:p-10 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-8 border border-slate-700/50">
          <div className="space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-500/10 border border-teal-500/20 text-teal-300 rounded-full text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Contenido Exclusivo para Miembros</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold font-heading">
              ¿Buscas material especializado o de uso exclusivo?
            </h2>
            <p className="text-slate-300 text-sm font-light">
              Los asociados activos de SOVOGIN cuentan con acceso a investigaciones privadas, recursos descargables y convenios en su Portal del Asociado.
            </p>
          </div>

          <div className="shrink-0">
            {isLoggedIn ? (
              <Link href="/portal/recursos">
                <Button className="h-14 px-8 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm shadow-lg shadow-teal-900/40 gap-2">
                  <span>Ir a Recursos del Portal</span>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </Link>
            ) : (
              <Link href="/portal/login?redirectTo=/portal/recursos">
                <Button className="h-14 px-8 rounded-2xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm shadow-lg shadow-teal-900/40 gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Iniciar Sesión en el Portal</span>
                </Button>
              </Link>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar Filters */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8 sticky top-28">
              <div>
                <h3 className="font-bold text-slate-900 mb-6 flex items-center gap-2 text-sm uppercase tracking-widest">
                  <Filter className="w-4 h-4 text-[#006666]" />
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
                          ? "bg-[#006666]/10 text-[#006666] shadow-sm font-semibold"
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
                        className="w-4 h-4 rounded-full border-slate-300 text-[#006666] focus:ring-[#006666]"
                      />
                      <span className={cn(
                        "text-sm transition-colors",
                        selectedType === type.id ? "text-[#006666] font-bold" : "text-slate-500 group-hover:text-slate-900"
                      )}>
                        {type.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Resources List */}
          <div className="lg:col-span-3 space-y-6">
            {loading ? (
              <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-[#006666]" /></div>
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
                        <h3 className="text-xl font-bold text-slate-900 group-hover:text-[#006666] transition-colors leading-tight">
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
                        className="h-14 px-8 rounded-2xl bg-slate-50 hover:bg-[#006666] hover:text-white text-slate-600 font-bold text-sm transition-all flex items-center gap-2 whitespace-nowrap border border-slate-100"
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
                No se encontraron recursos públicos con esos filtros.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
