import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { resolveAssociateSession } from "@/lib/portal/portal-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getMembersOnlyContentBySlug } from "@/lib/content/members-content-service";
import { ContentPostPage } from "@/components/content/public/ContentPostPage";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getMembersOnlyContentBySlug(supabaseAdmin, slug);

  if (!post) {
    return {
      title: "Contenido Exclusivo | SOVOGIN Portal",
    };
  }

  return {
    title: `${post.title} | Exclusivo Miembros SOVOGIN`,
    description: post.excerpt || undefined,
  };
}

export default async function PortalMembersOnlyPostPage({ params }: PageProps) {
  const { slug } = await params;

  // 1. Verificación de Seguridad Server-Side de Asociado Activo
  const session = await resolveAssociateSession();

  if (session.error || !session.associate || session.associate.status !== "Activo") {
    redirect("/portal/login");
  }

  // 2. Cargar post exclusivo status = published AND visibility = members_only
  const post = await getMembersOnlyContentBySlug(supabaseAdmin, slug);

  if (!post) {
    notFound();
  }

  return <ContentPostPage post={post} basePath="/portal" />;
}
