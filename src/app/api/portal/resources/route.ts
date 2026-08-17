import { NextRequest, NextResponse } from "next/server";
import { resolveAssociateSession } from "@/lib/portal/portal-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export interface PortalResourceItem {
  id: string;
  title: string;
  category: string;
  resource_type: string;
  file_url: string;
  description?: string | null;
  format?: string | null;
  created_at: string;
  signedUrl?: string | null;
}

export async function GET(request: NextRequest) {
  try {
    // 1. Verificación de Seguridad Server-Side
    const session = await resolveAssociateSession();

    if (session.error || !session.associate) {
      return NextResponse.json(
        { success: false, error: session.error || "Acceso no autorizado." },
        { status: session.status }
      );
    }

    if (session.associate.status !== "Activo") {
      return NextResponse.json(
        { success: false, error: "Su membresía SOVOGIN no se encuentra activa." },
        { status: 403 }
      );
    }

    // 2. Consultar recursos exclusivamente desde la base de datos
    const { data: resources, error: resourcesError } = await supabaseAdmin
      .from("resources")
      .select("id, title, category, resource_type, file_url, description, format, visibility, created_at")
      .order("created_at", { ascending: false });

    if (resourcesError) {
      console.error("Error al consultar recursos del portal:", resourcesError);
      return NextResponse.json(
        { success: false, error: "No se pudieron cargar los recursos de la biblioteca." },
        { status: 500 }
      );
    }

    const list = (resources as PortalResourceItem[]) || [];

    // 3. Generar URLs firmadas para archivos en storage si corresponde
    const resolvedList = await Promise.all(
      list.map(async (res) => {
        let signedUrl: string | null = null;

        // Si file_url es una ruta de storage interna (no empieza con http/https)
        if (res.file_url && !res.file_url.startsWith("http://") && !res.file_url.startsWith("https://")) {
          const isPrivateBucket = res.file_url.startsWith("member-resources/") || res.file_url.startsWith("private/");
          const bucketName = isPrivateBucket ? "member-resources" : "media-library";
          const storagePath = isPrivateBucket ? res.file_url.replace(/^(member-resources\/|private\/)/, "") : res.file_url;

          try {
            const { data } = await supabaseAdmin.storage
              .from(bucketName)
              .createSignedUrl(storagePath, 3600);
            signedUrl = data?.signedUrl || null;
          } catch {
            signedUrl = null;
          }
        } else {
          signedUrl = res.file_url || null;
        }

        return {
          ...res,
          signedUrl,
        };
      })
    );

    return NextResponse.json({
      success: true,
      count: resolvedList.length,
      resources: resolvedList,
    });
  } catch (error: unknown) {
    console.error("Excepción en GET /api/portal/resources:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Ocurrió un error inesperado al obtener los recursos.",
      },
      { status: 500 }
    );
  }
}
