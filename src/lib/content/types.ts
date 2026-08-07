import { BlockLayoutConfig } from "./block-layout-types";

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

export interface BaseBlock {
  id: string;
  version: 1;
  layout?: BlockLayoutConfig;
}

export interface ParagraphBlock extends BaseBlock {
  type: "paragraph";
  text: string;
}

export interface HeadingBlock extends BaseBlock {
  type: "heading";
  text: string;
  level: 2 | 3;
}

export interface ImageBlock extends BaseBlock {
  type: "image";
  mediaId: string;
  caption?: string;
  altText?: string;
}

export interface YoutubeBlock extends BaseBlock {
  type: "youtube";
  url: string;
  caption?: string;
}

export interface AttachmentBlock extends BaseBlock {
  type: "attachment";
  mediaId: string;
  label: string;
}

export interface HeroBlock extends BaseBlock {
  type: "hero";
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

export interface ButtonBlock extends BaseBlock {
  type: "button";
  label: string;
  href: string;
  variant: "primary" | "secondary" | "outline";
  alignment: "left" | "center" | "right";
  openInNewTab: boolean;
}

export interface GalleryBlock extends BaseBlock {
  type: "gallery";
  mediaIds: string[];
  columns: 2 | 3 | 4;
  caption?: string;
}

export interface CtaBlock extends BaseBlock {
  type: "cta";
  title: string;
  text?: string;
  buttonLabel: string;
  buttonHref: string;
  mediaId?: string;
  style: "light" | "dark" | "brand";
}

export interface SponsorsBlock extends BaseBlock {
  type: "sponsors";
  title?: string;
  sponsorIds?: string[];
  showAllActive: boolean;
  displayStyle: "grid" | "carousel";
}

export interface FormBlock extends BaseBlock {
  type: "form";
  formKey: string;
  title?: string;
  description?: string;
}

export interface MapBlock extends BaseBlock {
  type: "map";
  title?: string;
  address: string;
  latitude?: number;
  longitude?: number;
  zoom?: number;
}

export interface SpacerBlock extends BaseBlock {
  type: "spacer";
  size: "small" | "medium" | "large";
}

export interface DividerBlock extends BaseBlock {
  type: "divider";
  style: "solid" | "dashed" | "subtle";
}

export interface QuoteBlock extends BaseBlock {
  type: "quote";
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
