"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, AlertCircle } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { getContentPostById } from "@/lib/content/content-repository";
import { ContentPostWithRelations } from "@/lib/content/types";
import { ContentEditor } from "@/components/content/ContentEditor";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function AdminEditarContenidoPage({ params }: PageProps) {
  const { id } = use(params);
  const [post, setPost] = useState<ContentPostWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    async function loadPost() {
      try {
        setErrorMsg(null);
        const supabase = createClient();
        const data = await getContentPostById(supabase, id);
        if (!isCancelled) {
          if (!data) {
            setErrorMsg("La publicación solicitada no existe o fue eliminada.");
          } else {
            setPost(data);
          }
          setLoading(false);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          const msg =
            err instanceof Error
              ? err.message
              : "Error al cargar la publicación.";
          setErrorMsg(msg);
          setLoading(false);
        }
      }
    }

    loadPost();

    return () => {
      isCancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="p-12 max-w-7xl mx-auto text-center">
        <div className="bg-white rounded-2xl border border-slate-200 p-12 shadow-sm space-y-3">
          <div className="inline-block p-3 rounded-full bg-slate-100 mb-2">
            <RefreshCw className="w-6 h-6 text-[#006666] animate-spin" />
          </div>
          <p className="text-sm font-medium text-slate-600">
            Cargando la publicación y sus bloques...
          </p>
        </div>
      </div>
    );
  }

  if (errorMsg || !post) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center space-y-4">
          <div className="inline-block p-3 rounded-full bg-rose-50 text-rose-600">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            No se pudo abrir la publicación
          </h2>
          <p className="text-sm text-slate-600 max-w-md mx-auto">
            {errorMsg || "La publicación no fue encontrada."}
          </p>
          <div>
            <Link
              href="/admin/contenidos"
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#006666] text-white text-xs font-semibold rounded-xl hover:bg-[#004d4d] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Volver a Contenidos</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <ContentEditor initialPost={post} isEditing={true} />;
}
