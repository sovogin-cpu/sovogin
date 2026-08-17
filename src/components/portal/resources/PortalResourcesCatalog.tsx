"use client";

import React, { useState, useEffect } from "react";
import {
  BookOpen,
  FileText,
  Download,
  Search,
  Filter,
  Video,
  Globe,
  Play,
  Loader2,
  AlertCircle,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface PortalResourceItem {
  id: string;
  title: string;
  category: string;
  resource_type: string;
  file_url: string;
  description?: string | null;
  format?: string | null;
  visibility?: string | null;
  created_at: string;
  signedUrl?: string | null;
}

export const PortalResourcesCatalog: React.FC = () => {
  const [resources, setResources] = useState<PortalResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    "Otro",
  ];

  useEffect(() => {
    async function loadResources() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch("/api/portal/resources");
        const data = await res.json();

        if (!res.ok || !data.success) {
          setError(data.error || "No se pudieron cargar los recursos de la biblioteca.");
          return;
        }

        setResources(data.resources || []);
      } catch (err: unknown) {
        console.error("Error al cargar recursos:", err);
        setError("Error de conexión al cargar la biblioteca de recursos.");
      } finally {
        setLoading(false);
      }
    }

    void loadResources();
  }, []);

  const filteredResources = resources.filter((res) => {
    const matchesSearch =
      res.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (res.description && res.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory =
      selectedCategory === "Todas" || res.category === selectedCategory;
    const matchesType =
      selectedType === "Todos" || res.resource_type === selectedType;
    return matchesSearch && matchesCategory && matchesType;
  });

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-slate-300">
        <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
        <span className="text-xs font-bold uppercase tracking-wider">
          Cargando biblioteca de recursos exclusivos...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-500/15 border border-rose-500/30 p-8 rounded-3xl text-center space-y-3 max-w-xl mx-auto">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
        <h3 className="text-lg font-bold text-white">Error de Carga</h3>
        <p className="text-xs text-slate-300 leading-relaxed">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-[#006666]/30 border border-slate-800 p-6 md:p-10 rounded-[2.5rem] relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 blur-3xl rounded-full pointer-events-none" />

        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-teal-500/20 border border-teal-500/40 text-teal-300 text-xs font-bold rounded-full uppercase tracking-wider">
            <BookOpen className="w-4 h-4 text-teal-400" />
            Biblioteca Gremiada Privada
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white font-heading">
            Recursos Exclusivos para Asociados
          </h1>
          <p className="text-slate-300 text-xs md:text-sm max-w-2xl leading-relaxed">
            Descarga oficial de actas, guías médicas, protocolos clínicos y grabaciones reservadas para miembros activos de SOVOGIN.
          </p>
        </div>
      </div>

      {/* Grid con Filtros & Lista */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filtros Lateral */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-6 sticky top-28 shadow-sm">
            {/* Buscador */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-300 block uppercase tracking-wider">
                Buscar Recursos
              </span>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Ej. Guía, Acta, Simposio..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-slate-950 border-slate-800 text-white placeholder:text-slate-400 text-xs h-11 rounded-xl focus:border-teal-500"
                />
              </div>
            </div>

            {/* Categorías */}
            <div className="space-y-3 border-t border-slate-800 pt-5">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-2 uppercase tracking-wider">
                <Filter className="w-3.5 h-3.5 text-teal-400" />
                Categorías
              </span>
              <div className="space-y-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all",
                      selectedCategory === cat
                        ? "bg-[#006666] text-white shadow-md font-bold"
                        : "text-slate-400 hover:bg-slate-800 hover:text-white"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Tipo de Material */}
            <div className="space-y-3 border-t border-slate-800 pt-5">
              <span className="text-xs font-bold text-slate-300 block uppercase tracking-wider">
                Tipo de Contenido
              </span>
              <div className="space-y-2">
                {[
                  { id: "Todos", label: "Todos", icon: Globe },
                  { id: "document", label: "Documentos (PDF/Doc)", icon: FileText },
                  { id: "video", label: "Videos / Grabaciones", icon: Play },
                  { id: "link", label: "Enlaces Externos", icon: ExternalLink },
                ].map((type) => (
                  <label key={type.id} className="flex items-center gap-2.5 cursor-pointer text-xs">
                    <input
                      type="radio"
                      name="portal-resource-type"
                      checked={selectedType === type.id}
                      onChange={() => setSelectedType(type.id)}
                      className="w-3.5 h-3.5 accent-[#006666] cursor-pointer"
                    />
                    <span
                      className={cn(
                        "transition-colors",
                        selectedType === type.id ? "text-teal-300 font-bold" : "text-slate-400 hover:text-slate-200"
                      )}
                    >
                      {type.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Lista de Recursos */}
        <div className="lg:col-span-3 space-y-4">
          {filteredResources.length === 0 ? (
            <div className="py-16 text-center text-slate-400 bg-slate-900 rounded-3xl border border-slate-800 space-y-2">
              <Search className="w-10 h-10 mx-auto opacity-30 text-slate-500" />
              <h4 className="text-base font-bold text-white">No se encontraron recursos</h4>
              <p className="text-xs text-slate-400">Intente modificar los filtros de búsqueda seleccionados.</p>
            </div>
          ) : (
            filteredResources.map((res) => {
              const isVideo = res.resource_type === "video";
              const isLink = res.resource_type === "link";
              const targetUrl = res.signedUrl || res.file_url;

              return (
                <div
                  key={res.id}
                  className="bg-slate-900 p-6 rounded-3xl border border-slate-800 hover:border-slate-700 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-6 transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-md",
                        isVideo
                          ? "bg-red-500/15 border-red-500/30 text-red-400"
                          : isLink
                          ? "bg-amber-500/15 border-amber-500/30 text-amber-400"
                          : "bg-teal-500/15 border-teal-500/30 text-teal-300"
                      )}
                    >
                      {isVideo ? (
                        <Video className="w-6 h-6" />
                      ) : isLink ? (
                        <Globe className="w-6 h-6" />
                      ) : (
                        <FileText className="w-6 h-6" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-bold uppercase tracking-wider">
                          {res.category}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          {new Date(res.created_at).toLocaleDateString("es-CO", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>

                      <h4 className="text-base font-bold text-white group-hover:text-teal-300 transition-colors">
                        {res.title}
                      </h4>

                      {res.description && (
                        <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                          {res.description}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0 pt-2 sm:pt-0">
                    <a
                      href={targetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#006666] hover:bg-[#005555] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all"
                    >
                      {isVideo ? (
                        <Play className="w-3.5 h-3.5" />
                      ) : isLink ? (
                        <ExternalLink className="w-3.5 h-3.5" />
                      ) : (
                        <Download className="w-3.5 h-3.5" />
                      )}
                      {isVideo ? "Ver Video" : isLink ? "Visitar Enlace" : "Descargar Recurso"}
                    </a>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
