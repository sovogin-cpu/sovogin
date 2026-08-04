"use client";

import React, { useEffect, useState } from "react";
import {
  ImageIcon,
  Video,
  Quote,
  LayoutTemplate,
  FormInput,
  MapPin,
  Users,
  MousePointerClick,
  FileDown,
} from "lucide-react";
import { ContentBlock } from "@/lib/content/types";
import { formatContentBlockType, getYoutubeEmbedUrl } from "@/lib/content/content-utils";
import { createClient } from "@/utils/supabase/client";
import { createSignedMediaUrl } from "@/lib/media/media-repository";

interface ContentBlockPreviewProps {
  block: ContentBlock;
}

export const ContentBlockPreview: React.FC<ContentBlockPreviewProps> = ({ block }) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSignedUrl() {
      let targetMediaId: string | undefined = undefined;

      if (block.type === "image" || block.type === "attachment") {
        targetMediaId = block.mediaId;
      } else if (block.type === "hero" || block.type === "cta") {
        targetMediaId = block.mediaId;
      }

      if (!targetMediaId) {
        if (isMounted) setSignedUrl(null);
        return;
      }

      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("media_items")
          .select("storage_path")
          .eq("id", targetMediaId)
          .maybeSingle();

        if (data?.storage_path && isMounted) {
          const url = await createSignedMediaUrl(supabase, data.storage_path, 3600);
          if (isMounted) setSignedUrl(url);
        }
      } catch (err: unknown) {
        console.error("Error al cargar la previsualización del bloque:", err);
        if (isMounted) setSignedUrl(null);
      }
    }

    loadSignedUrl();

    return () => {
      isMounted = false;
    };
  }, [block]);

  switch (block.type) {
    case "paragraph":
      return (
        <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
          {block.text || <span className="text-slate-400 italic">Párrafo vacío...</span>}
        </p>
      );

    case "heading":
      return block.level === 2 ? (
        <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-1">
          {block.text || <span className="text-slate-400 italic">Título H2 vacío...</span>}
        </h2>
      ) : (
        <h3 className="text-base font-semibold text-slate-800">
          {block.text || <span className="text-slate-400 italic">Título H3 vacío...</span>}
        </h3>
      );

    case "image":
      return (
        <div className="space-y-1">
          <div className="h-36 w-full max-w-md bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center border border-slate-200">
            {signedUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={signedUrl}
                alt={block.altText || "Imagen del CMS"}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center text-slate-400 text-xs">
                <ImageIcon className="w-6 h-6 mb-1" />
                <span>{block.mediaId ? "Cargando imagen..." : "Sin imagen seleccionada"}</span>
              </div>
            )}
          </div>
          {block.caption && (
            <p className="text-xs text-slate-500 italic">{block.caption}</p>
          )}
        </div>
      );

    case "youtube": {
      const embedUrl = getYoutubeEmbedUrl(block.url);
      return (
        <div className="space-y-1 max-w-md">
          <div className="aspect-video w-full bg-slate-950 rounded-lg overflow-hidden flex items-center justify-center border border-slate-800">
            {embedUrl ? (
              <iframe
                src={embedUrl}
                title={block.caption || "Video de YouTube"}
                className="w-full h-full"
                allowFullScreen
              />
            ) : (
              <div className="flex flex-col items-center text-slate-400 text-xs">
                <Video className="w-8 h-8 text-rose-500 mb-1" />
                <span>URL de YouTube no configurada</span>
              </div>
            )}
          </div>
          {block.caption && (
            <p className="text-xs text-slate-500 italic">{block.caption}</p>
          )}
        </div>
      );
    }

    case "attachment":
      return (
        <div className="inline-flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium text-slate-700">
          <FileDown className="w-4 h-4 text-[#006666]" />
          <span>{block.label || "Archivo adjunto de descarga"}</span>
        </div>
      );

    case "hero":
      return (
        <div className="p-6 bg-slate-900 text-white rounded-xl space-y-2 border border-slate-800">
          <span className="text-[10px] uppercase font-bold text-[#006666] tracking-wider">Hero Banner</span>
          <h2 className="text-xl font-extrabold">{block.title || "Título del Hero"}</h2>
          {block.subtitle && <p className="text-xs text-slate-300">{block.subtitle}</p>}
          <div className="flex gap-2 pt-2">
            {block.primaryButton?.label && (
              <span className="px-3 py-1 bg-[#006666] text-white text-xs font-semibold rounded-md">
                {block.primaryButton.label}
              </span>
            )}
            {block.secondaryButton?.label && (
              <span className="px-3 py-1 bg-white/20 text-white text-xs font-semibold rounded-md">
                {block.secondaryButton.label}
              </span>
            )}
          </div>
        </div>
      );

    case "button":
      return (
        <div className={`flex ${block.alignment === "center" ? "justify-center" : block.alignment === "right" ? "justify-end" : "justify-start"}`}>
          <span className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#006666] text-white font-semibold text-xs rounded-lg shadow-sm">
            <MousePointerClick className="w-3.5 h-3.5" />
            {block.label || "Botón de acción"}
          </span>
        </div>
      );

    case "cta":
      return (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-2">
          <h3 className="font-bold text-sm">{block.title || "Llamado a la acción"}</h3>
          {block.text && <p className="text-xs text-emerald-800">{block.text}</p>}
          {block.buttonLabel && (
            <span className="inline-block px-3 py-1 text-xs font-bold text-white bg-[#006666] rounded-md">
              {block.buttonLabel}
            </span>
          )}
        </div>
      );

    case "quote":
      return (
        <blockquote className="p-4 border-l-4 border-[#006666] bg-slate-50 rounded-r-xl space-y-1">
          <div className="flex items-start gap-2">
            <Quote className="w-4 h-4 text-[#006666] shrink-0 mt-0.5" />
            <p className="text-xs italic text-slate-700">{block.text || "Texto de la cita..."}</p>
          </div>
          {block.author && (
            <footer className="text-[11px] font-bold text-slate-800 pl-6">
              — {block.author} {block.source && <span className="font-normal text-slate-500">({block.source})</span>}
            </footer>
          )}
        </blockquote>
      );

    case "spacer":
      return (
        <div className="py-2 text-center text-[10px] font-mono text-slate-400 bg-slate-100/60 rounded border border-dashed border-slate-200">
          Espaciador ({block.size})
        </div>
      );

    case "divider":
      return <hr className="border-t border-slate-300 my-2" />;

    case "sponsors":
      return (
        <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 flex items-center gap-2 text-xs font-semibold text-slate-700">
          <Users className="w-4 h-4 text-[#006666]" />
          <span>Patrocinadores: {block.title || "Listado activo"} ({block.displayStyle})</span>
        </div>
      );

    case "form":
      return (
        <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 flex items-center gap-2 text-xs font-semibold text-slate-700">
          <FormInput className="w-4 h-4 text-[#006666]" />
          <span>Formulario: Key &quot;{block.formKey}&quot; - {block.title || "Sin título"}</span>
        </div>
      );

    case "map":
      return (
        <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 flex items-center gap-2 text-xs font-semibold text-slate-700">
          <MapPin className="w-4 h-4 text-rose-600" />
          <span>Mapa: {block.address || "Dirección no especificada"}</span>
        </div>
      );

    case "gallery":
      return (
        <div className="p-3 bg-slate-100 rounded-xl border border-slate-200 flex items-center gap-2 text-xs font-semibold text-slate-700">
          <LayoutTemplate className="w-4 h-4 text-[#006666]" />
          <span>Galería: {block.mediaIds.length} imágenes ({block.columns} columnas)</span>
        </div>
      );

    default:
      return (
        <div className="p-2 text-xs text-slate-500 font-mono">
          {formatContentBlockType((block as ContentBlock).type)}
        </div>
      );
  }
};
