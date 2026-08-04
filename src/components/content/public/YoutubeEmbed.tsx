import React from "react";
import { Video } from "lucide-react";
import { getYoutubeEmbedUrl } from "@/lib/content/content-utils";

interface YoutubeEmbedProps {
  url: string;
  caption?: string;
}

export const YoutubeEmbed: React.FC<YoutubeEmbedProps> = ({ url, caption }) => {
  const embedUrl = getYoutubeEmbedUrl(url);

  if (!embedUrl) {
    return (
      <div className="p-6 bg-slate-100 rounded-2xl border border-slate-200 text-center text-slate-500 text-xs space-y-1">
        <Video className="w-6 h-6 text-rose-500 mx-auto mb-1" />
        <p className="font-semibold">Video de YouTube no disponible</p>
      </div>
    );
  }

  return (
    <figure className="space-y-2 my-6">
      <div className="aspect-video w-full rounded-2xl overflow-hidden shadow-md bg-slate-950 border border-slate-800">
        <iframe
          src={embedUrl}
          title={caption || "Video educacional de YouTube"}
          className="w-full h-full border-0"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
      {caption && (
        <figcaption className="text-xs text-slate-500 italic text-center">
          {caption}
        </figcaption>
      )}
    </figure>
  );
};
