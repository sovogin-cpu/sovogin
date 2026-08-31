import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { getMembershipAgingReport } from "@/lib/memberships/aging-engine";
import { CollectionAction } from "@/lib/collections/types";
import { enrichAssociatesWithCollectionsStatus } from "@/lib/collections/collections-dashboard-service";
import { getPaymentPromisesMonitor } from "@/lib/collections/collections-queue-service";
import {
  reserveNotificationEvent,
  NotificationFreshStateLoader,
  NotificationReservationRepository,
  NewNotificationRecord,
  ReservedNotificationEvent,
  ExistingNotificationEvent,
  ReservationCandidatePayload,
} from "@/lib/collections/collections-notification-reservation-service";
import {
  AutomationChannel,
  AutomationTriggerCode,
  NotificationEventRecord,
} from "@/lib/collections/collections-automation-service";

export const dynamic = "force-dynamic";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const VALID_AUTOMATION_TYPES: Set<AutomationTriggerCode> = new Set([
  "PRE_DUE_5D",
  "PRE_DUE_1D",
  "DUE_DATE",
  "OVERDUE_1D",
  "OVERDUE_7D",
  "OVERDUE_15D",
  "OVERDUE_30D",
  "PROMISE_1D",
  "PROMISE_DUE",
  "PROMISE_BROKEN",
]);

const ALLOWED_BODY_KEYS = new Set([
  "associate_id",
  "expected_automation_type",
  "expected_reference_date",
  "expected_channel",
]);

export interface ReservationRequestBody {
  associate_id: string;
  expected_automation_type: AutomationTriggerCode;
  expected_reference_date: string;
  expected_channel: AutomationChannel;
}

export async function POST(request: Request) {
  const headers = { "Cache-Control": "private, no-store, max-age=0" };

  try {
    // 1. Server-Side Fail-Closed Normalized Origin Header Validation (CSRF Protection)
    const originHeader = request.headers.get("origin");
    if (!originHeader) {
      return NextResponse.json(
        { error: "Acceso denegado. Encabezado de origen ausente." },
        { status: 403, headers }
      );
    }

    let parsedHeaderOrigin: string;
    let requestOrigin: string;
    try {
      parsedHeaderOrigin = new URL(originHeader).origin;
      requestOrigin = new URL(request.url).origin;
    } catch {
      return NextResponse.json(
        { error: "Acceso denegado. Encabezado de origen o URL de solicitud no válida." },
        { status: 403, headers }
      );
    }

    if (parsedHeaderOrigin !== requestOrigin) {
      return NextResponse.json(
        { error: "Acceso denegado. Encabezado de origen no coincide con el servidor de la aplicación." },
        { status: 403, headers }
      );
    }

    // 2. Strict Content-Type Header Validation
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.toLowerCase().includes("application/json")) {
      return NextResponse.json(
        { error: "Formato de solicitud no soportado. Tipo de contenido application/json requerido." },
        { status: 415, headers }
      );
    }

    // 3. Supabase Authentication Context
    let supabase;
    try {
      supabase = await createClient();
    } catch {
      return NextResponse.json(
        { error: "Acceso no autorizado. Debe iniciar sesión." },
        { status: 401, headers }
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Acceso no autorizado. Debe iniciar sesión." },
        { status: 401, headers }
      );
    }

    // 4. Authorization Check (Admin profile role check via RLS authenticated client)
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Acceso denegado. Se requieren permisos de administrador." },
        { status: 403, headers }
      );
    }

    // 5. Parse & Validate Strict Request Payload (Fail-Closed on Extra/Unknown Keys)
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Cuerpo de solicitud inválido. Formato JSON no válido." },
        { status: 400, headers }
      );
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Cuerpo de solicitud no válido. Se requiere un objeto JSON." },
        { status: 400, headers }
      );
    }

    const bodyKeys = Object.keys(body);
    for (const key of bodyKeys) {
      if (!ALLOWED_BODY_KEYS.has(key)) {
        return NextResponse.json(
          { error: `Cuerpo de solicitud no válido. Propiedad no autorizada presente en el comando: '${key}'.` },
          { status: 400, headers }
        );
      }
    }

    const associate_id = body.associate_id;
    const expected_automation_type = body.expected_automation_type;
    const expected_reference_date = body.expected_reference_date;
    const expected_channel = body.expected_channel;

    if (!associate_id || typeof associate_id !== "string" || !UUID_REGEX.test(associate_id)) {
      return NextResponse.json(
        { error: "ID de asociado inválido o con formato UUID no válido." },
        { status: 400, headers }
      );
    }

    if (
      !expected_automation_type ||
      typeof expected_automation_type !== "string" ||
      !VALID_AUTOMATION_TYPES.has(expected_automation_type as AutomationTriggerCode)
    ) {
      return NextResponse.json(
        { error: "Tipo de automatización esperado inválido o no reconocido." },
        { status: 400, headers }
      );
    }

    if (!expected_reference_date || typeof expected_reference_date !== "string" || !DATE_REGEX.test(expected_reference_date)) {
      return NextResponse.json(
        { error: "Fecha de referencia esperada inválida. Formato YYYY-MM-DD requerido." },
        { status: 400, headers }
      );
    }

    if (expected_channel === "whatsapp" || expected_channel === "sms") {
      return NextResponse.json(
        { error: "Canal no soportado en la versión actual de reservas." },
        { status: 400, headers }
      );
    }

    if (expected_channel !== "email" && expected_channel !== "internal_alert") {
      return NextResponse.json(
        { error: "Canal esperado inválido. Canales soportados: email, internal_alert." },
        { status: 400, headers }
      );
    }

    // 6. Server-Side Fresh State Loader (Fetches Fresh DB State, Zero Client Snapshot Trust)
    const freshStateLoader: NotificationFreshStateLoader = {
      loadFreshState: async (assocId: string) => {
        const agingReport = await getMembershipAgingReport(supabase);
        const rawAssoc = (agingReport.associates || []).find((a) => a.associate_id === assocId);

        if (!rawAssoc) {
          throw new Error("ASSOCIATE_NOT_FOUND");
        }

        const { data: actionsData, error: actionsErr } = await supabase
          .from("collection_actions")
          .select("id, associate_id, action_type, result_status, promised_payment_date, promised_payment_amount, next_follow_up_at, created_at")
          .eq("associate_id", assocId)
          .order("created_at", { ascending: false })
          .order("id", { ascending: true });

        if (actionsErr) {
          console.error("Error fetching collection_actions in reservation loader:", actionsErr);
          throw new Error("DB_READ_ERROR");
        }

        const actions = (actionsData as CollectionAction[]) || [];
        const enriched = enrichAssociatesWithCollectionsStatus([rawAssoc], { [assocId]: actions })[0];

        const promisesMonitor = getPaymentPromisesMonitor([enriched], { [assocId]: actions });
        const promise = promisesMonitor.find((p) => p.associate_id === assocId) || null;

        const { data: historyData, error: historyErr } = await supabase
          .from("collection_notification_events")
          .select("id, associate_id, channel, automation_type, reference_date, status, scheduled_for")
          .eq("associate_id", assocId);

        if (historyErr) {
          console.error("Error fetching notification history in reservation loader:", historyErr);
          throw new Error("DB_READ_ERROR");
        }

        const history = (historyData as NotificationEventRecord[]) || [];

        return {
          associate: enriched,
          promise,
          history,
        };
      },
    };

    // 7. Database Reservation Repository Adapter (Authentic User RLS Context)
    const repository: NotificationReservationRepository = {
      insertQueuedEvent: async (record: NewNotificationRecord): Promise<ReservedNotificationEvent> => {
        const { data, error } = await supabase
          .from("collection_notification_events")
          .insert({
            associate_id: record.associate_id,
            channel: record.channel,
            automation_type: record.automation_type,
            reference_date: record.reference_date,
            status: "QUEUED",
            recipient_email: record.recipient_email,
            scheduled_for: record.scheduled_for,
          })
          .select("id, associate_id, channel, automation_type, reference_date, status, recipient_email, scheduled_for, created_at")
          .single();

        if (error) {
          throw error;
        }

        return data as ReservedNotificationEvent;
      },
      findExistingEvent: async (
        assocId: string,
        autoType: AutomationTriggerCode,
        refDate: string,
        chan: AutomationChannel
      ): Promise<ExistingNotificationEvent | null> => {
        const { data } = await supabase
          .from("collection_notification_events")
          .select("id, associate_id, channel, automation_type, reference_date, status, scheduled_for")
          .eq("associate_id", assocId)
          .eq("automation_type", autoType)
          .eq("reference_date", refDate)
          .eq("channel", chan)
          .maybeSingle();

        if (!data) return null;
        return data as ExistingNotificationEvent;
      },
    };

    // 8. Execute Reservation Command with Strict Candidate Drift Protection
    const candidatePayload: ReservationCandidatePayload = {
      associate_id,
      automation_type: expected_automation_type as AutomationTriggerCode,
      reference_date: expected_reference_date,
      channel: expected_channel as AutomationChannel,
    };

    const reservationResult = await reserveNotificationEvent(
      freshStateLoader,
      candidatePayload,
      repository
    );

    // 9. Format Clean Domain Response (Zero Stack Leak, Zero Internal Exposure)
    if (reservationResult.outcome === "RESERVED") {
      return NextResponse.json(
        {
          outcome: "RESERVED",
          event: reservationResult.event,
        },
        { status: 200, headers }
      );
    }

    if (reservationResult.outcome === "ALREADY_RESERVED") {
      return NextResponse.json(
        {
          outcome: "ALREADY_RESERVED",
          event: reservationResult.existing_event,
        },
        { status: 200, headers }
      );
    }

    return NextResponse.json(
      {
        outcome: "SUPPRESSED",
        reason: reservationResult.reason,
      },
      { status: 200, headers }
    );
  } catch (error: any) {
    if (error?.message === "ASSOCIATE_NOT_FOUND") {
      return NextResponse.json(
        { error: "Asociado no encontrado en la base de datos." },
        { status: 404, headers }
      );
    }

    console.error("Error no controlado en POST /api/admin/collections/automation/reserve:", error);
    return NextResponse.json(
      { error: "Error interno del servidor al procesar la reserva de notificación." },
      { status: 500, headers }
    );
  }
}
