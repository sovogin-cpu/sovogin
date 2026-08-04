"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  FileText,
  Copy,
  Archive,
  Eye,
  Check,
  Lock,
  Globe,
  Loader2,
  Edit2,
  Calendar,
  HardDrive,
  FileSpreadsheet,
  FileCode,
  Image as ImageIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MediaItem } from "@/lib/media/types";
import { classifyMediaType, formatBytes } from "@/lib/media/file-utils";
import { createClient } from "@/utils/supabase/client";
import { createSignedMediaUrl } from "@/lib/media/media-repository";

interface MediaCardProps {
  item: MediaItem;
  onPreview: (item: MediaItem, signedUrl: string) => void;
  onArchive: (item: MediaItem) => void;
  onEdit?: (item: MediaItem) => void;
}

export function MediaCard({ item, onPreview, onArchive, onEdit }: MediaCardProps) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const supabase = useMemo(() => createClient(), []);

  const mediaType = classifyMediaType(item.mime_type);

  useEffect(() => {
    let isMounted = true;

    async function loadSignedUrl() {
      try {
        setLoadingUrl(true);
        const url = await createSignedMediaUrl(supabase, item.storage_path, 3600);
        if (isMounted) {
          setSignedUrl(url);
        }
      } catch (err: unknown) {
        console.error("Error generating signed URL for card:", err);
      } finally {
        if (isMounted) {
          setLoadingUrl(false);
        }
      }
    }

    void loadSignedUrl();

    return () => {
      isMounted = false;
    };
  }, [item.storage_path, supabase]);

  const handleCopyUrl = async () => {
    try {
      let urlToCopy = signedUrl;
      if (!urlToCopy) {
        urlToCopy = await createSignedMediaUrl(supabase, item.storage_path, 3600);
        setSignedUrl(urlToCopy);
      }

      await navigator.clipboard.writeText(urlToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch (err: unknown) {
      console.error("Error copying signed URL:", err);
    }
  };

  const getDocumentIcon = () => {
    if (item.mime_type.includes("pdf")) {
      return <FileText className="w-10 h-10 text-red-500" />;
    }
    if (item.mime_type.includes("word")) {
      return <FileText className="w-10 h-10 text-blue-500" />;
    }
    if (item.mime_type.includes("excel") || item.mime_type.includes("spreadsheet")) {
      return <FileSpreadsheet className="w-10 h-10 text-emerald-500" />;
    }
    if (item.mime_type.includes("powerpoint") || item.mime_type.includes("presentation")) {
      return <FileCode className="w-10 h-10 text-amber-500" />;
    }
    return <FileText className="w-10 h-10 text-slate-400" />;
  };

  const formattedDate = new Date(item.created_at).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <Card className="border-none shadow-sm hover:shadow-md transition-all rounded-[2rem] overflow-hidden bg-white border border-slate-100 flex flex-col justify-between group">
      <div>
        {/* Preview Container */}
        <div className="aspect-video relative overflow-hidden bg-slate-100 flex items-center justify-center border-b border-slate-50">
          {mediaType === "image" ? (
            loadingUrl ? (
              <div className="flex items-center gap-2 text-slate-400 text-xs">
                <Loader2 className="w-4 h-4 animate-spin" /> Cargando vista previa...
              </div>
            ) : signedUrl ? (
              <img
                src={signedUrl}
                alt={item.alt_text || item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="flex flex-col items-center gap-1 text-slate-400 text-xs">
                <ImageIcon className="w-8 h-8 opacity-40" /> Sin vista previa
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center p-6 space-y-2 text-center">
              {getDocumentIcon()}
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                .{item.file_extension || "file"}
              </span>
            </div>
          )}

          {/* Badges Over Image */}
          <div className="absolute top-3 left-3 flex items-center gap-1.5">
            <span
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 backdrop-blur-md shadow-sm ${
                item.visibility === "public"
                  ? "bg-emerald-500/90 text-white"
                  : "bg-amber-500/90 text-white"
              }`}
            >
              {item.visibility === "public" ? (
                <>
                  <Globe className="w-3 h-3" /> Pública
                </>
              ) : (
                <>
                  <Lock className="w-3 h-3" /> Privada
                </>
              )}
            </span>

            {item.status === "archived" && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-800/90 text-slate-200">
                Archivado
              </span>
            )}
          </div>

          {/* Action Overlay */}
          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-[2px]">
            {signedUrl && (
              <button
                onClick={() => onPreview(item, signedUrl)}
                className="p-3 bg-white text-slate-800 rounded-2xl shadow-lg hover:bg-primary hover:text-white transition-all transform hover:scale-110"
                title="Previsualizar"
              >
                <Eye className="w-4 h-4" />
              </button>
            )}
            {onEdit && (
              <button
                onClick={() => onEdit(item)}
                className="p-3 bg-white text-slate-800 rounded-2xl shadow-lg hover:bg-primary hover:text-white transition-all transform hover:scale-110"
                title="Editar metadatos"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => onArchive(item)}
              className="p-3 bg-white text-slate-800 rounded-2xl shadow-lg hover:bg-red-500 hover:text-white transition-all transform hover:scale-110"
              title="Archivar"
            >
              <Archive className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Card Body */}
        <CardContent className="p-6 space-y-4">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-md truncate max-w-[150px]">
                {item.media_categories?.name || "Sin categoría"}
              </span>
              <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 shrink-0">
                <HardDrive className="w-3 h-3" /> {formatBytes(item.file_size_bytes)}
              </span>
            </div>

            <h3
              className="font-bold text-slate-900 text-base leading-snug line-clamp-1 group-hover:text-primary transition-colors"
              title={item.title}
            >
              {item.title}
            </h3>

            {item.description && (
              <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                {item.description}
              </p>
            )}
          </div>

          <div className="pt-2 border-t border-slate-50 flex items-center justify-between text-[11px] text-slate-400">
            <span className="truncate max-w-[140px]" title={item.original_filename}>
              {item.original_filename}
            </span>
            <span className="flex items-center gap-1 shrink-0">
              <Calendar className="w-3 h-3" /> {formattedDate}
            </span>
          </div>
        </CardContent>
      </div>

      {/* Copy Signed URL Button Footer */}
      <div className="px-6 pb-6 pt-0 space-y-2">
        <Button
          type="button"
          variant="outline"
          onClick={handleCopyUrl}
          className={`w-full h-10 rounded-xl font-bold text-xs gap-2 transition-all ${
            copied
              ? "bg-emerald-50 text-emerald-600 border-emerald-200"
              : "border-slate-200 text-slate-700 hover:border-primary hover:text-primary"
          }`}
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5" /> Enlace copiado (1 hora)
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" /> Copiar Enlace Firmado
            </>
          )}
        </Button>
        {copied && (
          <p className="text-[10px] text-emerald-600 text-center font-medium">
            ¡Enlace seguro copiado! Válido por 60 minutos.
          </p>
        )}
      </div>
    </Card>
  );
}
