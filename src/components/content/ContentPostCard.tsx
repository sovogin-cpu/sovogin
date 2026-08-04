import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  Edit,
  ExternalLink,
  Archive,
  Star,
  Eye,
  Tag,
  ImageIcon,
} from "lucide-react";
import { ContentPostWithRelations } from "@/lib/content/types";
import {
  formatContentChannel,
  formatContentVisibility,
  isPublicationAvailable,
} from "@/lib/content/content-utils";
import { ContentStatusBadge } from "./ContentStatusBadge";
import { createClient } from "@/utils/supabase/client";

interface ContentPostCardProps {
  post: ContentPostWithRelations;
  onArchive: (id: string) => Promise<void>;
}

export const ContentPostCard: React.FC<ContentPostCardProps> = ({
  post,
  onArchive,
}) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isArchiving, setIsArchiving] = useState(false);
  const [showConfirmArchive, setShowConfirmArchive] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadSignedImageUrl() {
      if (!post.featured_media) {
        if (isMounted) setImageUrl(null);
        return;
      }

      try {
        const supabase = createClient();
        const { data, error } = await supabase.storage
          .from(post.featured_media.storage_bucket)
          .createSignedUrl(post.featured_media.storage_path, 3600);

        if (error) {
          console.error("Error al crear la URL firmada para la imagen:", error.message);
          if (isMounted) setImageUrl(null);
          return;
        }

        if (isMounted && data?.signedUrl) {
          setImageUrl(data.signedUrl);
        }
      } catch (err: unknown) {
        console.error("Error cargando imagen destacada:", err);
        if (isMounted) setImageUrl(null);
      }
    }

    loadSignedImageUrl();

    return () => {
      isMounted = false;
    };
  }, [post.featured_media]);

  const handleConfirmArchive = async () => {
    try {
      setIsArchiving(true);
      await onArchive(post.id);
    } catch (err: unknown) {
      console.error("Error al archivar la publicación:", err);
    } finally {
      setIsArchiving(false);
      setShowConfirmArchive(false);
    }
  };

  const isPublishedAndAvailable = isPublicationAvailable(post);

  const getPublicPath = () => {
    switch (post.channel) {
      case "innovation":
        return `/innovacion/${post.slug}`;
      case "community":
        return `/comunidad/${post.slug}`;
      case "news":
        return `/noticias/${post.slug}`;
      case "benefits":
        return `/beneficios/${post.slug}`;
      default:
        return `/${post.channel}/${post.slug}`;
    }
  };

  const formattedCreatedDate = new Date(post.created_at).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const formattedPublishedDate = post.published_at
    ? new Date(post.published_at).toLocaleDateString("es-CO", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden">
      <div>
        {/* Top Header Image or Placeholder */}
        <div className="relative h-40 w-full bg-slate-100 border-b border-slate-100 flex items-center justify-center overflow-hidden">
          {imageUrl ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={imageUrl}
              alt={post.featured_media?.alt_text || post.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center text-slate-400 gap-1">
              <ImageIcon className="w-8 h-8 opacity-40" />
              <span className="text-xs font-medium text-slate-400">Sin imagen destacada</span>
            </div>
          )}

          {/* Badges Overlay */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
            <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-white/90 backdrop-blur-sm text-[#006666] shadow-sm border border-slate-200/60 pointer-events-auto">
              {formatContentChannel(post.channel)}
            </span>
            <div className="flex items-center gap-1.5 pointer-events-auto">
              {post.is_featured && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-400 text-amber-950 shadow-sm">
                  <Star className="w-3 h-3 fill-amber-950" />
                  <span>Destacado</span>
                </span>
              )}
              <ContentStatusBadge status={post.status} />
            </div>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span className="inline-flex items-center gap-1">
              <Eye className="w-3.5 h-3.5 text-slate-400" />
              <span>{formatContentVisibility(post.visibility)}</span>
            </span>
            <span>•</span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>{formattedCreatedDate}</span>
            </span>
          </div>

          <h3 className="text-base font-bold text-slate-900 line-clamp-2 leading-snug hover:text-[#006666] transition-colors">
            <Link href={`/admin/contenidos/${post.id}`}>{post.title}</Link>
          </h3>

          {post.excerpt && (
            <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
              {post.excerpt}
            </p>
          )}

          {/* Categories */}
          {post.categories && post.categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {post.categories.map((cat) => (
                <span
                  key={cat.id}
                  className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium border border-slate-200/60"
                >
                  <Tag className="w-3 h-3 text-slate-400" />
                  {cat.name}
                </span>
              ))}
            </div>
          )}

          {/* Additional details */}
          {formattedPublishedDate && post.status === "published" && (
            <p className="text-xs text-emerald-700 font-medium pt-1">
              Publicado el: {formattedPublishedDate}
            </p>
          )}
        </div>
      </div>

      {/* Card Footer Actions */}
      <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/contenidos/${post.id}`}
            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#006666] bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200/60 transition-colors"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Editar</span>
          </Link>

          {post.status !== "archived" && (
            <button
              onClick={() => setShowConfirmArchive(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-200"
              title="Archivar publicación"
            >
              <Archive className="w-3.5 h-3.5" />
              <span>Archivar</span>
            </button>
          )}
        </div>

        {isPublishedAndAvailable && (
          <a
            href={getPublicPath()}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-[#006666] transition-colors"
            title="Ver publicación en la web pública"
          >
            <span>Ver público</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {/* Archive Confirmation Modal */}
      {showConfirmArchive && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <h4 className="text-lg font-bold text-slate-900">
              ¿Archivar publicación?
            </h4>
            <p className="text-sm text-slate-600">
              La publicación &quot;<span className="font-semibold">{post.title}</span>&quot; pasará al estado <span className="font-semibold text-slate-800">Archivado</span> y dejará de ser visible públicamente. No se eliminará físicamente.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                disabled={isArchiving}
                onClick={() => setShowConfirmArchive(false)}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                disabled={isArchiving}
                onClick={handleConfirmArchive}
                className="px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {isArchiving ? "Archivando..." : "Confirmar Archivado"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
