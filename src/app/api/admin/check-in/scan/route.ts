import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { hashCheckInToken, isValidCheckInTokenFormat } from "@/lib/registrations/checkin-token";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Validar Sesión Autenticada
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // 2. Validar Rol de Administrador en el Servidor
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
    const { token, eventId } = body;

    if (!token || typeof token !== "string") {
      return NextResponse.json(
        { error: "Código QR no válido o no proporcionado." },
        { status: 400 }
      );
    }

    if (!eventId || typeof eventId !== "string") {
      return NextResponse.json(
        { error: "Debe seleccionar un evento activo para realizar el check-in." },
        { status: 400 }
      );
    }

    const cleanToken = token.trim();
    if (!isValidCheckInTokenFormat(cleanToken)) {
      return NextResponse.json(
        { error: "Código QR no válido o no reconocido." },
        { status: 400 }
      );
    }

    const tokenHash = hashCheckInToken(cleanToken);

    // 4. Localizar Inscripción y Evento
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

    const eventData = Array.isArray(registration.events)
      ? registration.events[0]
      : registration.events;

    // 5. Validar que la inscripción corresponda al evento seleccionado
    if (registration.event_id !== eventId) {
      return NextResponse.json(
        {
          error: "Esta inscripción pertenece a otro evento.",
          code: "EVENT_MISMATCH",
          fullName: registration.full_name,
          actualEventTitle: eventData?.title || "Otro evento",
        },
        { status: 422 }
      );
    }

    // 6. Validar Estado de la Inscripción (confirmed)
    if (registration.status === "pending") {
      return NextResponse.json(
        {
          error: "INSCRIPCIÓN PENDIENTE",
          code: "REGISTRATION_PENDING",
          fullName: registration.full_name,
          eventTitle: eventData?.title,
        },
        { status: 422 }
      );
    }

    if (registration.status === "cancelled") {
      return NextResponse.json(
        {
          error: "INSCRIPCIÓN CANCELADA",
          code: "REGISTRATION_CANCELLED",
          fullName: registration.full_name,
          eventTitle: eventData?.title,
        },
        { status: 422 }
      );
    }

    if (registration.status !== "confirmed") {
      return NextResponse.json(
        {
          error: `Inscripción con estado no válido (${registration.status}).`,
          code: "INVALID_STATUS",
          fullName: registration.full_name,
        },
        { status: 422 }
      );
    }

    // 7. Idempotencia y Registro de Check-in
    if (registration.checked_in_at) {
      // Ya había ingresado previamente. NO cambiar la fecha original.
      return NextResponse.json({
        alreadyCheckedIn: true,
        fullName: registration.full_name,
        eventTitle: eventData?.title || "",
        category: registration.category || "General",
        modality: registration.modality || "presencial",
        checkedInAt: registration.checked_in_at,
        message: "Participante ya había ingresado previamente.",
      });
    }

    // Registrar ingreso por primera vez con protección atómica contra Race Condition
    const nowIso = new Date().toISOString();
    const { data: updatedRecord, error: updateError } = await supabase
      .from("registrations")
      .update({
        checked_in_at: nowIso,
        checked_in_by: user.id,
        check_in_method: "qr",
      })
      .eq("id", registration.id)
      .is("checked_in_at", null)
      .select("checked_in_at")
      .maybeSingle();

    if (updateError) {
      console.error("Error al actualizar ingreso por QR:", updateError);
      return NextResponse.json(
        { error: "Error al registrar el ingreso en la base de datos." },
        { status: 500 }
      );
    }

    if (!updatedRecord) {
      // 0 filas actualizadas: otro operador registró el ingreso de forma simultánea.
      // Re-consultar la hora registrada original y responder idempotentemente sin sobrescribir.
      const { data: currentReg } = await supabase
        .from("registrations")
        .select("checked_in_at")
        .eq("id", registration.id)
        .maybeSingle();

      const originalCheckedInAt =
        currentReg?.checked_in_at || registration.checked_in_at || nowIso;

      return NextResponse.json({
        alreadyCheckedIn: true,
        fullName: registration.full_name,
        eventTitle: eventData?.title || "",
        category: registration.category || "General",
        modality: registration.modality || "presencial",
        checkedInAt: originalCheckedInAt,
        message: "Participante ya había ingresado previamente.",
      });
    }

    return NextResponse.json({
      success: true,
      alreadyCheckedIn: false,
      fullName: registration.full_name,
      eventTitle: eventData?.title || "",
      category: registration.category || "General",
      modality: registration.modality || "presencial",
      checkedInAt: nowIso,
      message: "✓ INGRESO REGISTRADO",
    });
  } catch (error: unknown) {
    console.error("Error en scan check-in:", error);
    return NextResponse.json(
      { error: "Error interno en el servidor de escaneo." },
      { status: 500 }
    );
  }
}
