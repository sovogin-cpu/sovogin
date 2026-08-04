import { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { getPublishedContentBySlug } from "@/lib/content/public-content-service";
import { normalizeContentSlug } from "@/lib/content/content-utils";
import { ContentPostPage } from "@/components/content/public/ContentPostPage";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const normalizedSlug = normalizeContentSlug(slug);
  const supabase = createClient();
  const post = await getPublishedContentBySlug(supabase, "innovation", normalizedSlug);

  if (!post) {
    return {
      title: "Publicación no encontrada | SOVOGIN",
    };
  }

  return {
    title: `${post.seo_title || post.title} | SOVOGIN`,
    description: post.seo_description || post.excerpt || undefined,
  };
}

export default async function InnovacionPostPage({ params }: PageProps) {
  const { slug } = await params;
  const normalizedSlug = normalizeContentSlug(slug);
  const supabase = createClient();

  const post = await getPublishedContentBySlug(supabase, "innovation", normalizedSlug);

  if (!post) {
    notFound();
  }

  return <ContentPostPage post={post} basePath="/innovacion" />;
}
