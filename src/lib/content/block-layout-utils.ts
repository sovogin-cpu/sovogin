import {
  BlockAlignment,
  BlockBackgroundConfig,
  BlockColumns,
  BlockGap,
  BlockLayoutConfig,
  BlockResponsiveConfig,
  BlockSpacing,
  BlockVisibilityConfig,
  BlockWidth,
} from "./block-layout-types";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const HEX_COLOR_REGEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export function createDefaultBlockLayout(): BlockLayoutConfig {
  return {
    width: "container",
    alignment: "left",
    columns: 1,
    columnGap: "medium",
    paddingTop: "medium",
    paddingBottom: "medium",
    marginTop: "none",
    marginBottom: "none",
    background: {
      type: "none",
    },
    responsive: {
      hideOnMobile: false,
      hideOnTablet: false,
      hideOnDesktop: false,
    },
    visibility: {
      mode: "always",
    },
  };
}

export function normalizeBlockLayout(rawLayout: unknown): BlockLayoutConfig {
  const defaults = createDefaultBlockLayout();

  if (typeof rawLayout !== "object" || rawLayout === null || Array.isArray(rawLayout)) {
    return defaults;
  }

  const raw = rawLayout as Record<string, unknown>;

  const width: BlockWidth =
    raw.width === "full" || raw.width === "container" || raw.width === "narrow"
      ? raw.width
      : defaults.width;

  const alignment: BlockAlignment =
    raw.alignment === "left" ||
    raw.alignment === "center" ||
    raw.alignment === "right" ||
    raw.alignment === "stretch"
      ? raw.alignment
      : defaults.alignment;

  const columns: BlockColumns =
    raw.columns === 1 || raw.columns === 2 || raw.columns === 3
      ? raw.columns
      : defaults.columns;

  const columnGap: BlockGap =
    raw.columnGap === "none" ||
    raw.columnGap === "small" ||
    raw.columnGap === "medium" ||
    raw.columnGap === "large"
      ? raw.columnGap
      : defaults.columnGap;

  const parseSpacing = (val: unknown, fallback: BlockSpacing): BlockSpacing => {
    if (
      val === "none" ||
      val === "small" ||
      val === "medium" ||
      val === "large" ||
      val === "xl"
    ) {
      return val;
    }
    return fallback;
  };

  const paddingTop = parseSpacing(raw.paddingTop, defaults.paddingTop);
  const paddingBottom = parseSpacing(raw.paddingBottom, defaults.paddingBottom);
  const marginTop = parseSpacing(raw.marginTop, defaults.marginTop);
  const marginBottom = parseSpacing(raw.marginBottom, defaults.marginBottom);

  // Background Normalization
  let background: BlockBackgroundConfig = { type: "none" };
  if (typeof raw.background === "object" && raw.background !== null) {
    const rawBg = raw.background as Record<string, unknown>;
    const bgType =
      rawBg.type === "color" || rawBg.type === "image" ? rawBg.type : "none";

    if (bgType === "color") {
      const colorStr = typeof rawBg.color === "string" ? rawBg.color.trim() : "";
      const validColor = HEX_COLOR_REGEX.test(colorStr) ? colorStr : "#f8fafc";
      background = { type: "color", color: validColor };
    } else if (bgType === "image") {
      const mediaIdStr = typeof rawBg.mediaId === "string" ? rawBg.mediaId.trim() : "";
      const validMediaId = UUID_REGEX.test(mediaIdStr) ? mediaIdStr : undefined;
      background = {
        type: "image",
        mediaId: validMediaId,
        overlay: Boolean(rawBg.overlay),
      };
    }
  }

  // Responsive Normalization
  let responsive: BlockResponsiveConfig = defaults.responsive;
  if (typeof raw.responsive === "object" && raw.responsive !== null) {
    const rawResp = raw.responsive as Record<string, unknown>;
    const mobileCols =
      rawResp.mobileColumns === 1 || rawResp.mobileColumns === 2
        ? rawResp.mobileColumns
        : undefined;
    const tabletCols =
      rawResp.tabletColumns === 1 ||
      rawResp.tabletColumns === 2 ||
      rawResp.tabletColumns === 3
        ? rawResp.tabletColumns
        : undefined;

    responsive = {
      hideOnMobile: Boolean(rawResp.hideOnMobile),
      hideOnTablet: Boolean(rawResp.hideOnTablet),
      hideOnDesktop: Boolean(rawResp.hideOnDesktop),
      mobileColumns: mobileCols,
      tabletColumns: tabletCols,
    };
  }

  // Visibility Normalization
  let visibility: BlockVisibilityConfig = defaults.visibility;
  if (typeof raw.visibility === "object" && raw.visibility !== null) {
    const rawVis = raw.visibility as Record<string, unknown>;
    const mode =
      rawVis.mode === "members_only" || rawVis.mode === "public_only"
        ? rawVis.mode
        : "always";
    visibility = { mode };
  }

  return {
    width,
    alignment,
    columns,
    columnGap,
    paddingTop,
    paddingBottom,
    marginTop,
    marginBottom,
    background,
    responsive,
    visibility,
  };
}

// -----------------------------------------------------------------------------
// STATIC TAILWIND CLASS MAPPERS (EXPLICIT FOR TAILWIND COMPILATION)
// -----------------------------------------------------------------------------

export function getBlockWidthClasses(width: BlockWidth): string {
  switch (width) {
    case "full":
      return "w-full max-w-none";
    case "narrow":
      return "max-w-3xl mx-auto w-full";
    case "container":
    default:
      return "max-w-6xl mx-auto w-full";
  }
}

export function getBlockAlignmentClasses(alignment: BlockAlignment): string {
  switch (alignment) {
    case "center":
      return "text-center items-center justify-center";
    case "right":
      return "text-right items-end justify-end";
    case "stretch":
      return "text-left items-stretch justify-stretch w-full";
    case "left":
    default:
      return "text-left items-start justify-start";
  }
}

export function getBlockSpacingClasses(layout: Pick<BlockLayoutConfig, "paddingTop" | "paddingBottom" | "marginTop" | "marginBottom">): string {
  const ptMap: Record<BlockSpacing, string> = {
    none: "pt-0",
    small: "pt-3 sm:pt-4",
    medium: "pt-6 sm:pt-8",
    large: "pt-10 sm:pt-12",
    xl: "pt-14 sm:pt-16",
  };

  const pbMap: Record<BlockSpacing, string> = {
    none: "pb-0",
    small: "pb-3 sm:pb-4",
    medium: "pb-6 sm:pb-8",
    large: "pb-10 sm:pb-12",
    xl: "pb-14 sm:pb-16",
  };

  const mtMap: Record<BlockSpacing, string> = {
    none: "mt-0",
    small: "mt-3 sm:mt-4",
    medium: "mt-6 sm:mt-8",
    large: "mt-10 sm:mt-12",
    xl: "mt-14 sm:mt-16",
  };

  const mbMap: Record<BlockSpacing, string> = {
    none: "mb-0",
    small: "mb-3 sm:mb-4",
    medium: "mb-6 sm:mb-8",
    large: "mb-10 sm:mb-12",
    xl: "mb-14 sm:mb-16",
  };

  return `${ptMap[layout.paddingTop]} ${pbMap[layout.paddingBottom]} ${mtMap[layout.marginTop]} ${mbMap[layout.marginBottom]}`;
}

export function getBlockColumnClasses(
  columns: BlockColumns,
  responsive?: BlockResponsiveConfig
): string {
  const baseCols = columns === 3 ? "lg:grid-cols-3" : columns === 2 ? "md:grid-cols-2" : "grid-cols-1";
  const mobileCols = responsive?.mobileColumns === 2 ? "grid-cols-2" : "grid-cols-1";
  const tabletCols = responsive?.tabletColumns === 3 ? "md:grid-cols-3" : responsive?.tabletColumns === 2 ? "md:grid-cols-2" : "";

  if (columns === 1 && !responsive?.mobileColumns && !responsive?.tabletColumns) {
    return "w-full";
  }

  return `grid ${mobileCols} ${tabletCols} ${baseCols}`;
}

export function getBlockGapClasses(gap: BlockGap): string {
  switch (gap) {
    case "none":
      return "gap-0";
    case "small":
      return "gap-3";
    case "large":
      return "gap-8 sm:gap-10";
    case "medium":
    default:
      return "gap-5 sm:gap-6";
  }
}

export function getBlockBackgroundClasses(bg: BlockBackgroundConfig): string {
  if (bg.type === "none") {
    return "";
  }

  if (bg.type === "color") {
    return "rounded-2xl p-6 transition-colors";
  }

  if (bg.type === "image") {
    return "relative rounded-2xl p-6 bg-cover bg-center overflow-hidden";
  }

  return "";
}

export function isBlockVisibleForViewport(
  responsive: BlockResponsiveConfig,
  viewport: "mobile" | "tablet" | "desktop"
): boolean {
  if (viewport === "mobile" && responsive.hideOnMobile) return false;
  if (viewport === "tablet" && responsive.hideOnTablet) return false;
  if (viewport === "desktop" && responsive.hideOnDesktop) return false;
  return true;
}
