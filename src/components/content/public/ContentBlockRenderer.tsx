"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileDown,
  MousePointerClick,
  Quote as QuoteIcon,
  MapPin,
  Users,
  FormInput,
} from "lucide-react";
import { ContentBlock } from "@/lib/content/types";
import { isValidSafeHref } from "@/lib/content/block-schema";
import { PublicMedia } from "./PublicMedia";
import { YoutubeEmbed } from "./YoutubeEmbed";
import { createClient } from "@/utils/supabase/client";
import { createSignedMediaUrlForPublicContent } from "@/lib/content/public-content-service";

interface ContentBlockRendererProps {
  blocks: ContentBlock[];
}

export const ContentBlockRenderer: React.FC<ContentBlockRendererProps> = ({
  blocks,
}) => {
  if (!blocks || blocks.length === 0) return null;

  return (
    <div className="space-y-6">
      {blocks.map((block) => (
        <SingleBlockRender key={block.id} block={block} />
      ))}
    </div>
  );
};

const SingleBlockRender: React.FC<{ block: ContentBlock }> = ({ block }) => {
  switch (block.type) {
    case "paragraph":
      return (
        <p className="text-slate-700 leading-relaxed text-base whitespace-pre-line">
          {block.text}
        </p>
      );

    case "heading":
      return block.level === 2 ? (
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight mt-8 mb-4 border-b border-slate-100 pb-2">
          {block.text}
        </h2>
      ) : (
        <h3 className="text-xl font-bold text-slate-800 tracking-tight mt-6 mb-3">
          {block.text}
        </h3>
      );

    case "image":
      return block.mediaId ? (
        <div className="my-6">
          <PublicMedia
            mediaId={block.mediaId}
            alt={block.altText || "Imagen del artículo"}
            caption={block.caption}
            className="w-full max-h-[500px] object-cover rounded-2xl shadow-sm"
          />
        </div>
      ) : null;

    case "youtube":
      return <YoutubeEmbed url={block.url} caption={block.caption} />;

    case "attachment":
      return <AttachmentBlockRender mediaId={block.mediaId} label={block.label} />;

    case "hero":
      return (
        <div className="relative p-8 sm:p-12 bg-slate-900 text-white rounded-3xl overflow-hidden my-8 border border-slate-800 shadow-xl">
          {block.mediaId && (
            <div className="absolute inset-0 z-0">
              <PublicMedia
                mediaId={block.mediaId}
                alt={block.title}
                className="w-full h-full object-cover"
              />
              <div
                className={`absolute inset-0 ${
                  block.overlay ? "bg-slate-950/70" : "bg-slate-950/40"
                }`}
              />
            </div>
          )}

          <div
            className={`relative z-10 space-y-4 max-w-2xl ${
              block.alignment === "center"
                ? "mx-auto text-center"
                : block.alignment === "right"
                ? "ml-auto text-right"
                : "text-left"
            }`}
          >
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              {block.title}
            </h1>
            {block.subtitle && (
              <p className="text-base sm:text-lg text-slate-200">
                {block.subtitle}
              </p>
            )}
            <div className="flex flex-wrap gap-3 pt-2">
              {block.primaryButton?.label && isValidSafeHref(block.primaryButton.href) && (
                <Link
                  href={block.primaryButton.href}
                  className="px-6 py-3 bg-[#006666] hover:bg-[#004d4d] text-white font-bold text-sm rounded-xl transition-colors shadow-md"
                >
                  {block.primaryButton.label}
                </Link>
              )}
              {block.secondaryButton?.label && isValidSafeHref(block.secondaryButton.href) && (
                <Link
                  href={block.secondaryButton.href}
                  className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white font-bold text-sm rounded-xl transition-colors backdrop-blur-sm"
                >
                  {block.secondaryButton.label}
                </Link>
              )}
            </div>
          </div>
        </div>
      );

    case "button": {
      if (!isValidSafeHref(block.href)) return null;

      const isExternal = block.href.startsWith("http");

      return (
        <div
          className={`flex my-6 ${
            block.alignment === "center"
              ? "justify-center"
              : block.alignment === "right"
              ? "justify-end"
              : "justify-start"
          }`}
        >
          {isExternal ? (
            <a
              href={block.href}
              target={block.openInNewTab ? "_blank" : "_self"}
              rel={block.openInNewTab ? "noopener noreferrer" : undefined}
              className={`inline-flex items-center gap-2 px-6 py-3 font-bold text-sm rounded-xl transition-all shadow-sm ${
                block.variant === "secondary"
                  ? "bg-slate-800 text-white hover:bg-slate-900"
                  : block.variant === "outline"
                  ? "border-2 border-[#006666] text-[#006666] hover:bg-emerald-50"
                  : "bg-[#006666] text-white hover:bg-[#004d4d]"
              }`}
            >
              <MousePointerClick className="w-4 h-4" />
              <span>{block.label}</span>
            </a>
          ) : (
            <Link
              href={block.href}
              className={`inline-flex items-center gap-2 px-6 py-3 font-bold text-sm rounded-xl transition-all shadow-sm ${
                block.variant === "secondary"
                  ? "bg-slate-800 text-white hover:bg-slate-900"
                  : block.variant === "outline"
                  ? "border-2 border-[#006666] text-[#006666] hover:bg-emerald-50"
                  : "bg-[#006666] text-white hover:bg-[#004d4d]"
              }`}
            >
              <MousePointerClick className="w-4 h-4" />
              <span>{block.label}</span>
            </Link>
          )}
        </div>
      );
    }

    case "gallery": {
      const uniqueMediaIds = Array.from(new Set(block.mediaIds));
      if (uniqueMediaIds.length === 0) return null;

      const gridCols =
        block.columns === 4
          ? "grid-cols-2 sm:grid-cols-4"
          : block.columns === 3
          ? "grid-cols-1 sm:grid-cols-3"
          : "grid-cols-1 sm:grid-cols-2";

      return (
        <div className="space-y-2 my-8">
          <div className={`grid gap-4 ${gridCols}`}>
            {uniqueMediaIds.map((id) => (
              <div key={id} className="overflow-hidden rounded-2xl shadow-sm border border-slate-200">
                <PublicMedia mediaId={id} className="w-full h-48 object-cover" />
              </div>
            ))}
          </div>
          {block.caption && (
            <p className="text-xs text-slate-500 italic text-center pt-1">
              {block.caption}
            </p>
          )}
        </div>
      );
    }

    case "cta":
      return (
        <div
          className={`p-8 rounded-3xl my-8 space-y-4 shadow-sm border ${
            block.style === "dark"
              ? "bg-slate-900 text-white border-slate-800"
              : block.style === "light"
              ? "bg-slate-50 text-slate-900 border-slate-200"
              : "bg-emerald-50 text-emerald-950 border-emerald-200"
          }`}
        >
          <h3 className="text-2xl font-bold">{block.title}</h3>
          {block.text && <p className="text-sm text-slate-600">{block.text}</p>}
          {block.buttonLabel && isValidSafeHref(block.buttonHref) && (
            <div>
              <Link
                href={block.buttonHref}
                className="inline-block px-6 py-3 bg-[#006666] hover:bg-[#004d4d] text-white font-bold text-sm rounded-xl transition-colors shadow-sm"
              >
                {block.buttonLabel}
              </Link>
            </div>
          )}
        </div>
      );

    case "sponsors":
      return <SponsorsBlockRender title={block.title} displayStyle={block.displayStyle} />;

    case "form":
      return (
        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 my-6 text-center space-y-2">
          <FormInput className="w-6 h-6 text-[#006666] mx-auto" />
          <h4 className="font-bold text-slate-800 text-sm">{block.title || "Formulario de Contacto"}</h4>
          {block.description && <p className="text-xs text-slate-500">{block.description}</p>}
          <p className="text-xs text-slate-400 font-medium pt-2">
            Para comunicarte con SOVOGIN, escríbenos a través de nuestra sección de contacto.
          </p>
        </div>
      );

    case "map": {
      const mapQuery =
        block.latitude && block.longitude
          ? `${block.latitude},${block.longitude}`
          : encodeURIComponent(block.address || "SOVOGIN Cali");
      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;

      return (
        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 my-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-100 text-rose-700 rounded-xl">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Ubicación</h4>
              <p className="text-xs text-slate-600">{block.address}</p>
            </div>
          </div>
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-[#006666] text-white font-semibold text-xs rounded-xl hover:bg-[#004d4d] transition-colors shrink-0"
          >
            Abrir en Google Maps
          </a>
        </div>
      );
    }

    case "spacer":
      return (
        <div
          className={
            block.size === "large"
              ? "h-16"
              : block.size === "medium"
              ? "h-8"
              : "h-4"
          }
        />
      );

    case "divider":
      return (
        <hr
          className={`my-8 ${
            block.style === "dashed"
              ? "border-dashed border-slate-300"
              : block.style === "solid"
              ? "border-slate-300"
              : "border-slate-100"
          }`}
        />
      );

    case "quote":
      return (
        <blockquote className="p-6 border-l-4 border-[#006666] bg-slate-50 rounded-r-2xl my-8 space-y-2">
          <div className="flex items-start gap-3">
            <QuoteIcon className="w-6 h-6 text-[#006666] shrink-0" />
            <p className="text-base italic text-slate-800 font-medium">
              &quot;{block.text}&quot;
            </p>
          </div>
          {block.author && (
            <footer className="text-xs font-bold text-slate-900 pl-9">
              — {block.author}{" "}
              {block.source && (
                <span className="font-normal text-slate-500">({block.source})</span>
              )}
            </footer>
          )}
        </blockquote>
      );

    default:
      return null;
  }
};

// -----------------------------------------------------------------------------
// HELPER COMPONENT FOR ATTACHMENTS
// -----------------------------------------------------------------------------

const AttachmentBlockRender: React.FC<{ mediaId: string; label: string }> = ({
  mediaId,
  label,
}) => {
  const [signedUrl, setSignedUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (mediaId) {
      const supabase = createClient();
      createSignedMediaUrlForPublicContent(supabase, mediaId).then((url) => {
        if (isMounted) setSignedUrl(url);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [mediaId]);

  if (!signedUrl) return null;

  return (
    <div className="my-4">
      <a
        href={signedUrl}
        target="_blank"
        rel="noopener noreferrer"
        download
        className="inline-flex items-center gap-3 p-4 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200 text-emerald-950 rounded-2xl font-bold text-sm transition-colors shadow-xs"
      >
        <FileDown className="w-5 h-5 text-[#006666]" />
        <span>{label}</span>
      </a>
    </div>
  );
};

// -----------------------------------------------------------------------------
// HELPER COMPONENT FOR SPONSORS
// -----------------------------------------------------------------------------

const SponsorsBlockRender: React.FC<{
  title?: string;
  displayStyle?: "grid" | "carousel";
}> = ({ title = "Nuestros Patrocinadores" }) => {
  const [sponsors, setSponsors] = useState<Array<{ id: string; name: string; logo_url?: string }>>([]);

  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();
    supabase
      .from("sponsors")
      .select("id, name, logo_url")
      .eq("status", "active")
      .order("display_order", { ascending: true })
      .then(({ data }) => {
        if (isMounted && data) {
          setSponsors(data);
        }
      });
    return () => {
      isMounted = false;
    };
  }, []);

  if (sponsors.length === 0) return null;

  return (
    <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 my-8 space-y-4">
      <div className="flex items-center gap-2 text-slate-800 font-bold text-sm uppercase tracking-wider">
        <Users className="w-4 h-4 text-[#006666]" />
        <span>{title}</span>
      </div>
      <div className="flex flex-wrap items-center gap-6 pt-2">
        {sponsors.map((sp) => (
          <div key={sp.id} className="text-xs font-semibold text-slate-700 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-xs">
            {sp.name}
          </div>
        ))}
      </div>
    </div>
  );
};
