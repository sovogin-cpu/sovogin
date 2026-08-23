import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { runBillingExecution } from "@/lib/memberships/billing-engine";

/**
 * GET /api/cron/memberships/generate-charges
 * Server-to-server Vercel Cron endpoint for automated recurring membership billing.
 * Protected via Authorization: Bearer ${process.env.CRON_SECRET}.
 * Restricted strictly to production environment (VERCEL_ENV === "production" && NODE_ENV === "production").
 */
export async function GET(request: Request) {
  try {
    const cronSecret = process.env.CRON_SECRET;

    // 1. Structural Check for CRON_SECRET Environment Variable
    if (!cronSecret) {
      console.error("[CRON-BILLING] ERROR: CRON_SECRET no está configurada en las variables de entorno.");
      return NextResponse.json(
        { error: "Error de configuración interna del servidor." },
        { status: 500 }
      );
    }

    // 2. Authorization Header Check
    const authHeader = request.headers.get("authorization");
    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // 3. Strict Production-Only Guardrail
    const vercelEnv = process.env.VERCEL_ENV;
    const nodeEnv = process.env.NODE_ENV;

    if (vercelEnv !== "production" || nodeEnv !== "production") {
      console.log(`[CRON-BILLING] Omitiendo ejecución en entorno no productivo (VERCEL_ENV: ${vercelEnv || "none"}, NODE_ENV: ${nodeEnv}).`);
      return NextResponse.json({
        success: true,
        skipped: true,
        reason: "non_production_environment",
        message: `Ejecución de facturación automática omitida en entorno '${vercelEnv || nodeEnv}'.`,
      });
    }

    // 4. Server-Side Execution of Recurring Billing Engine
    const executionResult = await runBillingExecution(supabaseAdmin);
    const hasPartialFailures = executionResult.failedCount > 0;

    // 5. Structured Server-Side Logging
    const logData = {
      runDate: executionResult.today,
      scanned: executionResult.scanned,
      eligible: executionResult.eligible,
      candidatesCount: executionResult.candidatesCount,
      createdCount: executionResult.createdCount,
      idempotentSkippedCount: executionResult.idempotentSkippedCount,
      failedCount: executionResult.failedCount,
      catchUpLimitedMembershipsCount: executionResult.catchUpLimitedMembershipsCount,
    };

    if (hasPartialFailures) {
      console.warn("[CRON-BILLING] Ejecución completada con fallos parciales:", JSON.stringify(logData));
    } else {
      console.log("[CRON-BILLING] Ejecución completada exitosamente:", JSON.stringify(logData));
    }

    // 6. Safe Operational Summary Response
    return NextResponse.json({
      success: true,
      data: {
        today: executionResult.today,
        scanned: executionResult.scanned,
        eligible: executionResult.eligible,
        candidatesCount: executionResult.candidatesCount,
        createdCount: executionResult.createdCount,
        idempotentSkippedCount: executionResult.idempotentSkippedCount,
        failedCount: executionResult.failedCount,
        catchUpLimitedMembershipsCount: executionResult.catchUpLimitedMembershipsCount,
        hasPartialFailures,
      },
    });
  } catch (error: unknown) {
    console.error(
      "[CRON-BILLING] Excepción no controlada durante la ejecución del cron:",
      error instanceof Error ? `${error.name}: ${error.message}` : "Excepción desconocida"
    );

    return NextResponse.json(
      {
        success: false,
        error: "Fallo estructural en el procesamiento del trabajo programado.",
      },
      { status: 500 }
    );
  }
}
