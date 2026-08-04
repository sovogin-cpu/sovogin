"use client";

import React, { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { createSignedMediaUrlForPublicContent } from "@/lib/content/public-content-service";

interface PublicMediaProps {
  mediaId: string;
  alt?: string;
  caption?: string;
  className?: string;
  aspectRatio?: string;
}

export const PublicMedia: React.FC<PublicMediaProps> = ({
  mediaId,
  alt = "Imagen de SOVOGIN",
  caption,
  className = "w-full h-full object-cover",
  aspectRatio,
}) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadMedia() {
      if (!mediaId) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const supabase = createClient();
        const url = await createSignedMediaUrlForPublicContent(supabase, mediaId);
        if (isMounted) {
          setSignedUrl(url);
          setLoading(false);
        }
      } catch {
        if (isMounted) setLoading(false);
      }
    }

    loadMedia();

    return () => {
      isMounted = false;
    };
  }, [mediaId]);

  if (loading) {
    return (
      <div
        className={`bg-slate-100 animate-pulse rounded-xl flex items-center justify-center ${
          aspectRatio || "h-48 w-full"
        }`}
      >
        <span className="text-xs text-slate-400">Cargando imagen...</span>
      </div>
    );
  }

  if (!signedUrl) {
    return (
      <div
        className={`bg-slate-100 rounded-xl flex flex-col items-center justify-center text-slate-400 text-xs p-4 border border-slate-200 ${
          aspectRatio || "h-48 w-full"
        }`}
      >
        <ImageOff className="w-6 h-6 mb-1 text-slate-300" />
        <span>Imagen no disponible</span>
      </div>
    );
  }

  return (
    <figure className="space-y-1 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={signedUrl} alt={alt} className={className} />
      {caption && (
        <figcaption className="text-xs text-slate-500 italic text-center pt-1">
          {caption}
        </figcaption>
      )}
    </figure>
  );
};
