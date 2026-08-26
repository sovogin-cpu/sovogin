import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendAssociateInviteEmail } from "@/lib/email/send-associate-invite";

export interface BulkInvitePayload {
  associateIds?: string[];
  inviteAllUnlinked?: boolean;
}

export interface BulkInviteErrorItem {
  associate_id: string;
  email?: string;
  error: string;
}

export interface BulkInviteResponse {
  success: boolean;
  total: number;
  invited: number;
  already_linked: number;
  skipped_inactive: number;
  missing_email: number;
  errors: BulkInviteErrorItem[];
  message?: string;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Verificación de Autenticación Server-Side
    const {
      data: { user: adminUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !adminUser) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // 2. Verificación de Rol de Administrador
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", adminUser.id)
      .maybeSingle();

    if (profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Acceso denegado. Se requieren permisos de administrador." },
        { status: 403 }
      );
    }

    // 3. Validar Payload
    const body = (await request.json().catch(() => ({}))) as BulkInvitePayload;
    const { associateIds, inviteAllUnlinked } = body;

    if (associateIds && inviteAllUnlinked) {
      return NextResponse.json(
        { error: "No especifique 'associateIds' e 'inviteAllUnlinked' simultáneamente." },
        { status: 400 }
      );
    }

    if (!associateIds && !inviteAllUnlinked) {
      return NextResponse.json(
        { error: "Debe proporcionar 'associateIds' o establecer 'inviteAllUnlinked: true'." },
        { status: 400 }
      );
    }

    // 4. Obtener asociados objetivo desde la base de datos
    let targetAssociates: Array<{
      id: string;
      full_name: string;
      email: string | null;
      status: string;
      user_id: string | null;
    }> = [];

    if (inviteAllUnlinked) {
      const { data, error } = await supabaseAdmin
        .from("associates")
        .select("id, full_name, email, status, user_id")
        .eq("status", "Activo")
        .is("user_id", null);

      if (error) {
        return NextResponse.json(
          { error: "Error al consultar asociados sin cuenta: " + error.message },
          { status: 500 }
        );
      }
      targetAssociates = data || [];
    } else if (Array.isArray(associateIds) && associateIds.length > 0) {
      // Clean and deduplicate IDs
      const cleanIds = Array.from(new Set(associateIds.map((id) => id.trim()))).filter(Boolean);

      const { data, error } = await supabaseAdmin
        .from("associates")
        .select("id, full_name, email, status, user_id")
        .in("id", cleanIds);

      if (error) {
        return NextResponse.json(
          { error: "Error al consultar asociados seleccionados: " + error.message },
          { status: 500 }
        );
      }
      targetAssociates = data || [];
    }

    if (targetAssociates.length === 0) {
      return NextResponse.json({
        success: true,
        total: 0,
        invited: 0,
        already_linked: 0,
        skipped_inactive: 0,
        missing_email: 0,
        errors: [],
        message: "No se encontraron asociados pendientes para procesar.",
      });
    }

    // 5. Cargar lista de Auth users existentes de forma masiva (una sola consulta a la API de Auth)
    const { data: userListData } = await supabaseAdmin.auth.admin.listUsers();
    const existingAuthUsers = userListData?.users || [];
    const authUsersByEmail = new Map(
      existingAuthUsers
        .filter((u) => u.email)
        .map((u) => [u.email!.trim().toLowerCase(), u])
    );

    const origin = request.nextUrl.origin;
    const redirectToUrl = `${origin}/auth/callback?next=/portal/actualizar-password`;

    const buildActivationLandingUrl = (
      tokenHash: string,
      linkType: "invite" | "recovery"
    ): string => {
      const url = new URL("/portal/activar-cuenta", origin);
      url.searchParams.set("token_hash", tokenHash);
      url.searchParams.set("type", linkType);
      return url.toString();
    };

    let invitedCount = 0;
    let alreadyLinkedCount = 0;
    let skippedInactiveCount = 0;
    let missingEmailCount = 0;
    const errors: BulkInviteErrorItem[] = [];

    // 6. Procesar asociados en lotes secuenciales con delay para controlar rate-limit de Resend
    const BATCH_SIZE = 5;
    const DELAY_BETWEEN_BATCHES_MS = 250;

    for (let i = 0; i < targetAssociates.length; i += BATCH_SIZE) {
      const chunk = targetAssociates.slice(i, i + BATCH_SIZE);

      await Promise.all(
        chunk.map(async (assoc) => {
          const cleanEmail = assoc.email?.trim().toLowerCase();

          // Validar Status
          if (assoc.status !== "Activo") {
            skippedInactiveCount++;
            return;
          }

          // Validar Email
          if (!cleanEmail) {
            missingEmailCount++;
            return;
          }

          // Si el asociado ya tiene user_id vinculado en una selección específica
          if (assoc.user_id) {
            alreadyLinkedCount++;
            return;
          }

          try {
            const existingAuthUser = authUsersByEmail.get(cleanEmail);
            let authUserId: string;
            let activationLink: string;

            if (existingAuthUser) {
              // Verificar si está vinculado a otro asociado
              const { data: otherAssoc } = await supabaseAdmin
                .from("associates")
                .select("id")
                .eq("user_id", existingAuthUser.id)
                .neq("id", assoc.id)
                .maybeSingle();

              if (otherAssoc) {
                errors.push({
                  associate_id: assoc.id,
                  email: cleanEmail,
                  error: "El correo ya está vinculado a otro expediente gremial.",
                });
                return;
              }

              authUserId = existingAuthUser.id;

              const { data: linkData, error: linkError } =
                await supabaseAdmin.auth.admin.generateLink({
                  type: "recovery",
                  email: cleanEmail,
                  options: { redirectTo: redirectToUrl },
                });

              const hashedToken = linkData?.properties?.hashed_token;

              if (linkError || !hashedToken) {
                errors.push({
                  associate_id: assoc.id,
                  email: cleanEmail,
                  error: linkError?.message || "No fue posible generar un enlace seguro de activación.",
                });
                return;
              }

              activationLink = buildActivationLandingUrl(hashedToken, "recovery");
            } else {
              // Primera invitación formal (Auth User nuevo)
              const { data: inviteData, error: inviteError } =
                await supabaseAdmin.auth.admin.generateLink({
                  type: "invite",
                  email: cleanEmail,
                  options: {
                    redirectTo: redirectToUrl,
                    data: { full_name: assoc.full_name },
                  },
                });

              const hashedToken = inviteData?.properties?.hashed_token;

              if (inviteError || !inviteData?.user || !hashedToken) {
                errors.push({
                  associate_id: assoc.id,
                  email: cleanEmail,
                  error: inviteError?.message || "No fue posible generar un enlace seguro de activación.",
                });
                return;
              }

              authUserId = inviteData.user.id;
              activationLink = buildActivationLandingUrl(hashedToken, "invite");

              // Actualizar el mapa de Auth users para prevenir colisión si el mismo email aparece de nuevo
              authUsersByEmail.set(cleanEmail, inviteData.user);
            }

            // Vincular associates.user_id = authUserId
            const { error: updateError } = await supabaseAdmin
              .from("associates")
              .update({ user_id: authUserId })
              .eq("id", assoc.id);

            if (updateError) {
              errors.push({
                associate_id: assoc.id,
                email: cleanEmail,
                error: "No se pudo vincular la cuenta en la base de datos.",
              });
              return;
            }

            // Enviar notificación por correo vía Resend
            const emailResult = await sendAssociateInviteEmail({
              associateName: assoc.full_name,
              associateEmail: cleanEmail,
              activationLink,
            });

            if (!emailResult.success) {
              // La vinculación se mantiene pero se registra el error de envío
              errors.push({
                associate_id: assoc.id,
                email: cleanEmail,
                error: `Cuenta vinculada, pero falló el envío del correo: ${emailResult.error}`,
              });
            } else {
              invitedCount++;
            }
          } catch (err: unknown) {
            errors.push({
              associate_id: assoc.id,
              email: cleanEmail,
              error: err instanceof Error ? err.message : "Error inesperado en el procesamiento.",
            });
          }
        })
      );

      // Esperar brevemente entre lotes si hay más por procesar
      if (i + BATCH_SIZE < targetAssociates.length) {
        await new Promise((resolve) => setTimeout(resolve, DELAY_BETWEEN_BATCHES_MS));
      }
    }

    const responseData: BulkInviteResponse = {
      success: true,
      total: targetAssociates.length,
      invited: invitedCount,
      already_linked: alreadyLinkedCount,
      skipped_inactive: skippedInactiveCount,
      missing_email: missingEmailCount,
      errors,
      message: `Procesados ${targetAssociates.length} asociados: ${invitedCount} invitaciones enviadas exitosamente.`,
    };

    return NextResponse.json(responseData);
  } catch (error: unknown) {
    console.error("Excepción en POST /api/admin/associates/bulk-invite:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Ocurrió un error inesperado al procesar las invitaciones masivas.",
      },
      { status: 500 }
    );
  }
}
