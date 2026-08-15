import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { generateCheckInToken, hashCheckInToken } from "@/lib/registrations/checkin-token";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Verificación de Autenticación Server-Side
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // 2. Verificación de Rol de Administrador
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Acceso denegado. Permisos de administrador requeridos." },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { registrationId } = body;

    if (!registrationId || typeof registrationId !== "string") {
      return NextResponse.json(
        { error: "registrationId es requerido." },
        { status: 400 }
      );
    }

    // 3. Buscar la inscripción
    const { data: registration, error: regError } = await supabase
      .from("registrations")
      .select("id, checkin_token_hash, full_name, status, events(id, title)")
      .eq("id", registrationId)
      .maybeSingle();

    if (regError || !registration) {
      return NextResponse.json(
        { error: "Inscripción no encontrada." },
        { status: 404 }
      );
    }

    // 4. Generar nuevo token opaco en el servidor
    const rawToken = generateCheckInToken();
    const tokenHash = hashCheckInToken(rawToken);

    // 5. Guardar únicamente el hash en la base de datos
    const { error: updateError } = await supabase
      .from("registrations")
      .update({ checkin_token_hash: tokenHash })
      .eq("id", registrationId);

    if (updateError) {
      console.error("Error al asignar token hash:", updateError);
      return NextResponse.json(
        { error: "Error al registrar el token de acreditación." },
        { status: 500 }
      );
    }

    // 6. Devolver el token plano al administrador autenticado
    const eventData = Array.isArray(registration.events)
      ? registration.events[0]
      : registration.events;

    return NextResponse.json({
      token: rawToken,
      registrationId: registration.id,
      fullName: registration.full_name,
      eventTitle: eventData?.title || "",
      status: registration.status,
    });
  } catch (error: unknown) {
    console.error("Error en generate-token route:", error);
    return NextResponse.json(
      { error: "Error interno al generar credencial QR." },
      { status: 500 }
    );
  }
}
