"use client";

import React, { useEffect, useState } from "react";
import { Plus, FolderTree, RefreshCw, AlertCircle, Edit, CheckCircle2, XCircle } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import {
  createContentCategory,
  listAllContentCategories,
  toggleContentCategoryActive,
  updateContentCategory,
} from "@/lib/content/content-repository";
import { ContentCategory, ContentChannel } from "@/lib/content/types";
import { formatContentChannel } from "@/lib/content/content-utils";
import { ContentCategoryDialog } from "@/components/content/ContentCategoryDialog";

export default function AdminCategoriasPage() {
  const [categories, setCategories] = useState<ContentCategory[]>([]);
  const [channelFilter, setChannelFilter] = useState<ContentChannel | "all">("all");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [categoryToEdit, setCategoryToEdit] = useState<ContentCategory | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadCategories() {
      try {
        setErrorMsg(null);
        const supabase = createClient();
        const data = await listAllContentCategories(supabase, channelFilter);
        if (!isCancelled) {
          setCategories(data);
          setLoading(false);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          const msg =
            err instanceof Error
              ? err.message
              : "Error al cargar las categorías de contenido.";
          setErrorMsg(msg);
          setLoading(false);
        }
      }
    }

    loadCategories();

    return () => {
      isCancelled = true;
    };
  }, [channelFilter, refreshIndex]);

  const handleChannelFilterChange = (newChannel: ContentChannel | "all") => {
    setLoading(true);
    setChannelFilter(newChannel);
  };

  const handleReload = () => {
    setLoading(true);
    setRefreshIndex((prev) => prev + 1);
  };

  const handleOpenCreate = () => {
    setCategoryToEdit(null);
    setDialogOpen(true);
  };

  const handleOpenEdit = (cat: ContentCategory) => {
    setCategoryToEdit(cat);
    setDialogOpen(true);
  };

  const handleSaveCategory = async (payload: {
    channel: ContentChannel | null;
    name: string;
    slug: string;
    description: string | null;
    is_active: boolean;
  }) => {
    const supabase = createClient();
    if (categoryToEdit) {
      await updateContentCategory(supabase, categoryToEdit.id, payload);
    } else {
      await createContentCategory(supabase, payload);
    }
    handleReload();
  };

  const handleToggleActive = async (cat: ContentCategory) => {
    try {
      const supabase = createClient();
      await toggleContentCategoryActive(supabase, cat.id, !cat.is_active);
      handleReload();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Error al cambiar el estado de la categoría.";
      setErrorMsg(msg);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <FolderTree className="w-7 h-7 text-[#006666]" />
            <h1 className="text-2xl font-bold text-slate-900">Categorías CMS</h1>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Organización y taxonomía de publicaciones por canal o globales para el motor de contenidos.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleReload}
            disabled={loading}
            className="p-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
            title="Recargar categorías"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#006666] hover:bg-[#004d4d] text-white font-semibold text-sm rounded-xl transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span>Nueva categoría</span>
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-start gap-3 text-sm font-medium">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Filtrar por canal:
          </span>
          <select
            value={channelFilter}
            onChange={(e) =>
              handleChannelFilterChange(e.target.value as ContentChannel | "all")
            }
            className="px-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006666] font-medium text-slate-800"
          >
            <option value="all">Todas las categorías</option>
            <option value="innovation">Innovación</option>
            <option value="community">A la comunidad</option>
            <option value="news">Noticias</option>
            <option value="benefits">Beneficios</option>
          </select>
        </div>

        <span className="text-xs text-[#006666] font-semibold">
          Total: {categories.length} categorías
        </span>
      </div>

      {/* Table List */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="inline-block p-3 rounded-full bg-slate-100 mb-3">
            <RefreshCw className="w-6 h-6 text-[#006666] animate-spin" />
          </div>
          <p className="text-sm font-medium text-slate-600">
            Cargando categorías CMS...
          </p>
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm space-y-3">
          <FolderTree className="w-8 h-8 text-slate-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">
            No se encontraron categorías
          </h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Aún no has creado categorías para este canal. Puedes agregar la primera usando el botón &quot;Nueva categoría&quot;.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Nombre</th>
                  <th className="py-3.5 px-4">Slug</th>
                  <th className="py-3.5 px-4">Canal</th>
                  <th className="py-3.5 px-4">Descripción</th>
                  <th className="py-3.5 px-4">Estado</th>
                  <th className="py-3.5 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {categories.map((cat) => (
                  <tr key={cat.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {cat.name}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-600">
                      {cat.slug}
                    </td>
                    <td className="py-3.5 px-4">
                      {cat.channel ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {formatContentChannel(cat.channel)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                          Global
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600 max-w-xs truncate">
                      {cat.description || <span className="text-slate-400 italic">Sin descripción</span>}
                    </td>
                    <td className="py-3.5 px-4">
                      {cat.is_active ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Activa</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Inactiva</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleOpenEdit(cat)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-[#006666] bg-emerald-50 hover:bg-emerald-100 rounded-md border border-emerald-200 transition-colors"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>

                      <button
                        onClick={() => handleToggleActive(cat)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md transition-colors border ${
                          cat.is_active
                            ? "text-slate-600 bg-slate-100 hover:bg-slate-200 border-slate-200"
                            : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200"
                        }`}
                      >
                        {cat.is_active ? "Desactivar" : "Activar"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Category Creation / Edit Dialog */}
      <ContentCategoryDialog
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSave={handleSaveCategory}
        categoryToEdit={categoryToEdit}
      />
    </div>
  );
}
