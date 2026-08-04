export type ContentChannel = "innovation" | "community" | "news" | "benefits";
export type ContentPostStatus = "draft" | "published" | "archived";
export type ContentVisibility = "public" | "members_only";
export type ContentDocumentMode = "article" | "page";

/**
 * Nota de Versionado de Bloques:
 * La propiedad 'version' permite evolucionar la estructura de bloques en el futuro.
 * La versión actual de todos los bloques es 1.
 * El parser de bloques normaliza automáticamente bloques antiguos sin la propiedad 'version' a versión 1.
 */

export type ContentBlockType =
  | "paragraph"
  | "heading"
  | "image"
  | "youtube"
  | "attachment"
  | "hero"
  | "button"
  | "gallery"
  | "cta"
  | "sponsors"
  | "form"
  | "map"
  | "spacer"
  | "divider"
  | "quote";

export interface ParagraphBlock {
  id: string;
  type: "paragraph";
  version: 1;
  text: string;
}

export interface HeadingBlock {
  id: string;
  type: "heading";
  version: 1;
  text: string;
  level: 2 | 3;
}

export interface ImageBlock {
  id: string;
  type: "image";
  version: 1;
  mediaId: string;
  caption?: string;
  altText?: string;
}

export interface YoutubeBlock {
  id: string;
  type: "youtube";
  version: 1;
  url: string;
  caption?: string;
}

export interface AttachmentBlock {
  id: string;
  type: "attachment";
  version: 1;
  mediaId: string;
  label: string;
}

export interface HeroBlock {
  id: string;
  type: "hero";
  version: 1;
  title: string;
  subtitle?: string;
  mediaId?: string;
  overlay?: boolean;
  alignment: "left" | "center" | "right";
  primaryButton?: {
    label: string;
    href: string;
  };
  secondaryButton?: {
    label: string;
    href: string;
  };
}

export interface ButtonBlock {
  id: string;
  type: "button";
  version: 1;
  label: string;
  href: string;
  variant: "primary" | "secondary" | "outline";
  alignment: "left" | "center" | "right";
  openInNewTab: boolean;
}

export interface GalleryBlock {
  id: string;
  type: "gallery";
  version: 1;
  mediaIds: string[];
  columns: 2 | 3 | 4;
  caption?: string;
}

export interface CtaBlock {
  id: string;
  type: "cta";
  version: 1;
  title: string;
  text?: string;
  buttonLabel: string;
  buttonHref: string;
  mediaId?: string;
  style: "light" | "dark" | "brand";
}

export interface SponsorsBlock {
  id: string;
  type: "sponsors";
  version: 1;
  title?: string;
  sponsorIds?: string[];
  showAllActive: boolean;
  displayStyle: "grid" | "carousel";
}

export interface FormBlock {
  id: string;
  type: "form";
  version: 1;
  formKey: string;
  title?: string;
  description?: string;
}

export interface MapBlock {
  id: string;
  type: "map";
  version: 1;
  title?: string;
  address: string;
  latitude?: number;
  longitude?: number;
  zoom?: number;
}

export interface SpacerBlock {
  id: string;
  type: "spacer";
  version: 1;
  size: "small" | "medium" | "large";
}

export interface DividerBlock {
  id: string;
  type: "divider";
  version: 1;
  style: "solid" | "dashed" | "subtle";
}

export interface QuoteBlock {
  id: string;
  type: "quote";
  version: 1;
  text: string;
  author?: string;
  source?: string;
}

export type ContentBlock =
  | ParagraphBlock
  | HeadingBlock
  | ImageBlock
  | YoutubeBlock
  | AttachmentBlock
  | HeroBlock
  | ButtonBlock
  | GalleryBlock
  | CtaBlock
  | SponsorsBlock
  | FormBlock
  | MapBlock
  | SpacerBlock
  | DividerBlock
  | QuoteBlock;

export interface ContentPost {
  id: string;
  channel: ContentChannel;
  title: string;
  slug: string;
  excerpt: string | null;
  content: ContentBlock[];
  featured_media_id: string | null;
  author_id: string | null;
  updated_by: string | null;
  status: ContentPostStatus;
  visibility: ContentVisibility;
  published_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContentCategory {
  id: string;
  channel: ContentChannel | null;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ContentPostCategory {
  post_id: string;
  category_id: string;
  created_at?: string;
}

export interface FeaturedMediaSummary {
  id: string;
  storage_bucket: string;
  storage_path: string;
  original_filename: string;
  alt_text: string | null;
}

export interface ContentPostWithRelations extends ContentPost {
  categories?: ContentCategory[];
  featured_media?: FeaturedMediaSummary | null;
}

export interface ContentPostFormData {
  title: string;
  slug?: string;
  channel: ContentChannel;
  excerpt?: string;
  content: ContentBlock[];
  featured_media_id?: string | null;
  status: ContentPostStatus;
  visibility: ContentVisibility;
  published_at?: string | null;
  seo_title?: string;
  seo_description?: string;
  is_featured: boolean;
  categoryIds: string[];
}

export interface ContentPostFilters {
  channel?: ContentChannel;
  status?: ContentPostStatus;
  visibility?: ContentVisibility;
  categoryId?: string;
  search?: string;
  isFeatured?: boolean;
}
