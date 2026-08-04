import React from "react";
import { ContentPostStatus } from "@/lib/content/types";
import { formatContentStatus } from "@/lib/content/content-utils";

interface ContentStatusBadgeProps {
  status: ContentPostStatus;
  className?: string;
}

export const ContentStatusBadge: React.FC<ContentStatusBadgeProps> = ({
  status,
  className = "",
}) => {
  let badgeStyles = "bg-slate-100 text-slate-700 border-slate-200";

  switch (status) {
    case "draft":
      badgeStyles = "bg-amber-50 text-amber-700 border-amber-200";
      break;
    case "published":
      badgeStyles = "bg-emerald-50 text-emerald-700 border-emerald-200";
      break;
    case "archived":
      badgeStyles = "bg-slate-100 text-slate-600 border-slate-300";
      break;
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${badgeStyles} ${className}`}
    >
      {formatContentStatus(status)}
    </span>
  );
};
