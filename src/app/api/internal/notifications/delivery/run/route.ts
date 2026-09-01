import crypto from "node:crypto";
import { NextRequest, NextResponse } from "next/server";

/**
 * Constant-time comparison function for trigger secret validation.
 * Prevents timing side-channel attacks.
 */
function safeCompareSecrets(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf-8");
  const bufB = Buffer.from(b, "utf-8");

  if (bufA.length !== bufB.length) {
    return false;
  }

  return crypto.timingSafeEqual(bufA, bufB);
}

export async function POST(req: NextRequest) {
  // Prerequisite 1: Runtime Enablement Check (Must occur FIRST before reading worker credentials or signing in)
  const runtimeEnabled = process.env.DELIVERY_RUNTIME_ENABLED === "true";
  if (!runtimeEnabled) {
    return NextResponse.json(
      { error: "DISABLED", message: "Delivery worker runtime is disabled (DELIVERY_RUNTIME_ENABLED !== 'true')" },
      { status: 503 }
    );
  }

  // Prerequisite 2: Trigger Secret Configuration Check
  const triggerSecret = process.env.DELIVERY_WORKER_TRIGGER_SECRET;
  if (!triggerSecret || triggerSecret.trim() === "") {
    return NextResponse.json(
      { error: "DISABLED", message: "Delivery worker endpoint is disabled (DELIVERY_WORKER_TRIGGER_SECRET not configured)" },
      { status: 503 }
    );
  }

  // Prerequisite 3: Timing-Safe HTTP Trigger Authentication (Layer 1)
  const authHeader = req.headers.get("authorization");
  const customHeader = req.headers.get("x-delivery-trigger-secret");

  let providedSecret: string | null = null;
  if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
    providedSecret = authHeader.substring(7).trim();
  } else if (customHeader) {
    providedSecret = customHeader.trim();
  }

  if (!providedSecret || !safeCompareSecrets(providedSecret, triggerSecret.trim())) {
    return NextResponse.json(
      { error: "UNAUTHORIZED", message: "Invalid or missing HTTP trigger authorization secret" },
      { status: 401 }
    );
  }

  // Prerequisite 4: Body Validation & Removal of External eventId / Operational Parameters
  let body: any = {};
  try {
    const text = await req.text();
    if (text && text.trim() !== "") {
      body = JSON.parse(text);
    }
  } catch {
    return NextResponse.json(
      { error: "BAD_REQUEST", message: "Invalid JSON request body" },
      { status: 400 }
    );
  }

  // Reject forbidden operational fields in HTTP request body
  const forbiddenFields = ["eventId", "recipient", "provider", "attemptNumber", "claimToken"];
  for (const field of forbiddenFields) {
    if (body && Object.prototype.hasOwnProperty.call(body, field)) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: `Operational field '${field}' is strictly forbidden in HTTP trigger request body` },
        { status: 400 }
      );
    }
  }

  // Prerequisite 5: Production Provider Guard (FakeProvider strictly forbidden in production)
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction) {
    return NextResponse.json(
      { error: "SERVICE_UNAVAILABLE", message: "Production delivery provider not configured (FakeProvider is strictly forbidden in production)" },
      { status: 503 }
    );
  }

  // Prerequisite 6: Server-Controlled Event Selector Guard (Must be configured to execute delivery)
  return NextResponse.json(
    { error: "SERVICE_UNAVAILABLE", message: "Server-controlled event selector (SERVER_EVENT_SELECTOR_NOT_CONFIGURED) is not configured. Delivery execution blocked." },
    { status: 503 }
  );
}
