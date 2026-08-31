import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import {
  deriveCollectionStatus,
  deriveFollowUpState,
} from "@/lib/collections/collections-service";

type RouteParams = {
  params: Promise<{ associateId: string }>;
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

const VALID_CHANNELS = ["email", "phone", "whatsapp", "in_person", "other", "system"];
const VALID_ACTION_TYPES = [
  "initial_reminder",
  "payment_notice",
  "follow_up",
  "payment_promise",
  "dispute",
  "escalation",
  "note",
];
const VALID_RESULT_STATUSES = [
  "contacted",
  "no_answer",
  "promise_agreed",
  "disputed",
  "pending",
];

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { associateId } = await params;
    const cleanAssociateId = associateId?.trim();

    if (!cleanAssociateId || !UUID_REGEX.test(cleanAssociateId)) {
      return NextResponse.json(
        { error: "associateId es requerido y debe ser un UUID válido." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 1. Autenticación SSR
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // 2. Verificación de Rol Admin
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Error al verificar perfil de administrador:", profileError);
      return NextResponse.json(
        { error: "Error al verificar permisos de usuario." },
        { status: 500 }
      );
    }

    if (profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Acceso denegado. Se requieren permisos de administrador." },
        { status: 403 }
      );
    }

    // 3. Consultar Historial de Gestiones con Join Relacional a Profiles (Aislamiento de Privacidad: full_name, email)
    const { data: actions, error: actionsError } = await supabase
      .from("collection_actions")
      .select("id, associate_id, performed_by, channel, action_type, result_status, notes, promised_payment_date, promised_payment_amount, next_follow_up_at, created_at, performed_by_profile:profiles!collection_actions_performed_by_fkey(full_name)")
      .eq("associate_id", cleanAssociateId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: true });

    if (actionsError) {
      console.error("Error al consultar gestiones de cobranza:", actionsError);
      return NextResponse.json(
        { error: "Error al consultar la bitácora de cobranza." },
        { status: 500 }
      );
    }

    // 4. Consultar Reporte Financiero de Aging para este asociado específico
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      "get_membership_aging_report",
      {
        p_as_of_date: new Date().toISOString().substring(0, 10),
        p_associate_id: cleanAssociateId,
      }
    );

    if (rpcError) {
      console.error("Error al invocar RPC get_membership_aging_report:", rpcError);
      return NextResponse.json(
        { error: "Error al consultar el resumen financiero del asociado." },
        { status: 500 }
      );
    }

    let associateAgingItem = null;
    if (rpcData?.associates && rpcData.associates.length > 0) {
      associateAgingItem = rpcData.associates[0];
    }

    // 5. Calcular Estados Derivados usando Helpers Aprobados
    const collectionActionsList = actions || [];
    const collectionStatus = deriveCollectionStatus(
      associateAgingItem?.account_status || "AL DÍA",
      collectionActionsList
    );
    const followUpState = deriveFollowUpState(collectionActionsList);

    return NextResponse.json({
      success: true,
      actions: collectionActionsList,
      aging: associateAgingItem,
      collection_status: collectionStatus,
      follow_up_state: followUpState,
    });
  } catch (error: unknown) {
    console.error("Error no controlado en GET /api/admin/collections/[associateId]/actions:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error al procesar la consulta de gestiones de cobranza.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { associateId } = await params;
    const cleanAssociateId = associateId?.trim();

    if (!cleanAssociateId || !UUID_REGEX.test(cleanAssociateId)) {
      return NextResponse.json(
        { error: "associateId es requerido y debe ser un UUID válido." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 1. Autenticación SSR
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // 2. Verificación de Rol Admin
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      console.error("Error al verificar perfil de administrador:", profileError);
      return NextResponse.json(
        { error: "Error al verificar permisos de usuario." },
        { status: 500 }
      );
    }

    if (profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Acceso denegado. Se requieren permisos de administrador." },
        { status: 403 }
      );
    }

    // 3. Lectura y Validación de Payload
    const body = await request.json();
    const {
      channel,
      action_type,
      result_status,
      notes,
      promised_payment_date,
      promised_payment_amount,
      next_follow_up_at,
    } = body || {};

    if (!channel || !VALID_CHANNELS.includes(channel)) {
      return NextResponse.json(
        { error: `Canal inválido. Valores permitidos: ${VALID_CHANNELS.join(", ")}` },
        { status: 400 }
      );
    }

    if (!action_type || !VALID_ACTION_TYPES.includes(action_type)) {
      return NextResponse.json(
        { error: `Tipo de acción inválido. Valores permitidos: ${VALID_ACTION_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    if (result_status === "resolved") {
      return NextResponse.json(
        { error: "El estado de resultado 'resolved' no está permitido en una gestión." },
        { status: 400 }
      );
    }

    if (!result_status || !VALID_RESULT_STATUSES.includes(result_status)) {
      return NextResponse.json(
        { error: `Estado de resultado inválido. Valores permitidos: ${VALID_RESULT_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    // Validación de Fecha Prometida (YYYY-MM-DD)
    if (promised_payment_date) {
      if (typeof promised_payment_date !== "string" || !DATE_REGEX.test(promised_payment_date)) {
        return NextResponse.json(
          { error: "La fecha prometida debe tener el formato YYYY-MM-DD." },
          { status: 400 }
        );
      }
      const parsedDate = new Date(promised_payment_date + "T00:00:00Z");
      if (isNaN(parsedDate.getTime())) {
        return NextResponse.json(
          { error: "La fecha prometida no es una fecha válida." },
          { status: 400 }
        );
      }
    }

    // Validación de Monto Prometido
    let parsedPromisedAmount: number | null = null;
    if (promised_payment_amount !== undefined && promised_payment_amount !== null && promised_payment_amount !== "") {
      parsedPromisedAmount = Number(promised_payment_amount);
      if (isNaN(parsedPromisedAmount) || parsedPromisedAmount < 0) {
        return NextResponse.json(
          { error: "El monto prometido debe ser un valor numérico no negativo." },
          { status: 400 }
        );
      }
    }

    // Validación de Próximo Seguimiento (ISO Datetime)
    let formattedFollowUpIso: string | null = null;
    if (next_follow_up_at) {
      if (typeof next_follow_up_at !== "string") {
        return NextResponse.json(
          { error: "La fecha de próximo seguimiento debe ser una cadena ISO válida." },
          { status: 400 }
        );
      }
      const parsedFollowUp = new Date(next_follow_up_at);
      if (isNaN(parsedFollowUp.getTime())) {
        return NextResponse.json(
          { error: "La fecha de próximo seguimiento no es una fecha u hora válida." },
          { status: 400 }
        );
      }
      formattedFollowUpIso = parsedFollowUp.toISOString();
    }

    // 4. Confirmar Existencia del Asociado en Base de Datos
    const { data: associate, error: associateError } = await supabase
      .from("associates")
      .select("id")
      .eq("id", cleanAssociateId)
      .maybeSingle();

    if (associateError) {
      console.error("Error al consultar existencia del asociado:", associateError);
      return NextResponse.json(
        { error: "Error al validar el asociado en la base de datos." },
        { status: 500 }
      );
    }

    if (!associate) {
      return NextResponse.json(
        { error: "El asociado especificado no existe." },
        { status: 404 }
      );
    }

    // 5. Anti-Spoofing: performed_by derivado estrictamente de auth.uid() en servidor
    const performed_by = user.id;

    // 6. Insertar Registro Append-Only (Políticas RLS & REVOKE UPDATE/DELETE aplicados)
    const insertPayload = {
      associate_id: cleanAssociateId,
      performed_by,
      channel,
      action_type,
      result_status,
      notes: notes && typeof notes === "string" ? notes.trim() : null,
      promised_payment_date: promised_payment_date || null,
      promised_payment_amount: parsedPromisedAmount,
      next_follow_up_at: formattedFollowUpIso,
    };

    const { data: newAction, error: insertError } = await supabase
      .from("collection_actions")
      .insert(insertPayload)
      .select("id, associate_id, performed_by, channel, action_type, result_status, notes, promised_payment_date, promised_payment_amount, next_follow_up_at, created_at, performed_by_profile:profiles!collection_actions_performed_by_fkey(full_name)")
      .single();

    if (insertError) {
      console.error("Error al registrar gestión de cobranza:", insertError);
      return NextResponse.json(
        { error: `Error al registrar la gestión: ${insertError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        action: newAction,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Error no controlado en POST /api/admin/collections/[associateId]/actions:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error al registrar la gestión de cobranza.",
      },
      { status: 500 }
    );
  }
}
