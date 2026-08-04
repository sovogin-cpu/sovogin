"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, FileText, RefreshCw, AlertCircle } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import {
  archiveContentPost,
  listContentPosts,
} from "@/lib/content/content-repository";
import {
  ContentPostFilters as ContentPostFiltersType,
  ContentPostWithRelations,
} from "@/lib/content/types";
import { ContentPostCard } from "@/components/content/ContentPostCard";
import { ContentPostFilters } from "@/components/content/ContentPostFilters";

export default function AdminContenidosPage() {
  const [posts, setPosts] = useState<ContentPostWithRelations[]>([]);
  const [filters, setFilters] = useState<ContentPostFiltersType>({});
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    let isCancelled = false;

    async function loadPosts() {
      try {
        setErrorMsg(null);
        const supabase = createClient();
        const data = await listContentPosts(supabase, filters);
        if (!isCancelled) {
          setPosts(data);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          const msg =
            err instanceof Error
              ? err.message
              : "Ocurrió un error al cargar el listado de publicaciones.";
          setErrorMsg(msg);
          setLoading(false);
        }
      }
    }

    loadPosts();

    return () => {
      isCancelled = true;
    };
  }, [filters, refreshIndex]);

  const handleFilterChange = (newFilters: ContentPostFiltersType) => {
    setLoading(true);
    setFilters(newFilters);
  };

  const handleReload = () => {
    setLoading(true);
    setRefreshIndex((prev) => prev + 1);
  };

  const handleArchivePost = async (id: string) => {
    try {
      const supabase = createClient();
      await archiveContentPost(supabase, id);
      handleReload();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Error al archivar la publicación.";
      setErrorMsg(msg);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="w-7 h-7 text-[#006666]" />
            <h1 className="text-2xl font-bold text-slate-900">Contenidos CMS</h1>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Gestión unificada de publicaciones para los canales de Innovación, Comunidad, Noticias y Beneficios.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleReload}
            disabled={loading}
            className="p-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
            title="Recargar publicaciones"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>

          <Link
            href="/admin/contenidos/nuevo"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#006666] hover:bg-[#004d4d] text-white font-semibold text-sm rounded-xl transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span>Nueva publicación</span>
          </Link>
        </div>
      </div>

      {/* Error Message */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-start gap-3 text-sm font-medium">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Filter Component */}
      <ContentPostFilters
        filters={filters}
        onChange={handleFilterChange}
        resultCount={posts.length}
      />

      {/* Content Posts List / Grid */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="inline-block p-3 rounded-full bg-slate-100 mb-3">
            <RefreshCw className="w-6 h-6 text-[#006666] animate-spin" />
          </div>
          <p className="text-sm font-medium text-slate-600">
            Cargando publicaciones del CMS...
          </p>
        </div>
      ) : posts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm space-y-3">
          <div className="inline-block p-3 rounded-full bg-slate-100">
            <FileText className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-base font-bold text-slate-800">
            No se encontraron publicaciones
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            No hay publicaciones que coincidan con los filtros seleccionados. Intenta cambiar los criterios de búsqueda o crear una nueva publicación.
          </p>
          <div className="pt-2">
            <Link
              href="/admin/contenidos/nuevo"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#006666] text-white text-sm font-semibold rounded-xl hover:bg-[#004d4d] transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Crear publicación</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <ContentPostCard
              key={post.id}
              post={post}
              onArchive={handleArchivePost}
            />
          ))}
        </div>
      )}
    </div>
  );
}
