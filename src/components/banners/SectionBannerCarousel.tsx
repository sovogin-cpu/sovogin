"use client";

import React, { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Image as ImageIcon, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { Banner, BannerPosition } from "@/lib/banners/banner-types";
import { listActiveBannersByPosition } from "@/lib/banners/banner-repository";
import { normalizeBannerLink } from "@/lib/banners/banner-utils";
import { cn } from "@/lib/utils";

interface SectionBannerCarouselProps {
  position: BannerPosition;
  className?: string;
  autoplay?: boolean;
}

export function SectionBannerCarousel({
  position,
  className,
  autoplay = true,
}: SectionBannerCarouselProps) {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();

    async function fetchBanners() {
      try {
        const activeBanners = await listActiveBannersByPosition(supabase, position);
        if (isMounted) {
          setBanners(activeBanners);
          setCurrentIndex(0);
        }
      } catch (error) {
        console.error(`Error cargando los banners de ${position}:`, error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void fetchBanners();

    return () => {
      isMounted = false;
    };
  }, [position]);

  const goToNext = useCallback(() => {
    setCurrentIndex((previousIndex) => {
      if (banners.length === 0) return 0;
      return (previousIndex + 1) % banners.length;
    });
  }, [banners.length]);

  const goToPrevious = useCallback(() => {
    setCurrentIndex((previousIndex) => {
      if (banners.length === 0) return 0;
      return (previousIndex - 1 + banners.length) % banners.length;
    });
  }, [banners.length]);

  useEffect(() => {
    if (!autoplay || banners.length <= 1 || isPaused) {
      return;
    }

    const intervalId = window.setInterval(() => {
      goToNext();
    }, 6000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [autoplay, banners.length, goToNext, isPaused]);

  if (loading) {
    return (
      <div
        className={cn(
          "flex aspect-[16/9] w-full items-center justify-center rounded-[2rem] border border-slate-100 bg-slate-50",
          className
        )}
      >
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (banners.length === 0) {
    return null;
  }

  const currentBanner = banners[currentIndex];
  const safeLink = normalizeBannerLink(currentBanner.link_url);
  const isImageFailed = Boolean(failedImages[currentBanner.id]);

  const handleImageError = () => {
    setFailedImages((prev) => ({ ...prev, [currentBanner.id]: true }));
  };

  const bannerContent = (
    <div className="relative aspect-[16/9] w-full overflow-hidden">
      {currentBanner.image_url && !isImageFailed ? (
        <img
          src={currentBanner.image_url}
          alt={currentBanner.title || "Banner promocional"}
          onError={handleImageError}
          className="h-full w-full object-cover transition-transform duration-700 hover:scale-[1.02]"
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-slate-100 text-slate-400">
          <ImageIcon className="h-12 w-12 text-slate-300" />
          <span className="text-xs font-medium">{currentBanner.title}</span>
        </div>
      )}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent" />
    </div>
  );

  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-lg shadow-slate-200/40",
        className
      )}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      aria-roledescription="carrusel"
      aria-label={`Carrusel de banners - ${position}`}
    >
      {safeLink ? (
        <a
          href={safeLink}
          target={currentBanner.open_in_new_tab ? "_blank" : undefined}
          rel={currentBanner.open_in_new_tab ? "noopener noreferrer" : undefined}
          aria-label={`Abrir ${currentBanner.title || "enlace del banner"}`}
          className="block w-full"
        >
          {bannerContent}
        </a>
      ) : (
        bannerContent
      )}

      {banners.length > 1 && (
        <>
          <button
            type="button"
            onClick={goToPrevious}
            aria-label="Banner anterior"
            className="absolute left-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-lg backdrop-blur transition-all hover:bg-white hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary lg:opacity-0 lg:group-hover:opacity-100"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={goToNext}
            aria-label="Siguiente banner"
            className="absolute right-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow-lg backdrop-blur transition-all hover:bg-white hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary lg:opacity-0 lg:group-hover:opacity-100"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/15 px-3 py-2 backdrop-blur-sm">
            {banners.map((banner, index) => (
              <button
                key={banner.id}
                type="button"
                onClick={() => setCurrentIndex(index)}
                aria-label={`Mostrar banner ${index + 1} de ${banners.length}: ${banner.title}`}
                aria-current={index === currentIndex ? "true" : undefined}
                className={cn(
                  "h-2 rounded-full transition-all focus:outline-none focus:ring-1 focus:ring-white",
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
