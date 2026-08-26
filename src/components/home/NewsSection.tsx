import React from "react";
import Link from "next/link";
import { Calendar, ArrowRight, Newspaper } from "lucide-react";
import { ContentPostWithRelations } from "@/lib/content/types";
import { PublicMedia } from "@/components/content/public/PublicMedia";

interface NewsSectionProps {
  posts: ContentPostWithRelations[];
}

export const NewsSection: React.FC<NewsSectionProps> = ({ posts }) => {
  if (!posts || posts.length === 0) {
    return null;
  }

  const newsToDisplay = posts.slice(0, 3);

  return (
    <section className="py-24 bg-white border-t border-slate-100">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#006666]/10 text-[#006666] text-xs font-bold uppercase tracking-wider">
              <Newspaper className="w-4 h-4" />
              <span>Noticias e Información Gremial</span>
            </div>
            <h2 className="text-3xl md:text-5xl font-bold text-slate-900 tracking-tight">
              Últimas Noticias
            </h2>
            <p className="text-slate-600 text-lg leading-relaxed">
              Manténgase al día con los comunicados oficiales, avances e información relevante de SOVOGIN.
            </p>
          </div>
          <Link
            href="/comunidad"
            className="text-[#006666] font-bold hover:underline flex items-center gap-2 text-lg group"
          >
            <span>Ver más noticias</span>
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* 3 Columns Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {newsToDisplay.map((post) => {
            const formattedDate = post.published_at
              ? new Date(post.published_at).toLocaleDateString("es-ES", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : post.created_at
              ? new Date(post.created_at).toLocaleDateString("es-ES", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })
              : "";

            return (
              <article
                key={post.id}
                className="group bg-slate-50 rounded-3xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-slate-100 flex flex-col justify-between"
              >
                <div>
                  {/* Featured Image or Elegant Fallback */}
                  <div className="aspect-video bg-slate-200 relative overflow-hidden">
                    {post.featured_media_id ? (
                      <PublicMedia
                        mediaId={post.featured_media_id}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-slate-900 via-[#004d4d] to-[#006666] flex flex-col items-center justify-center p-6 text-white text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-xl" />
                        <Newspaper className="w-10 h-10 text-white/40 mb-2" />
                        <span className="font-extrabold text-sm opacity-90 tracking-wide uppercase">
                          SOVOGIN Noticias
                        </span>
                      </div>
                    )}
                    <div className="absolute top-4 left-4 z-10">
                      <span className="px-3 py-1 bg-white/90 backdrop-blur-md text-[#006666] text-xs font-bold rounded-full uppercase tracking-wider shadow-sm">
                        Noticia
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-8 space-y-4">
                    {formattedDate && (
                      <div className="flex items-center gap-2 text-xs font-bold text-[#006666] uppercase tracking-widest">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{formattedDate}</span>
                      </div>
                    )}

                    <h3 className="text-2xl font-bold text-slate-900 group-hover:text-[#006666] transition-colors leading-tight line-clamp-2">
                      {post.title}
                    </h3>

                    {post.excerpt && (
                      <p className="text-slate-600 leading-relaxed text-sm line-clamp-3">
                        {post.excerpt}
                      </p>
                    )}
                  </div>
                </div>

                {/* Footer CTA */}
                <div className="p-8 pt-0 border-t border-slate-100/60 mt-4">
                  <Link
                    href={`/comunidad/${post.slug}`}
                    className="inline-flex items-center gap-2 font-bold text-[#006666] hover:text-[#004d4d] transition-colors text-base group/btn"
                  >
                    <span>Leer más</span>
                    <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
