import React from "react";
import Link from "next/link";
import { Calendar, Star, ArrowRight } from "lucide-react";
import { ContentPostWithRelations } from "@/lib/content/types";
import { formatContentChannel } from "@/lib/content/content-utils";
import { PublicMedia } from "./PublicMedia";

interface ContentPostPublicCardProps {
  post: ContentPostWithRelations;
  basePath: string;
}

export const ContentPostPublicCard: React.FC<ContentPostPublicCardProps> = ({
  post,
  basePath,
}) => {
  const formattedDate = post.published_at
    ? new Date(post.published_at).toLocaleDateString("es-CO", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : post.created_at
    ? new Date(post.created_at).toLocaleDateString("es-CO", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "";

  return (
    <article className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between group">
      <div>
        {/* Featured Image */}
        <div className="h-52 w-full bg-slate-100 relative overflow-hidden">
          {post.featured_media_id ? (
            <PublicMedia
              mediaId={post.featured_media_id}
              alt={post.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-emerald-900 to-[#006666] flex items-center justify-center p-6 text-white text-center">
              <span className="font-extrabold text-lg opacity-80 tracking-tight">
                {post.title}
              </span>
            </div>
          )}

          {/* Featured Star Badge */}
          {post.is_featured && (
            <div className="absolute top-3 right-3 bg-amber-500 text-white p-1.5 rounded-full shadow-md">
              <Star className="w-4 h-4 fill-white" />
            </div>
          )}

          {/* Channel Tag */}
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-[#006666] text-[11px] font-bold px-2.5 py-1 rounded-full border border-slate-200/80 shadow-xs">
            {formatContentChannel(post.channel)}
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-3">
          {/* Categories */}
          {post.categories && post.categories.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {post.categories.map((cat) => (
                <span
                  key={cat.id}
                  className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md"
                >
                  {cat.name}
                </span>
              ))}
            </div>
          )}

          {/* Title */}
          <h3 className="font-extrabold text-slate-900 text-lg group-hover:text-[#006666] transition-colors line-clamp-2 leading-snug">
            <Link href={`${basePath}/${post.slug}`}>{post.title}</Link>
          </h3>

          {/* Excerpt */}
          {post.excerpt && (
            <p className="text-xs text-slate-600 line-clamp-3 leading-relaxed">
              {post.excerpt}
            </p>
          )}
        </div>
      </div>

      {/* Footer Meta */}
      <div className="p-6 pt-0 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{formattedDate}</span>
        </div>

        <Link
          href={`${basePath}/${post.slug}`}
          className="inline-flex items-center gap-1 text-xs font-bold text-[#006666] hover:text-[#004d4d] transition-colors"
        >
          <span>Leer más</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </article>
  );
};
