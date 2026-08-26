import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { sendAssociateInviteEmail } from "@/lib/email/send-associate-invite";

type RouteParams = {
  params: Promise<{ associateId: string }>;
};

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { associateId } = await params;

    if (!associateId || typeof associateId !== "string") {
      return NextResponse.json(
        { error: "associateId es requerido." },
        { status: 400 }
      );
    }

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

    // 3. Cargar asociado desde la base de datos
    const { data: associate, error: assocError } = await supabaseAdmin
      .from("associates")
      .select("id, full_name, email, status, user_id")
      .eq("id", associateId.trim())
      .maybeSingle();

    if (assocError || !associate) {
      return NextResponse.json(
        { error: "No se encontró el asociado especificado." },
        { status: 404 }
      );
    }

    // CORRECCIÓN 1: Bloqueo Server-Side para asociados Inactivos
    if (associate.status !== "Activo") {
      return NextResponse.json(
        { error: "Solo los asociados activos pueden ser invitados al Portal del Asociado." },
        { status: 400 }
      );
    }

    const cleanEmail = associate.email?.trim().toLowerCase();
    if (!cleanEmail) {
      return NextResponse.json(
        { error: "El asociado no posee un correo electrónico válido registrado." },
        { status: 400 }
      );
    }

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

    // 4. Si el asociado ya tiene user_id vinculado (Re-envío / Recuperación de acceso)
    if (associate.user_id) {
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: cleanEmail,
        options: {
          redirectTo: redirectToUrl,
        },
      });

      const hashedToken = linkData?.properties?.hashed_token;

      if (linkError || !hashedToken) {
        console.error("Error generando enlace de recuperación:", linkError);
        return NextResponse.json(
          { error: linkError?.message || "No fue posible generar un enlace seguro de activación." },
          { status: 500 }
        );
      }

      const activationLink = buildActivationLandingUrl(hashedToken, "recovery");

      const emailResult = await sendAssociateInviteEmail({
        associateName: associate.full_name,
        associateEmail: cleanEmail,
        activationLink,
      });

      if (!emailResult.success) {
        return NextResponse.json({
          success: false,
          alreadyLinked: true,
          emailSent: false,
          message: `El asociado está vinculado, pero falló el re-envío del correo: ${emailResult.error || "Error de envío"}`,
          error: emailResult.error || "Fallo al enviar correo con Resend.",
        });
      }

      return NextResponse.json({
        success: true,
        alreadyLinked: true,
        emailSent: true,
        message: "El asociado ya se encontraba vinculado. Se ha re-enviado el acceso al correo.",
      });
    }

    // 5. Buscar si ya existe un auth.user en Supabase Auth con este correo
    const { data: userList } = await supabaseAdmin.auth.admin.listUsers();
    const existingAuthUser = (userList?.users || []).find(
      (u) => u.email?.toLowerCase() === cleanEmail
    );

    let authUserId: string;
    let activationLink: string;

    if (existingAuthUser) {
      // CASO B: Cuenta Auth ya existente pero expediente aún no vinculado
      const { data: otherAssoc } = await supabaseAdmin
        .from("associates")
        .select("id")
        .eq("user_id", existingAuthUser.id)
        .neq("id", associate.id)
        .maybeSingle();

      if (otherAssoc) {
        return NextResponse.json(
          { error: "El correo electrónico ya se encuentra asociado a otro expediente gremial." },
          { status: 400 }
        );
      }

      authUserId = existingAuthUser.id;

      // Generar enlace tipo "recovery" para cuenta auth pre-existente
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: cleanEmail,
        options: {
          redirectTo: redirectToUrl,
        },
      });

      const hashedToken = linkData?.properties?.hashed_token;

      if (linkError || !hashedToken) {
        console.error("Error generando enlace de recuperación para usuario existente:", linkError);
        return NextResponse.json(
          { error: linkError?.message || "No fue posible generar un enlace seguro de activación." },
          { status: 500 }
        );
      }

      activationLink = buildActivationLandingUrl(hashedToken, "recovery");
    } else {
      // CASO A: Cuenta Auth Nueva (Primera invitación formal)
      // Supabase Auth generateLink({ type: "invite" }) crea el usuario y retorna el enlace de invitación inicial.
      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.generateLink({
        type: "invite",
        email: cleanEmail,
        options: {
          redirectTo: redirectToUrl,
          data: {
            full_name: associate.full_name,
          },
        },
      });

      const hashedToken = inviteData?.properties?.hashed_token;

      if (inviteError || !inviteData?.user || !hashedToken) {
        console.error("Error generando enlace de invitación inicial:", inviteError);
        return NextResponse.json(
          { error: inviteError?.message || "No fue posible generar un enlace seguro de activación." },
          { status: 400 }
        );
      }

      authUserId = inviteData.user.id;
      activationLink = buildActivationLandingUrl(hashedToken, "invite");
    }

    // 6. Vincular de forma atómica associates.user_id = authUserId
    const { error: updateError } = await supabaseAdmin
      .from("associates")
      .update({ user_id: authUserId })
      .eq("id", associate.id);

    if (updateError) {
      console.error("Error actualizando associates.user_id:", updateError);
      return NextResponse.json(
        { error: "No se pudo vincular la cuenta de usuario con el registro del asociado." },
        { status: 500 }
      );
    }

    // 7. Enviar notificación por correo con el enlace correspondiente
    const emailResult = await sendAssociateInviteEmail({
      associateName: associate.full_name,
      associateEmail: cleanEmail,
      activationLink,
    });

    if (!emailResult.success) {
      return NextResponse.json({
        success: false,
        alreadyLinked: false,
        emailSent: false,
        message: `Cuenta vinculada correctamente, pero falló el envío del correo de invitación: ${emailResult.error || "Error de envío"}`,
        error: emailResult.error || "Fallo al enviar correo con Resend.",
      });
    }

    return NextResponse.json({
      success: true,
      alreadyLinked: false,
      emailSent: true,
      message: `Invitación enviada exitosamente a ${cleanEmail}.`,
    });
  } catch (error: unknown) {
    console.error("Excepción en POST /api/admin/associates/[associateId]/invite:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Ocurrió un error inesperado al procesar la invitación del asociado.",
      },
      { status: 500 }
    );
  }
}
