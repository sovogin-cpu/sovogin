import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { hashCheckInToken, isValidCheckInTokenFormat } from "@/lib/registrations/checkin-token";

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

    // 3. Procesar Payload
    const body = await request.json();
    const { token } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Código QR no válido o ausente." },
        { status: 400 }
      );
    }

    const cleanToken = token.trim();

    // 4. Calcular Hash SHA-256 para búsqueda segura
    let tokenHash = cleanToken;
    if (isValidCheckInTokenFormat(cleanToken)) {
      tokenHash = hashCheckInToken(cleanToken);
    }

    // 5. Buscar inscripción por checkin_token_hash
    const { data: registration, error: regError } = await supabase
      .from("registrations")
      .select("id, event_id, full_name, category, modality, status, checked_in_at, events(id, title)")
      .eq("checkin_token_hash", tokenHash)
      .maybeSingle();

    if (regError || !registration) {
      return NextResponse.json(
        { error: "Código QR no válido o no reconocido." },
        { status: 404 }
      );
    }

    // 6. Retornar únicamente metadatos administrativos indispensables
    const eventData = Array.isArray(registration.events)
      ? registration.events[0]
      : registration.events;

    return NextResponse.json({
      registrationId: registration.id,
      eventId: registration.event_id,
      fullName: registration.full_name,
      eventTitle: eventData?.title || "Evento no especificado",
      category: registration.category || "General",
      modality: registration.modality || "presencial",
      status: registration.status,
      checkedIn: !!registration.checked_in_at,
      checkedInAt: registration.checked_in_at,
    });
  } catch (error: unknown) {
    console.error("Error en verify check-in:", error);
    return NextResponse.json(
      { error: "Error interno al verificar el código QR." },
      { status: 500 }
    );
  }
}
