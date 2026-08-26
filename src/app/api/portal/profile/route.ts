import { NextRequest, NextResponse } from "next/server";
import { resolveAssociateSession } from "@/lib/portal/portal-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { normalizeWebsiteUrl, isSafePublicEmail } from "@/lib/directory/directory-utils";

const FORBIDDEN_PATCH_KEYS = [
  "associate_id",
  "profile_media_id",
  "display_order",
  "is_verified",
  "slug",
  "user_id",
  "created_at",
  "updated_at",
  "status",
  "associate",
];

const ALLOWED_PATCH_KEYS = [
  "display_name",
  "specialty",
  "subspecialty",
  "city",
  "department",
  "country",
  "clinic_name",
  "office_address",
  "public_phone",
  "whatsapp_phone",
  "public_email",
  "website_url",
  "bio",
  "telemedicine_available",
  "social_links",
  "consentConfirmed",
  "is_published",
];

/**
 * GET /api/portal/profile
 * Retrieves the current logged-in associate's record + their doctor_directory_profile.
 */
export async function GET() {
  try {
    const sessionRes = await resolveAssociateSession();
    if (sessionRes.error || !sessionRes.associate) {
      return NextResponse.json(
        { success: false, error: sessionRes.error || "Acceso no autorizado." },
        { status: sessionRes.status }
      );
    }

    const { data: profile, error } = await supabaseAdmin
      .from("doctor_directory_profiles")
      .select("*")
      .eq("associate_id", sessionRes.associate.id)
      .maybeSingle();

    if (error) {
      console.error("Error al obtener perfil de directorio:", error);
      return NextResponse.json(
        { success: false, error: "Error al consultar la base de datos." },
        { status: 500 }
      );
    }

    // Optional media detail fetch
    let mediaUrl: string | null = null;
    if (profile?.profile_media_id) {
      const { data: media } = await supabaseAdmin
        .from("media_items")
        .select("public_url, storage_path")
        .eq("id", profile.profile_media_id)
        .maybeSingle();

      if (media?.public_url) {
        mediaUrl = media.public_url;
      }
    }

    return NextResponse.json({
      success: true,
      associate: sessionRes.associate,
      profile: profile || null,
      mediaUrl,
    });
  } catch (err: unknown) {
    console.error("GET /api/portal/profile error:", err);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}

/**
 * POST /api/portal/profile
 * Creates initial doctor_directory_profile for the logged in associate.
 */
export async function POST(request: NextRequest) {
  try {
    const sessionRes = await resolveAssociateSession();
    if (sessionRes.error || !sessionRes.associate) {
      return NextResponse.json(
        { success: false, error: sessionRes.error || "Acceso no autorizado." },
        { status: sessionRes.status }
      );
    }

    // Duplicate check
    const { data: existing } = await supabaseAdmin
      .from("doctor_directory_profiles")
      .select("id")
      .eq("associate_id", sessionRes.associate.id)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { success: false, error: "El perfil profesional ya ha sido creado previamente." },
        { status: 400 }
      );
    }

    const body = await request.json().catch(() => ({}));

    // Forbidden keys check
    for (const key of FORBIDDEN_PATCH_KEYS) {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        return NextResponse.json(
          {
            success: false,
            error: `Campo no permitido en la solicitud: '${key}'.`,
          },
          { status: 400 }
        );
      }
    }

    const displayName = body.display_name?.trim() || sessionRes.associate.full_name;
    if (!displayName) {
      return NextResponse.json(
        { success: false, error: "El nombre público es obligatorio." },
        { status: 400 }
      );
    }

    const specialty =
      body.specialty?.trim() ||
      sessionRes.associate.specialty ||
      "Ginecología y Obstetricia";

    const publicEmail = body.public_email?.trim() || sessionRes.associate.email;
    if (publicEmail && !isSafePublicEmail(publicEmail)) {
      return NextResponse.json(
        { success: false, error: "El correo electrónico público posee un formato inválido." },
        { status: 400 }
      );
    }

    const rawWeb = body.website_url ? normalizeWebsiteUrl(body.website_url) : null;
    if (body.website_url && !rawWeb) {
      return NextResponse.json(
        { success: false, error: "Dirección de sitio web inválida o no segura." },
        { status: 400 }
      );
    }

    // Process social links safely if provided
    const socialLinksInput = body.social_links && typeof body.social_links === "object" ? body.social_links : {};
    const sanitizedSocialLinks: Record<string, string> = {};
    const knownKeys = ["linkedin", "instagram", "facebook", "researchgate"];
    for (const k of knownKeys) {
      if (socialLinksInput[k] && typeof socialLinksInput[k] === "string" && socialLinksInput[k].trim() !== "") {
        const norm = normalizeWebsiteUrl(socialLinksInput[k]);
        if (norm) {
          sanitizedSocialLinks[k] = norm;
        }
      }
    }

    const consentConfirmed = Boolean(body.consentConfirmed);
    const consentGivenAt = consentConfirmed ? new Date().toISOString() : null;
    const isPublished = consentConfirmed ? Boolean(body.is_published) : false;

    const insertData = {
      associate_id: sessionRes.associate.id, // FORCED server-side
      display_name: displayName,
      specialty: specialty,
      subspecialty: body.subspecialty?.trim() || null,
      country: body.country?.trim() || "Colombia",
      department: body.department?.trim() || null,
      city: body.city?.trim() || null,
      clinic_name: body.clinic_name?.trim() || null,
      public_phone: body.public_phone?.trim() || null,
      whatsapp_phone: body.whatsapp_phone?.trim() || null,
      public_email: publicEmail,
      office_address: body.office_address?.trim() || null,
      profile_media_id: null,
      bio: body.bio?.trim() || null,
      website_url: rawWeb,
      social_links: sanitizedSocialLinks,
      telemedicine_available: Boolean(body.telemedicine_available),
      is_verified: false, // FORCED false on self-service creation!
      consent_given_at: consentGivenAt,
      is_published: isPublished,
      display_order: 0,
    };

    const { data: created, error: insertError } = await supabaseAdmin
      .from("doctor_directory_profiles")
      .insert([insertData])
      .select("*")
      .single();

    if (insertError) {
      console.error("Error al crear perfil de directorio:", insertError);
      return NextResponse.json(
        { success: false, error: "Error al guardar el perfil en base de datos." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Perfil profesional creado exitosamente.",
      profile: created,
    });
  } catch (err: unknown) {
    console.error("POST /api/portal/profile error:", err);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/portal/profile
 * Updates whitelisted fields of current associate's doctor_directory_profile.
 */
export async function PATCH(request: NextRequest) {
  try {
    const sessionRes = await resolveAssociateSession();
    if (sessionRes.error || !sessionRes.associate) {
      return NextResponse.json(
        { success: false, error: sessionRes.error || "Acceso no autorizado." },
        { status: sessionRes.status }
      );
    }

    const body = await request.json().catch(() => ({}));

    // 1. Strict Forbidden keys check
    for (const key of FORBIDDEN_PATCH_KEYS) {
      if (Object.prototype.hasOwnProperty.call(body, key)) {
        return NextResponse.json(
          {
            success: false,
            error: `Modificación no permitida para el campo '${key}'.`,
          },
          { status: 400 }
        );
      }
    }

    // 2. Fetch current profile
    const { data: currentProfile } = await supabaseAdmin
      .from("doctor_directory_profiles")
      .select("*")
      .eq("associate_id", sessionRes.associate.id)
      .maybeSingle();

    if (!currentProfile) {
      return NextResponse.json(
        { success: false, error: "Perfil profesional no encontrado. Debe crearlo primero." },
        { status: 404 }
      );
    }

    const updates: Record<string, unknown> = {};

    if (body.display_name !== undefined) {
      const trimmed = body.display_name.trim();
      if (!trimmed) {
        return NextResponse.json(
          { success: false, error: "El nombre público no puede estar vacío." },
          { status: 400 }
        );
      }
      updates.display_name = trimmed;
    }

    if (body.specialty !== undefined) {
      const trimmed = body.specialty.trim();
      if (!trimmed) {
        return NextResponse.json(
          { success: false, error: "La especialidad no puede estar vacía." },
          { status: 400 }
        );
      }
      updates.specialty = trimmed;
    }

    if (body.subspecialty !== undefined) {
      updates.subspecialty = body.subspecialty?.trim() || null;
    }

    if (body.country !== undefined) {
      updates.country = body.country?.trim() || "Colombia";
    }

    if (body.department !== undefined) {
      updates.department = body.department?.trim() || null;
    }

    if (body.city !== undefined) {
      updates.city = body.city?.trim() || null;
    }

    if (body.clinic_name !== undefined) {
      updates.clinic_name = body.clinic_name?.trim() || null;
    }

    if (body.public_phone !== undefined) {
      updates.public_phone = body.public_phone?.trim() || null;
    }

    if (body.whatsapp_phone !== undefined) {
      updates.whatsapp_phone = body.whatsapp_phone?.trim() || null;
    }

    if (body.public_email !== undefined) {
      const emailStr = body.public_email?.trim() || null;
      if (emailStr && !isSafePublicEmail(emailStr)) {
        return NextResponse.json(
          { success: false, error: "Formato de correo electrónico público inválido." },
          { status: 400 }
        );
      }
      updates.public_email = emailStr;
    }

    if (body.office_address !== undefined) {
      updates.office_address = body.office_address?.trim() || null;
    }

    if (body.bio !== undefined) {
      updates.bio = body.bio?.trim() || null;
    }

    if (body.website_url !== undefined) {
      const normalized = normalizeWebsiteUrl(body.website_url);
      if (body.website_url && !normalized) {
        return NextResponse.json(
          { success: false, error: "La dirección web debe comenzar con http:// o https://" },
          { status: 400 }
        );
      }
      updates.website_url = normalized;
    }

    if (body.social_links !== undefined) {
      const socialObj = body.social_links && typeof body.social_links === "object" ? body.social_links : {};
      const sanitizedSocial: Record<string, string> = {};
      const knownKeys = ["linkedin", "instagram", "facebook", "researchgate"];
      for (const k of knownKeys) {
        if (socialObj[k] && typeof socialObj[k] === "string" && socialObj[k].trim() !== "") {
          const norm = normalizeWebsiteUrl(socialObj[k]);
          if (norm) {
            sanitizedSocial[k] = norm;
          }
        }
      }
      updates.social_links = sanitizedSocial;
    }

    if (body.telemedicine_available !== undefined) {
      updates.telemedicine_available = Boolean(body.telemedicine_available);
    }

    // Consent and Publication logic
    let effectiveConsentAt = currentProfile.consent_given_at;

    if (body.consentConfirmed !== undefined) {
      if (body.consentConfirmed === true) {
        // Assign timestamp only if currently NULL (do NOT renew existing timestamp)
        if (!effectiveConsentAt) {
          effectiveConsentAt = new Date().toISOString();
        }
        updates.consent_given_at = effectiveConsentAt;
      } else {
        // consentConfirmed === false -> force is_published = false and consent_given_at = null
        effectiveConsentAt = null;
        updates.consent_given_at = null;
        updates.is_published = false;
      }
    }

    if (body.is_published !== undefined) {
      const targetPublished = Boolean(body.is_published);
      if (targetPublished && !effectiveConsentAt) {
        return NextResponse.json(
          {
            success: false,
            error: "No se puede activar la publicación sin haber autorizado el consentimiento de datos (Habeas Data).",
          },
          { status: 400 }
        );
      }
      // If consent was not explicitly revoked false in this same payload, set targetPublished
      if (body.consentConfirmed !== false) {
        updates.is_published = targetPublished;
      }
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("doctor_directory_profiles")
      .update(updates)
      .eq("associate_id", sessionRes.associate.id)
      .select("*")
      .single();

    if (updateError) {
      console.error("Error al actualizar perfil de directorio:", updateError);
      return NextResponse.json(
        { success: false, error: "Error al guardar los cambios en base de datos." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Perfil profesional actualizado exitosamente.",
      profile: updated,
    });
  } catch (err: unknown) {
    console.error("PATCH /api/portal/profile error:", err);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor." },
      { status: 500 }
    );
  }
}
