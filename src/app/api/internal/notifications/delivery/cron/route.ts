import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { runBatchWorkerDelivery } from "@/lib/notifications/delivery-worker-runner";

function safeCompareSecrets(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf-8");
  const bufB = Buffer.from(b, "utf-8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function GET(req: NextRequest) {
  // Prerequisite 1: Vercel Cron Secret Configuration & Authentication (MUST OCCUR FIRST before inspecting runtime state)
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || cronSecret.trim() === "") {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Cron trigger secret configuration missing" },
      { status: 401 }
    );
  }

  const authHeader = req.headers.get("authorization");
  let providedSecret: string | null = null;
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    providedSecret = authHeader.substring(7).trim();
  }

  if (!providedSecret || !safeCompareSecrets(providedSecret, cronSecret.trim())) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Invalid or missing Vercel Cron authorization Bearer token" },
      { status: 401 }
    );
  }

  // Prerequisite 2: Runtime Enablement Check (Only inspected AFTER caller is fully authenticated)
  const runtimeEnabled = process.env.DELIVERY_RUNTIME_ENABLED === "true";
  if (!runtimeEnabled) {
    return NextResponse.json(
      { error: "DISABLED", message: "Delivery worker runtime is disabled (DELIVERY_RUNTIME_ENABLED !== 'true')" },
      { status: 503 }
    );
  }

  // Prerequisite 3: Reject ALL query parameters to prevent operational override leakage
  const hasQueryParams = !req.nextUrl.searchParams.keys().next().done;
  if (hasQueryParams) {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "Query parameters are strictly forbidden on Cron endpoint" },
      { status: 400 }
    );
  }

  // Prerequisite 4: Production Provider Guard
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction && (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY.trim() === "")) {
    return NextResponse.json(
      { error: "SERVICE_UNAVAILABLE", message: "Production delivery provider not configured (RESEND_API_KEY missing)" },
      { status: 503 }
    );
  }

  try {
    const batchResult = await runBatchWorkerDelivery();

    return NextResponse.json(
      {
        success: batchResult.success,
        runId: batchResult.runId,
        status: batchResult.status,
        claimedCount: batchResult.claimedCount,
        sentCount: batchResult.sentCount,
        suppressedCount: batchResult.suppressedCount,
        transientFailureCount: batchResult.transientFailureCount,
        permanentFailureCount: batchResult.permanentFailureCount,
        unknownCount: batchResult.unknownCount,
        technicalFailureCount: batchResult.technicalFailureCount,
        stopReason: batchResult.stopReason,
        noWork: batchResult.noWork,
      },
      { status: 200 }
    );
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    if (errorMsg.includes("WORKER_RUNTIME_DISABLED") || errorMsg.includes("DELIVERY_PROVIDER_NOT_CONFIGURED")) {
      return NextResponse.json(
        { error: "SERVICE_UNAVAILABLE", message: errorMsg },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: errorMsg },
      { status: 500 }
    );
  }
}
