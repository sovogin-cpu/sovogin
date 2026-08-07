"use client";

import React from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { MediaSelectorField } from "@/components/media-selector/MediaSelectorField";

interface CommercialBenefitMediaSelectorProps {
  label: string;
  selectedMediaId: string | null;
  onSelectMediaId: (id: string | null) => void;
}

export const CommercialBenefitMediaSelector: React.FC<CommercialBenefitMediaSelectorProps> = ({
  label,
  selectedMediaId,
  onSelectMediaId,
}) => {
  return (
    <div className="space-y-1.5">
      <MediaSelectorField
        value={selectedMediaId}
        onChange={onSelectMediaId}
        kind="image"
        visibilityRequirement="public"
        label={label}
        description="Selecciona una imagen publicada de la biblioteca multimedia"
        allowClear
      />

      <div className="pt-1 flex justify-end">
        <Link
          href="/admin/media"
          target="_blank"
          className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          <span>Ir a Biblioteca Multimedia</span>
          <ExternalLink className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
};
