"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Send,
  Archive,
  ExternalLink,
  AlertCircle,
  CheckCircle2,
  FileCode2,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import {
  archiveContentPost,
  createContentPost,
  updateContentPost,
} from "@/lib/content/content-repository";
import {
  ContentBlock,
  ContentChannel,
  ContentDocumentMode,
  ContentPostStatus,
  ContentPostWithRelations,
  ContentVisibility,
} from "@/lib/content/types";
import {
  createEmptyParagraphBlock,
  parseContentBlocks,
} from "@/lib/content/block-schema";
import {
  normalizeContentSlug,
  slugifyContentTitle,
} from "@/lib/content/content-utils";
import { ContentEditor as VisualContentEditor } from "@/components/content-editor/ContentEditor";
import { ContentPostSettings } from "./ContentPostSettings";

interface ContentEditorProps {
  initialPost?: ContentPostWithRelations | null;
  isEditing?: boolean;
}

export const ContentEditor: React.FC<ContentEditorProps> = ({
  initialPost,
  isEditing = false,
}) => {
  const router = useRouter();

  // Form States
  const [title, setTitle] = useState(initialPost?.title || "");
  const [slug, setSlug] = useState(initialPost?.slug || "");
  const [isSlugManuallyEdited, setIsSlugManuallyEdited] = useState(
    Boolean(initialPost?.slug)
  );
  const [excerpt, setExcerpt] = useState(initialPost?.excerpt || "");
  const [blocks, setBlocks] = useState<ContentBlock[]>(
    initialPost?.content && initialPost.content.length > 0
      ? parseContentBlocks(initialPost.content)
      : [createEmptyParagraphBlock()]
  );
  const [documentMode, setDocumentMode] = useState<ContentDocumentMode>("article");

  // Settings States
  const [channel, setChannel] = useState<ContentChannel>(
    initialPost?.channel || "innovation"
  );
  const [visibility, setVisibility] = useState<ContentVisibility>(
    initialPost?.visibility || "public"
  );
  const [publishedAt, setPublishedAt] = useState<string | null>(
    initialPost?.published_at || null
  );
  const [isFeatured, setIsFeatured] = useState<boolean>(
    initialPost?.is_featured ?? false
  );
  const [featuredMediaId, setFeaturedMediaId] = useState<string | null>(
    initialPost?.featured_media_id || null
  );
  const [categoryIds, setCategoryIds] = useState<string[]>(
    initialPost?.categories?.map((c) => c.id) || []
  );
  const [seoTitle, setSeoTitle] = useState(initialPost?.seo_title || "");
  const [seoDescription, setSeoDescription] = useState(
    initialPost?.seo_description || ""
  );

  // Status & Feedback States
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showConfirmBack, setShowConfirmBack] = useState(false);
  const [showConfirmArchive, setShowConfirmArchive] = useState(false);

  const markDirty = () => {
    if (!isDirty) setIsDirty(true);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitle(val);
    markDirty();

    if (!isSlugManuallyEdited) {
      setSlug(slugifyContentTitle(val));
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsSlugManuallyEdited(true);
    setSlug(normalizeContentSlug(e.target.value));
    markDirty();
  };

  const handleSave = async (targetStatus: ContentPostStatus) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setErrorMsg("El título de la publicación es obligatorio.");
      return;
    }

    const finalSlug = normalizeContentSlug(slug || trimmedTitle);
    if (!finalSlug) {
      setErrorMsg("El slug de la publicación no es válido.");
      return;
    }

    const validatedBlocks = parseContentBlocks(blocks);

    let finalPublishedAt = publishedAt;
    if (targetStatus === "published" && !finalPublishedAt) {
      finalPublishedAt = new Date().toISOString();
    }

    try {
      setIsSaving(true);
      const supabase = createClient();

      const payload = {
        channel,
        title: trimmedTitle,
        slug: finalSlug,
        excerpt: excerpt.trim() || undefined,
        content: validatedBlocks,
        featured_media_id: featuredMediaId,
        status: targetStatus,
        visibility,
        published_at: finalPublishedAt,
        seo_title: seoTitle.trim() || undefined,
        seo_description: seoDescription.trim() || undefined,
        is_featured: isFeatured,
        categoryIds,
      };

      if (isEditing && initialPost?.id) {
        await updateContentPost(supabase, initialPost.id, payload);
        setSuccessMsg("Publicación actualizada correctamente.");
      } else {
        const newPost = await createContentPost(supabase, payload);
        setSuccessMsg("Publicación creada correctamente.");
        setIsDirty(false);
        router.push(`/admin/contenidos/${newPost.id}`);
        return;
      }

      setIsDirty(false);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Error al guardar la publicación.";
      setErrorMsg(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!initialPost?.id) return;
    try {
      setIsSaving(true);
      const supabase = createClient();
      await archiveContentPost(supabase, initialPost.id);
      setIsDirty(false);
      router.push("/admin/contenidos");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Error al archivar la publicación.";
      setErrorMsg(msg);
    } finally {
      setIsSaving(false);
      setShowConfirmArchive(false);
    }
  };

  const handleBackClick = () => {
    if (isDirty) {
      setShowConfirmBack(true);
    } else {
      router.push("/admin/contenidos");
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Navigation Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-4 z-30 backdrop-blur-md bg-white/95">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBackClick}
            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
            title="Volver al listado"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">
                {isEditing ? "Editar Publicación" : "Nueva Publicación"}
              </h1>
              {isDirty && (
                <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                  Cambios sin guardar
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500">
              Canal {channel.toUpperCase()} • Modo {documentMode === "article" ? "Editorial" : "Página"}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {isEditing && (
            <button
              type="button"
              onClick={() => setShowConfirmArchive(true)}
              disabled={isSaving}
              className="px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl border border-rose-200 transition-colors"
            >
              <Archive className="w-3.5 h-3.5 inline mr-1" />
              Archivar
            </button>
          )}

          <button
            type="button"
            onClick={() => handleSave("draft")}
            disabled={isSaving}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl border border-slate-200 transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? "Guardando..." : "Guardar Borrador"}</span>
          </button>

          <button
            type="button"
            onClick={() => handleSave("published")}
            disabled={isSaving}
            className="px-4 py-2 text-xs font-semibold text-white bg-[#006666] hover:bg-[#004d4d] rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <Send className="w-4 h-4" />
            <span>Publicar</span>
          </button>

          {isEditing && initialPost?.status === "published" && (
            <a
              href={`/${channel}/${initialPost.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-slate-500 hover:text-[#006666] bg-slate-100 hover:bg-emerald-50 rounded-xl border border-slate-200 transition-colors"
              title="Ver versión pública"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-start gap-3 text-sm font-medium">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-start gap-3 text-sm font-medium">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Post Header Form */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            {/* Document Mode Selector */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 uppercase tracking-wider">
                <FileCode2 className="w-4 h-4 text-[#006666]" />
                <span>Tipo de Documento CMS</span>
              </div>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setDocumentMode("article")}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                    documentMode === "article"
                      ? "bg-white text-[#006666] shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Artículo Editorial
                </button>
                <button
                  type="button"
                  onClick={() => setDocumentMode("page")}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                    documentMode === "page"
                      ? "bg-white text-[#006666] shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Página Completa
                </button>
              </div>
            </div>

            {/* Title */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Título de la Publicación <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={handleTitleChange}
                placeholder="Escribe el título de la publicación..."
                className="w-full px-4 py-2.5 text-base font-bold bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006666] focus:bg-white"
              />
            </div>

            {/* Slug */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Slug (URL Amigable) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={slug}
                onChange={handleSlugChange}
                placeholder="ejemplo-titulo-publicacion"
                className="w-full px-4 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006666] focus:bg-white"
              />
            </div>

            {/* Excerpt */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Extracto / Resumen Corto
              </label>
              <textarea
                value={excerpt}
                onChange={(e) => {
                  setExcerpt(e.target.value);
                  markDirty();
                }}
                rows={2}
                placeholder="Breve introducción visible en tarjetas y listados públicos..."
                className="w-full px-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#006666] focus:bg-white"
              />
            </div>
          </div>

          {/* Visual Block Editor */}
          <VisualContentEditor
            blocks={blocks}
            onChange={(newBlocks) => {
              setBlocks(newBlocks);
              markDirty();
            }}
            mode={documentMode}
          />
        </div>

        {/* Sidebar Column */}
        <div className="lg:col-span-1">
          <ContentPostSettings
            channel={channel}
            onChannelChange={(val) => {
              setChannel(val);
              markDirty();
            }}
            visibility={visibility}
            onVisibilityChange={(val) => {
              setVisibility(val);
              markDirty();
            }}
            publishedAt={publishedAt}
            onPublishedAtChange={(val) => {
              setPublishedAt(val);
              markDirty();
            }}
            isFeatured={isFeatured}
            onIsFeaturedChange={(val) => {
              setIsFeatured(val);
              markDirty();
            }}
            featuredMediaId={featuredMediaId}
            onFeaturedMediaIdChange={(val) => {
              setFeaturedMediaId(val);
              markDirty();
            }}
            categoryIds={categoryIds}
            onCategoryIdsChange={(val) => {
              setCategoryIds(val);
              markDirty();
            }}
            seoTitle={seoTitle}
            onSeoTitleChange={(val) => {
              setSeoTitle(val);
              markDirty();
            }}
            seoDescription={seoDescription}
            onSeoDescriptionChange={(val) => {
              setSeoDescription(val);
              markDirty();
            }}
          />
        </div>
      </div>

      {/* Confirmation Modals */}
      {showConfirmBack && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4 border border-slate-200">
            <h4 className="text-base font-bold text-slate-900">¿Salir sin guardar?</h4>
            <p className="text-sm text-slate-600">
              Tienes cambios no guardados en esta publicación. Si sales ahora, perderás la información modificada.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmBack(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Permanecer aquí
              </button>
              <Link
                href="/admin/contenidos"
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
              >
                Salir de todos modos
              </Link>
            </div>
          </div>
        </div>
      )}

      {showConfirmArchive && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl space-y-4 border border-slate-200">
            <h4 className="text-base font-bold text-slate-900">¿Archivar publicación?</h4>
            <p className="text-sm text-slate-600">
              La publicación cambiará a estado Archivado y no será visible públicamente.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmArchive(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleArchive}
                className="px-4 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg"
              >
                Confirmar Archivado
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
