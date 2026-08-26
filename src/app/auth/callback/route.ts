import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";

const ALLOWED_NEXT_PATHS = ["/portal/actualizar-password"] as const;
const ALLOWED_OTP_TYPES: EmailOtpType[] = ["invite", "recovery", "email"];

/**
 * GET /auth/callback
 * Handles PKCE authorization code exchange and OTP token verification for Supabase Auth.
 * Redirects to target page (/portal/actualizar-password) with cookies properly established.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const typeParam = requestUrl.searchParams.get("type");
  const rawNext = requestUrl.searchParams.get("next");

  // Strict Next Path Whitelist
  let nextPath = "/portal/actualizar-password";
  if (rawNext && typeof rawNext === "string") {
    const trimmed = rawNext.trim();
    if ((ALLOWED_NEXT_PATHS as readonly string[]).includes(trimmed)) {
      nextPath = trimmed;
    }
  }

  const origin = requestUrl.origin;

  try {
    const supabase = await createClient();

    // 1. PKCE Code Exchange
    if (code) {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

      if (exchangeError) {
        console.error("Error al intercambiar código PKCE por sesión:", exchangeError.message);
        return NextResponse.redirect(
          `${origin}/portal/actualizar-password?error=exchange_failed`
        );
      }

      return NextResponse.redirect(`${origin}${nextPath}`);
    }

    // 2. Token Hash Verification (OTP / Magiclink / Recovery fallback)
    if (tokenHash && typeParam) {
      if (!ALLOWED_OTP_TYPES.includes(typeParam as EmailOtpType)) {
        console.error("Tipo de OTP inválido o no permitido en callback:", typeParam);
        return NextResponse.redirect(
          `${origin}/portal/actualizar-password?error=invalid_type`
        );
      }

      const otpType = typeParam as EmailOtpType;
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: otpType,
      });

      if (verifyError) {
        console.error("Error al verificar token hash OTP:", verifyError.message);
        return NextResponse.redirect(
          `${origin}/portal/actualizar-password?error=verify_failed`
        );
      }

      return NextResponse.redirect(`${origin}${nextPath}`);
    }

    // 3. Fallback: No code or token_hash supplied
    return NextResponse.redirect(`${origin}/portal/actualizar-password?error=missing_code`);
  } catch (err: unknown) {
    console.error("Excepción en GET /auth/callback:", err);
    return NextResponse.redirect(`${origin}/portal/actualizar-password?error=server_error`);
  }
}
