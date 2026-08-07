"use client";

import React, { useEffect, useState } from "react";
import { Sparkles, RefreshCw } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import {
  listPublishedContent,
  listPublicContentCategories,
} from "@/lib/content/public-content-service";
import { ContentCategory, ContentChannel, ContentPostWithRelations } from "@/lib/content/types";
import { SectionBannerCarousel } from "@/components/banners/SectionBannerCarousel";
import { BannerPosition } from "@/lib/banners/banner-types";
import { ContentChannelFilters } from "./ContentChannelFilters";
import { ContentPostGrid } from "./ContentPostGrid";

export type { BannerPosition };

interface ContentChannelPageProps {
  channel: ContentChannel;
  title: string;
  description: string;
  basePath: string;
  headerBannerPosition?: BannerPosition | string;
  inlineBannerPosition?: BannerPosition | string;
}

export const ContentChannelPage: React.FC<ContentChannelPageProps> = ({
  channel,
  title,
  description,
  basePath,
  headerBannerPosition,
}) => {
  const [posts, setPosts] = useState<ContentPostWithRelations[]>([]);
  const [categories, setCategories] = useState<ContentCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryId, setCategoryId] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    async function fetchData() {
      try {
        const supabase = createClient();

        const [contentResult, catData] = await Promise.all([
          listPublishedContent(supabase, {
            channel,
            searchQuery,
            categoryId,
          }),
          listPublicContentCategories(supabase, channel),
        ]);

        if (!isCancelled) {
          setPosts(contentResult.posts);
          setCategories(catData);
          setLoading(false);
        }
      } catch (err: unknown) {
        console.error("Error al cargar la página pública de contenido:", err);
        if (!isCancelled) setLoading(false);
      }
    }

    fetchData();

    return () => {
      isCancelled = true;
    };
  }, [channel, searchQuery, categoryId]);

  const handleClearFilters = () => {
    setSearchQuery("");
    setCategoryId("all");
  };

  return (
    <div className="min-h-screen bg-slate-50/50 pt-28 pb-20">
      <div className="container mx-auto px-4 max-w-6xl space-y-8">
        {/* Header Banner Carousel */}
        {headerBannerPosition && (
          <SectionBannerCarousel position={headerBannerPosition as BannerPosition} />
        )}

        {/* Header Title Section */}
        <div className="bg-white p-8 sm:p-12 rounded-3xl border border-slate-200 shadow-sm space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-50 text-[#006666] text-xs font-bold rounded-full border border-emerald-200">
            <Sparkles className="w-3.5 h-3.5" />
            <span>SOVOGIN Contenidos</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            {title}
          </h1>

          <p className="text-sm sm:text-base text-slate-600 max-w-3xl leading-relaxed">
            {description}
          </p>
        </div>

        {/* Filters */}
        <ContentChannelFilters
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          categoryId={categoryId}
          onCategoryIdChange={setCategoryId}
          categories={categories}
          onClearFilters={handleClearFilters}
          totalResults={posts.length}
        />

        {/* Content Grid / Loading */}
        {loading ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-sm">
            <RefreshCw className="w-6 h-6 text-[#006666] animate-spin mx-auto mb-2" />
            <span className="text-xs text-slate-500 font-medium">
              Cargando publicaciones...
            </span>
          </div>
        ) : (
          <ContentPostGrid posts={posts} basePath={basePath} />
        )}
      </div>
    </div>
  );
};
