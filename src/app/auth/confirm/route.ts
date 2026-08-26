import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import type { EmailOtpType } from "@supabase/supabase-js";

const ALLOWED_OTP_TYPES: EmailOtpType[] = ["invite", "recovery"];

/**
 * POST /auth/confirm
 * Prefetch-Safe Server-Side Confirmation Endpoint.
 *
 * Executed strictly upon explicit human action (form submit on /portal/activar-cuenta).
 * Performs verifyOtp({ token_hash, type }), establishes SSR session cookies,
 * and redirects to /portal/actualizar-password.
 */
export async function POST(request: NextRequest) {
  const origin = request.nextUrl.origin;

  try {
    let tokenHash: string | null = null;
    let typeParam: string | null = null;

    const contentType = request.headers.get("content-type") || "";

    if (
      contentType.includes("application/x-www-form-urlencoded") ||
      contentType.includes("multipart/form-data")
    ) {
      const formData = await request.formData();
      tokenHash = formData.get("token_hash") as string | null;
      typeParam = formData.get("type") as string | null;
    } else if (contentType.includes("application/json")) {
      const body = await request.json().catch(() => ({}));
      tokenHash = body.token_hash || null;
      typeParam = body.type || null;
    }

    if (!tokenHash || !typeParam) {
      return NextResponse.redirect(
        `${origin}/portal/actualizar-password?error=missing_code`,
        { status: 303 }
      );
    }

    const cleanType = typeParam.trim() as EmailOtpType;
    if (!ALLOWED_OTP_TYPES.includes(cleanType)) {
      console.error("Tipo de OTP no válido en POST /auth/confirm:", typeParam);
      return NextResponse.redirect(
        `${origin}/portal/actualizar-password?error=invalid_type`,
        { status: 303 }
      );
    }

    const supabase = await createClient();

    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash.trim(),
      type: cleanType,
    });

    if (verifyError) {
      console.error("Error al verificar OTP en POST /auth/confirm:", verifyError.message);
      return NextResponse.redirect(
        `${origin}/portal/actualizar-password?error=verify_failed`,
        { status: 303 }
      );
    }

    // Success! Session cookies established. Redirect to password update page.
    return NextResponse.redirect(`${origin}/portal/actualizar-password`, { status: 303 });
  } catch (err: unknown) {
    console.error("Excepción en POST /auth/confirm:", err);
    return NextResponse.redirect(
      `${origin}/portal/actualizar-password?error=server_error`,
      { status: 303 }
    );
  }
}
