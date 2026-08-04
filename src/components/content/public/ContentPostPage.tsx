import React from "react";
import Link from "next/link";
import { ArrowLeft, Calendar, Tag } from "lucide-react";
import { ContentPostWithRelations } from "@/lib/content/types";
import { formatContentChannel } from "@/lib/content/content-utils";
import { PublicMedia } from "./PublicMedia";
import { ContentBlockRenderer } from "./ContentBlockRenderer";

interface ContentPostPageProps {
  post: ContentPostWithRelations;
  basePath: string;
}

export const ContentPostPage: React.FC<ContentPostPageProps> = ({
  post,
  basePath,
}) => {
  const formattedDate = post.published_at
    ? new Date(post.published_at).toLocaleDateString("es-CO", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "";

  return (
    <article className="min-h-screen bg-slate-50/50 pt-28 pb-20">
      <div className="container mx-auto px-4 max-w-4xl space-y-8">
        {/* Back Link */}
        <div>
          <Link
            href={basePath}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors shadow-xs"
          >
            <ArrowLeft className="w-4 h-4 text-[#006666]" />
            <span>Volver a {formatContentChannel(post.channel)}</span>
          </Link>
        </div>

        {/* Post Editorial Header Card */}
        <header className="bg-white p-8 sm:p-12 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-3 py-1 bg-emerald-50 text-[#006666] text-xs font-bold rounded-full border border-emerald-200">
              {formatContentChannel(post.channel)}
            </span>

            {post.categories && post.categories.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {post.categories.map((cat) => (
                  <span
                    key={cat.id}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-0.5 rounded-full"
                  >
                    <Tag className="w-3 h-3 text-slate-400" />
                    <span>{cat.name}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            {post.title}
          </h1>

          {post.excerpt && (
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed font-medium">
              {post.excerpt}
            </p>
          )}

          {formattedDate && (
            <div className="flex items-center gap-2 pt-2 text-xs text-slate-500 font-medium border-t border-slate-100">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>Publicado el {formattedDate}</span>
            </div>
          )}
        </header>

        {/* Featured Media */}
        {post.featured_media_id && (
          <div className="rounded-3xl overflow-hidden shadow-sm border border-slate-200 max-h-[450px]">
            <PublicMedia
              mediaId={post.featured_media_id}
              alt={post.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Block Content Container */}
        <main className="bg-white p-8 sm:p-12 rounded-3xl border border-slate-200 shadow-sm">
          <ContentBlockRenderer blocks={post.content} />
        </main>

        {/* Footer Back Link */}
        <div className="pt-4 text-center">
          <Link
            href={basePath}
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#006666] hover:bg-[#004d4d] text-white font-bold text-sm rounded-xl transition-colors shadow-md"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Ver más en {formatContentChannel(post.channel)}</span>
          </Link>
        </div>
      </div>
    </article>
  );
};
