"use client";

import React, { useEffect, useState } from "react";
import { SponsorsBlock } from "@/lib/content/types";
import { PublicBlockRendererProps } from "@/lib/content/public-renderer-types";
import { createClient } from "@/utils/supabase/client";
import { Award } from "lucide-react";

interface SponsorItem {
  id: string;
  name: string;
  logo_url?: string | null;
  website_url?: string | null;
  is_active?: boolean;
}

export function SponsorsPublicBlock({
  block,
}: PublicBlockRendererProps<SponsorsBlock>) {
  const [sponsors, setSponsors] = useState<SponsorItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    async function fetchSponsors() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("sponsors")
          .select("id, name, logo_url, website_url, is_active")
          .eq("is_active", true);

        if (error) throw error;
        if (isCancelled) return;

        let filtered = (data as SponsorItem[]) || [];

        if (!block.showAllActive && Array.isArray(block.sponsorIds) && block.sponsorIds.length > 0) {
          const targetIds = block.sponsorIds;
          filtered = filtered.filter((sp) => targetIds.includes(sp.id));
        }

        setSponsors(filtered);
      } catch (err) {
        console.error("Error al cargar patrocinadores públicos:", err);
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    void fetchSponsors();

    return () => {
      isCancelled = true;
    };
  }, [block.showAllActive, block.sponsorIds]);

  if (loading || sponsors.length === 0) return null;

  return (
    <div className="my-8 p-6 sm:p-8 rounded-3xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-6">
      <div className="flex items-center gap-2 text-[#006666] dark:text-emerald-400 font-bold text-xs uppercase tracking-widest">
        <Award className="w-4 h-4" />
        <span>{block.title || "Nuestros Patrocinadores y Aliados"}</span>
      </div>

      <div
        className={
          block.displayStyle === "carousel"
            ? "flex overflow-x-auto gap-6 pb-2 scrollbar-thin"
            : "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6 items-center"
        }
      >
        {sponsors.map((sp) => {
          const content = (
            <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700/60 shadow-sm hover:shadow-md transition-shadow flex items-center justify-center h-24">
              {sp.logo_url ? (
                <img
                  src={sp.logo_url}
                  alt={sp.name}
                  className="max-h-14 max-w-full object-contain grayscale hover:grayscale-0 transition-all duration-300"
                />
              ) : (
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 text-center">
                  {sp.name}
                </span>
              )}
            </div>
          );

          if (sp.website_url) {
            return (
              <a
                key={sp.id}
                href={sp.website_url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Visitar sitio de ${sp.name}`}
                className="shrink-0 block"
              >
                {content}
              </a>
            );
          }

          return (
            <div key={sp.id} className="shrink-0">
              {content}
            </div>
          );
        })}
      </div>
    </div>
  );
}
