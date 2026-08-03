import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

interface VerifyRequestBody {
  email?: unknown;
  documentNumber?: unknown;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as VerifyRequestBody | null;

    if (
      !body ||
      typeof body.email !== "string" ||
      typeof body.documentNumber !== "string"
    ) {
      return NextResponse.json(
        { valid: false },
        {
          status: 400,
          headers: { "Cache-Control": "no-store, max-age=0" },
        }
      );
    }

    const emailNormalized = body.email.trim().toLowerCase();
    const documentNormalized = body.documentNumber.trim();

    if (!emailNormalized || !documentNormalized) {
      return NextResponse.json(
        { valid: false },
        {
          status: 200,
          headers: { "Cache-Control": "no-store, max-age=0" },
        }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { valid: false, error: "Error de configuración de servidor" },
        {
          status: 500,
          headers: { "Cache-Control": "no-store, max-age=0" },
        }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data, error } = await supabaseAdmin
      .from("associates")
      .select("id")
      .eq("email", emailNormalized)
      .eq("document_number", documentNormalized)
      .eq("status", "Activo")
      .maybeSingle();

    if (error) {
      console.error("Error al consultar la tabla associates en verificación");
      return NextResponse.json(
        { valid: false, error: "Error interno del servidor" },
        {
          status: 500,
          headers: { "Cache-Control": "no-store, max-age=0" },
        }
      );
    }

    const isValid = Boolean(data && data.id);

    return NextResponse.json(
      { valid: isValid },
      {
        status: 200,
        headers: { "Cache-Control": "no-store, max-age=0" },
      }
    );
  } catch {
    return NextResponse.json(
      { valid: false, error: "Error interno del servidor" },
      {
        status: 500,
        headers: { "Cache-Control": "no-store, max-age=0" },
      }
    );
  }
}
