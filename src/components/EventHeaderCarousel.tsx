"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";

import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";

type EventBanner = {
  id: string;
  title: string;
  image_url: string;
  link_url: string | null;
  open_in_new_tab: boolean;
  display_order: number;
  starts_at: string | null;
  ends_at: string | null;
};

function isBannerCurrentlyVisible(banner: EventBanner) {
  const now = Date.now();

  if (banner.starts_at) {
    const startsAt = new Date(banner.starts_at).getTime();

    if (!Number.isNaN(startsAt) && startsAt > now) {
      return false;
    }
  }

  if (banner.ends_at) {
    const endsAt = new Date(banner.ends_at).getTime();

    if (!Number.isNaN(endsAt) && endsAt < now) {
      return false;
    }
  }

  return true;
}

export function EventHeaderCarousel() {
  const [banners, setBanners] = useState<EventBanner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    async function fetchBanners() {
      try {
        const { data, error } = await supabase
          .from("banners")
          .select(`
            id,
            title,
            image_url,
            link_url,
            open_in_new_tab,
            display_order,
            starts_at,
            ends_at
          `)
          .eq("position", "EVENTS_HEADER")
          .eq("is_active", true)
          .order("display_order", { ascending: true })
          .order("created_at", { ascending: true });

        if (error) {
          throw error;
        }

        const visibleBanners = ((data ?? []) as EventBanner[]).filter(
          isBannerCurrentlyVisible
        );

        setBanners(visibleBanners);
        setCurrentIndex(0);
      } catch (error) {
        console.error(
          "Error cargando los banners de eventos:",
          error
        );
      } finally {
        setLoading(false);
      }
    }

    void fetchBanners();
  }, []);

  const goToNext = useCallback(() => {
    setCurrentIndex((previousIndex) => {
      if (banners.length === 0) return 0;

      return (previousIndex + 1) % banners.length;
    });
  }, [banners.length]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((previousIndex) => {
      if (banners.length === 0) return 0;

      return (
        previousIndex - 1 + banners.length
      ) % banners.length;
    });
  }, [banners.length]);

  useEffect(() => {
    if (banners.length <= 1 || isPaused) {
      return;
    }

    const intervalId = window.setInterval(() => {
      goToNext();
    }, 6000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [banners.length, goToNext, isPaused]);

  if (loading) {
    return (
      <div className="flex aspect-[16/9] w-full items-center justify-center rounded-[2rem] border border-slate-100 bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (banners.length === 0) {
    return null;
  }

  const currentBanner = banners[currentIndex];

  const bannerImage = (
    <div className="relative aspect-[16/9] w-full overflow-hidden">
      {currentBanner.image_url ? (
        <img
          src={currentBanner.image_url}
          alt={currentBanner.title}
          className="h-full w-full object-cover transition-transform duration-700 hover:scale-[1.02]"
        />
      ) : (
        <div className="flex h-full items-center justify-center bg-slate-100">
          <ImageIcon className="h-12 w-12 text-slate-300" />
        </div>
      )}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent" />
    </div>
  );

  return (
    <div
      className="group relative overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-lg shadow-slate-200/40"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      aria-roledescription="carrusel"
      aria-label="Promociones y eventos destacados"
    >
      {currentBanner.link_url ? (
        <a
          href={currentBanner.link_url}
          target={
            currentBanner.open_in_new_tab
              ? "_blank"
              : undefined
          }
          rel={
            currentBanner.open_in_new_tab
              ? "noopener noreferrer"
              : undefined
          }
          aria-label={`Abrir ${currentBanner.title}`}
        >
          {bannerImage}
        </a>
      ) : (
        bannerImage
      )}

      {banners.length > 1 && (
        <>
          <button
            type="button"
            onClick={goToPrevious}
            aria-label="Banner anterior"
            className="absolute left-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-lg backdrop-blur transition-all hover:bg-white hover:text-primary lg:opacity-0 lg:group-hover:opacity-100"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={goToNext}
            aria-label="Siguiente banner"
            className="absolute right-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-lg backdrop-blur transition-all hover:bg-white hover:text-primary lg:opacity-0 lg:group-hover:opacity-100"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/15 px-3 py-2 backdrop-blur-sm">
            {banners.map((banner, index) => (
              <button
                key={banner.id}
                type="button"
                onClick={() => setCurrentIndex(index)}
                aria-label={`Mostrar banner ${index + 1}`}
                aria-current={
                  index === currentIndex ? "true" : undefined
                }
                className={cn(
                  "h-2 rounded-full transition-all",
                  index === currentIndex
                    ? "w-6 bg-white"
                    : "w-2 bg-white/60 hover:bg-white/90"
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}