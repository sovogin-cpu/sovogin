import {
  AttachmentBlock,
  ButtonBlock,
  ContentBlock,
  CtaBlock,
  DividerBlock,
  FormBlock,
  GalleryBlock,
  HeadingBlock,
  HeroBlock,
  ImageBlock,
  MapBlock,
  ParagraphBlock,
  QuoteBlock,
  SpacerBlock,
  SponsorsBlock,
  YoutubeBlock,
} from "./types";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const YOUTUBE_URL_REGEX =
  /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|embed\/|v\/)|youtu\.be\/)[a-zA-Z0-9_-]{11}(.*)?$/;

export function createBlockId(): string {
  return `blk_${crypto.randomUUID().replaceAll("-", "").slice(0, 16)}`;
}

export function isValidSafeHref(href: string): boolean {
  if (typeof href !== "string") return false;
  const trimmed = href.trim();
  if (!trimmed) return false;

  const lower = trimmed.toLowerCase();
  if (lower.startsWith("javascript:") || lower.startsWith("data:")) {
    return false;
  }

  if (trimmed.startsWith("/")) return true;
  if (lower.startsWith("https://")) return true;
  if (lower.startsWith("mailto:")) return true;
  if (lower.startsWith("tel:")) return true;

  return false;
}

// -----------------------------------------------------------------------------
// BLOCK CREATORS
// -----------------------------------------------------------------------------

export function createEmptyParagraphBlock(): ParagraphBlock {
  return {
    id: createBlockId(),
    type: "paragraph",
    version: 1,
    text: "",
  };
}

export function createEmptyHeadingBlock(): HeadingBlock {
  return {
    id: createBlockId(),
    type: "heading",
    version: 1,
    text: "",
    level: 2,
  };
}

export function createEmptyImageBlock(): ImageBlock {
  return {
    id: createBlockId(),
    type: "image",
    version: 1,
    mediaId: "",
    caption: "",
    altText: "",
  };
}

export function createEmptyYoutubeBlock(): YoutubeBlock {
  return {
    id: createBlockId(),
    type: "youtube",
    version: 1,
    url: "",
    caption: "",
  };
}

export function createEmptyAttachmentBlock(): AttachmentBlock {
  return {
    id: createBlockId(),
    type: "attachment",
    version: 1,
    mediaId: "",
    label: "",
  };
}

export function createEmptyHeroBlock(): HeroBlock {
  return {
    id: createBlockId(),
    type: "hero",
    version: 1,
    title: "",
    subtitle: "",
    mediaId: "",
    overlay: true,
    alignment: "center",
    primaryButton: { label: "", href: "" },
    secondaryButton: { label: "", href: "" },
  };
}

export function createEmptyButtonBlock(): ButtonBlock {
  return {
    id: createBlockId(),
    type: "button",
    version: 1,
    label: "",
    href: "",
    variant: "primary",
    alignment: "left",
    openInNewTab: false,
  };
}

export function createEmptyGalleryBlock(): GalleryBlock {
  return {
    id: createBlockId(),
    type: "gallery",
    version: 1,
    mediaIds: [],
    columns: 3,
    caption: "",
  };
}

export function createEmptyCtaBlock(): CtaBlock {
  return {
    id: createBlockId(),
    type: "cta",
    version: 1,
    title: "",
    text: "",
    buttonLabel: "",
    buttonHref: "",
    mediaId: "",
    style: "brand",
  };
}

export function createEmptySponsorsBlock(): SponsorsBlock {
  return {
    id: createBlockId(),
    type: "sponsors",
    version: 1,
    title: "Nuestros Patrocinadores",
    sponsorIds: [],
    showAllActive: true,
    displayStyle: "grid",
  };
}

export function createEmptyFormBlock(): FormBlock {
  return {
    id: createBlockId(),
    type: "form",
    version: 1,
    formKey: "contact",
    title: "",
    description: "",
  };
}

export function createEmptyMapBlock(): MapBlock {
  return {
    id: createBlockId(),
    type: "map",
    version: 1,
    title: "Nuestra Ubicación",
    address: "Calle 20 Norte No. 6N – 33, Cali – Valle",
    latitude: 3.4516,
    longitude: -76.532,
    zoom: 15,
  };
}

export function createEmptySpacerBlock(): SpacerBlock {
  return {
    id: createBlockId(),
    type: "spacer",
    version: 1,
    size: "medium",
  };
}

export function createEmptyDividerBlock(): DividerBlock {
  return {
    id: createBlockId(),
    type: "divider",
    version: 1,
    style: "subtle",
  };
}

export function createEmptyQuoteBlock(): QuoteBlock {
  return {
    id: createBlockId(),
    type: "quote",
    version: 1,
    text: "",
    author: "",
    source: "",
  };
}

// -----------------------------------------------------------------------------
// TYPE GUARDS
// -----------------------------------------------------------------------------

export function isParagraphBlock(block: ContentBlock): block is ParagraphBlock {
  return block.type === "paragraph";
}

export function isHeadingBlock(block: ContentBlock): block is HeadingBlock {
  return block.type === "heading";
}

export function isImageBlock(block: ContentBlock): block is ImageBlock {
  return block.type === "image";
}

export function isYoutubeBlock(block: ContentBlock): block is YoutubeBlock {
  return block.type === "youtube";
}

export function isAttachmentBlock(
  block: ContentBlock
): block is AttachmentBlock {
  return block.type === "attachment";
}

export function isHeroBlock(block: ContentBlock): block is HeroBlock {
  return block.type === "hero";
}

export function isButtonBlock(block: ContentBlock): block is ButtonBlock {
  return block.type === "button";
}

export function isGalleryBlock(block: ContentBlock): block is GalleryBlock {
  return block.type === "gallery";
}

export function isCtaBlock(block: ContentBlock): block is CtaBlock {
  return block.type === "cta";
}

export function isSponsorsBlock(block: ContentBlock): block is SponsorsBlock {
  return block.type === "sponsors";
}

export function isFormBlock(block: ContentBlock): block is FormBlock {
  return block.type === "form";
}

export function isMapBlock(block: ContentBlock): block is MapBlock {
  return block.type === "map";
}

export function isSpacerBlock(block: ContentBlock): block is SpacerBlock {
  return block.type === "spacer";
}

export function isDividerBlock(block: ContentBlock): block is DividerBlock {
  return block.type === "divider";
}

export function isQuoteBlock(block: ContentBlock): block is QuoteBlock {
  return block.type === "quote";
}

// -----------------------------------------------------------------------------
// VALIDATION & PARSING HELPERS
// -----------------------------------------------------------------------------

function isValidBlockObject(item: unknown): item is Record<string, unknown> {
  return typeof item === "object" && item !== null && !Array.isArray(item);
}

function isNonEmptyString(val: unknown): val is string {
  return typeof val === "string" && val.trim().length > 0;
}

function isValidUuid(val: unknown): boolean {
  return typeof val === "string" && UUID_REGEX.test(val.trim());
}

function isValidYoutubeUrl(val: unknown): boolean {
  return typeof val === "string" && YOUTUBE_URL_REGEX.test(val.trim());
}

function parseSingleBlock(rawBlock: unknown): ContentBlock | null {
  if (!isValidBlockObject(rawBlock)) return null;
  if (!isNonEmptyString(rawBlock.id)) return null;

  // Rule: version can be undefined (legacy compatibility) or exactly 1. Reject any other version.
  if (rawBlock.version !== undefined && rawBlock.version !== 1) {
    return null;
  }

  const id = rawBlock.id.trim();
  const type = rawBlock.type;

  switch (type) {
    case "paragraph": {
      if (typeof rawBlock.text !== "string") return null;
      return {
        id,
        type: "paragraph",
        version: 1,
        text: rawBlock.text,
      };
    }

    case "heading": {
      if (typeof rawBlock.text !== "string") return null;
      const level = rawBlock.level;
      if (level !== 2 && level !== 3) return null;
      return {
        id,
        type: "heading",
        version: 1,
        text: rawBlock.text,
        level,
      };
    }

    case "image": {
      if (!isValidUuid(rawBlock.mediaId)) return null;
      return {
        id,
        type: "image",
        version: 1,
        mediaId: (rawBlock.mediaId as string).trim(),
        caption: typeof rawBlock.caption === "string" ? rawBlock.caption : undefined,
        altText: typeof rawBlock.altText === "string" ? rawBlock.altText : undefined,
      };
    }

    case "youtube": {
      if (!isValidYoutubeUrl(rawBlock.url)) return null;
      return {
        id,
        type: "youtube",
        version: 1,
        url: (rawBlock.url as string).trim(),
        caption: typeof rawBlock.caption === "string" ? rawBlock.caption : undefined,
      };
    }

    case "attachment": {
      if (!isValidUuid(rawBlock.mediaId)) return null;
      if (!isNonEmptyString(rawBlock.label)) return null;
      return {
        id,
        type: "attachment",
        version: 1,
        mediaId: (rawBlock.mediaId as string).trim(),
        label: rawBlock.label.trim(),
      };
    }

    case "hero": {
      if (typeof rawBlock.title !== "string") return null;
      const alignment = rawBlock.alignment;
      if (alignment !== "left" && alignment !== "center" && alignment !== "right") {
        return null;
      }

      let primaryButton: HeroBlock["primaryButton"] = undefined;
      if (isValidBlockObject(rawBlock.primaryButton)) {
        if (
          isNonEmptyString(rawBlock.primaryButton.label) &&
          isValidSafeHref(rawBlock.primaryButton.href as string)
        ) {
          primaryButton = {
            label: (rawBlock.primaryButton.label as string).trim(),
            href: (rawBlock.primaryButton.href as string).trim(),
          };
        }
      }

      let secondaryButton: HeroBlock["secondaryButton"] = undefined;
      if (isValidBlockObject(rawBlock.secondaryButton)) {
        if (
          isNonEmptyString(rawBlock.secondaryButton.label) &&
          isValidSafeHref(rawBlock.secondaryButton.href as string)
        ) {
          secondaryButton = {
            label: (rawBlock.secondaryButton.label as string).trim(),
            href: (rawBlock.secondaryButton.href as string).trim(),
          };
        }
      }

      return {
        id,
        type: "hero",
        version: 1,
        title: rawBlock.title,
        subtitle: typeof rawBlock.subtitle === "string" ? rawBlock.subtitle : undefined,
        mediaId: isValidUuid(rawBlock.mediaId) ? (rawBlock.mediaId as string).trim() : undefined,
        overlay: typeof rawBlock.overlay === "boolean" ? rawBlock.overlay : undefined,
        alignment,
        primaryButton,
        secondaryButton,
      };
    }

    case "button": {
      if (!isNonEmptyString(rawBlock.label)) return null;
      if (!isValidSafeHref(rawBlock.href as string)) return null;
      const variant = rawBlock.variant;
      if (variant !== "primary" && variant !== "secondary" && variant !== "outline") {
        return null;
      }
      const alignment = rawBlock.alignment;
      if (alignment !== "left" && alignment !== "center" && alignment !== "right") {
        return null;
      }

      return {
        id,
        type: "button",
        version: 1,
        label: rawBlock.label.trim(),
        href: (rawBlock.href as string).trim(),
        variant,
        alignment,
        openInNewTab: Boolean(rawBlock.openInNewTab),
      };
    }

    case "gallery": {
      if (!Array.isArray(rawBlock.mediaIds)) return null;
      const validMediaIds: string[] = [];
      for (const mId of rawBlock.mediaIds) {
        if (isValidUuid(mId) && !validMediaIds.includes((mId as string).trim())) {
          validMediaIds.push((mId as string).trim());
        }
      }
      if (validMediaIds.length === 0) return null;

      const columns = rawBlock.columns;
      if (columns !== 2 && columns !== 3 && columns !== 4) return null;

      return {
        id,
        type: "gallery",
        version: 1,
        mediaIds: validMediaIds,
        columns,
        caption: typeof rawBlock.caption === "string" ? rawBlock.caption : undefined,
      };
    }

    case "cta": {
      if (typeof rawBlock.title !== "string") return null;
      if (!isNonEmptyString(rawBlock.buttonLabel)) return null;
      if (!isValidSafeHref(rawBlock.buttonHref as string)) return null;
      const style = rawBlock.style;
      if (style !== "light" && style !== "dark" && style !== "brand") return null;

      return {
        id,
        type: "cta",
        version: 1,
        title: rawBlock.title,
        text: typeof rawBlock.text === "string" ? rawBlock.text : undefined,
        buttonLabel: rawBlock.buttonLabel.trim(),
        buttonHref: (rawBlock.buttonHref as string).trim(),
        mediaId: isValidUuid(rawBlock.mediaId) ? (rawBlock.mediaId as string).trim() : undefined,
        style,
      };
    }

    case "sponsors": {
      const displayStyle = rawBlock.displayStyle;
      if (displayStyle !== "grid" && displayStyle !== "carousel") return null;

      let sponsorIds: string[] | undefined = undefined;
      if (Array.isArray(rawBlock.sponsorIds)) {
        sponsorIds = rawBlock.sponsorIds
          .filter(isValidUuid)
          .map((idVal) => (idVal as string).trim());
      }

      return {
        id,
        type: "sponsors",
        version: 1,
        title: typeof rawBlock.title === "string" ? rawBlock.title : undefined,
        sponsorIds,
        showAllActive: Boolean(rawBlock.showAllActive),
        displayStyle,
      };
    }

    case "form": {
      if (!isNonEmptyString(rawBlock.formKey)) return null;

      return {
        id,
        type: "form",
        version: 1,
        formKey: rawBlock.formKey.trim(),
        title: typeof rawBlock.title === "string" ? rawBlock.title : undefined,
        description: typeof rawBlock.description === "string" ? rawBlock.description : undefined,
      };
    }

    case "map": {
      if (typeof rawBlock.address !== "string") return null;

      let latitude: number | undefined = undefined;
      if (typeof rawBlock.latitude === "number") {
        if (rawBlock.latitude < -90 || rawBlock.latitude > 90) return null;
        latitude = rawBlock.latitude;
      }

      let longitude: number | undefined = undefined;
      if (typeof rawBlock.longitude === "number") {
        if (rawBlock.longitude < -180 || rawBlock.longitude > 180) return null;
        longitude = rawBlock.longitude;
      }

      let zoom: number | undefined = undefined;
      if (typeof rawBlock.zoom === "number") {
        if (rawBlock.zoom < 1 || rawBlock.zoom > 20) return null;
        zoom = rawBlock.zoom;
      }

      return {
        id,
        type: "map",
        version: 1,
        title: typeof rawBlock.title === "string" ? rawBlock.title : undefined,
        address: rawBlock.address,
        latitude,
        longitude,
        zoom,
      };
    }

    case "spacer": {
      const size = rawBlock.size;
      if (size !== "small" && size !== "medium" && size !== "large") return null;

      return {
        id,
        type: "spacer",
        version: 1,
        size,
      };
    }

    case "divider": {
      const style = rawBlock.style;
      if (style !== "solid" && style !== "dashed" && style !== "subtle") return null;

      return {
        id,
        type: "divider",
        version: 1,
        style,
      };
    }

    case "quote": {
      if (typeof rawBlock.text !== "string") return null;

      return {
        id,
        type: "quote",
        version: 1,
        text: rawBlock.text,
        author: typeof rawBlock.author === "string" ? rawBlock.author : undefined,
        source: typeof rawBlock.source === "string" ? rawBlock.source : undefined,
      };
    }

    default:
      return null;
  }
}

export function validateContentBlocks(value: unknown): boolean {
  if (!Array.isArray(value)) return false;
  return value.every((block) => parseSingleBlock(block) !== null);
}

export function parseContentBlocks(value: unknown): ContentBlock[] {
  if (!Array.isArray(value)) {
    return [createEmptyParagraphBlock()];
  }

  const validBlocks: ContentBlock[] = [];

  for (const item of value) {
    const parsed = parseSingleBlock(item);
    if (parsed !== null) {
      validBlocks.push(parsed);
    }
  }

  if (validBlocks.length === 0) {
    return [createEmptyParagraphBlock()];
  }

  return validBlocks;
}
