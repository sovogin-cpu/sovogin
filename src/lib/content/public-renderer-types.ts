import { ContentBlock } from "./types";

export type PublicViewerType = "public" | "member";

export interface ResolvedPublicMedia {
  id: string;
  title: string;
  alt_text: string | null;
  mime_type: string;
  signedUrl: string | null;
  original_filename: string;
  file_size: number;
}

export type ResolvedPublicMediaMap = Record<string, ResolvedPublicMedia>;

export interface PublicBlockRendererProps<T extends ContentBlock = ContentBlock> {
  block: T;
  mediaMap: ResolvedPublicMediaMap;
  viewerType: PublicViewerType;
}

export interface PageBuilderRendererProps {
  blocks: ContentBlock[];
  viewerType?: PublicViewerType;
  className?: string;
}
