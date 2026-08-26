import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const ALLOWED_NEXT_PATHS = ["/portal/actualizar-password"] as const;

/**
 * GET /auth/callback
 * Handles PKCE authorization code exchange (?code=...) and redirects token_hash
 * requests to the prefetch-safe landing page (/portal/activar-cuenta).
 *
 * CRITICAL: GET requests to this route NEVER execute verifyOtp() for token_hash,
 * preventing email scanners from consuming single-use authentication tokens.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const typeParam = requestUrl.searchParams.get("type");
  const rawNext = requestUrl.searchParams.get("next");

  let nextPath = "/portal/actualizar-password";
  if (rawNext && typeof rawNext === "string") {
    const trimmed = rawNext.trim();
    if ((ALLOWED_NEXT_PATHS as readonly string[]).includes(trimmed)) {
      nextPath = trimmed;
    }
  }

  const origin = requestUrl.origin;

  try {
    // 1. PKCE Code Exchange (Standard OAuth / Server PKCE flow)
    if (code) {
      const supabase = await createClient();
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        console.error("Error al intercambiar código PKCE por sesión:", exchangeError.message);
        return NextResponse.redirect(
          `${origin}/portal/actualizar-password?error=exchange_failed`
        );
      }

      return NextResponse.redirect(`${origin}${nextPath}`);
    }

    // 2. Prefetch-Safe Redirection for token_hash
    // If token_hash arrives via GET (e.g. legacy links or external redirects),
    // redirect to /portal/activar-cuenta landing page WITHOUT consuming the token!
    if (tokenHash) {
      const landingUrl = new URL("/portal/activar-cuenta", origin);
      landingUrl.searchParams.set("token_hash", tokenHash);
      if (typeParam) {
        landingUrl.searchParams.set("type", typeParam);
      }
      return NextResponse.redirect(landingUrl.toString(), { status: 302 });
    }

    // 3. Fallback: Neither code nor token_hash supplied
    return NextResponse.redirect(`${origin}/portal/actualizar-password?error=missing_code`);
  } catch (err: unknown) {
    console.error("Excepción en GET /auth/callback:", err);
    return NextResponse.redirect(`${origin}/portal/actualizar-password?error=server_error`);
  }
}
