import { NextRequest, NextResponse } from "next/server";
import { resolveAssociateSession } from "@/lib/portal/portal-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
import crypto from "crypto";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * POST /api/portal/profile/avatar
 * Dedicated endpoint to upload and set associate profile avatar.
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

    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json(
        { success: false, error: "Solicitud inválida. Se esperaba multipart/form-data." },
        { status: 400 }
      );
    }

    const file = (formData.get("file") || formData.get("avatar")) as File | null;
    if (!file) {
      return NextResponse.json(
        { success: false, error: "Debe seleccionar un archivo de imagen." },
        { status: 400 }
      );
    }

    // 1. Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: "Formato de archivo no permitido. Solo se aceptan imágenes JPG, PNG o WEBP.",
        },
        { status: 400 }
      );
    }

    // 2. Validate file size
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: "El archivo excede el tamaño máximo permitido de 5 MB.",
        },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Compute SHA-256 hash
    const hash = crypto.createHash("sha256").update(buffer).digest("hex");

    let ext = "jpg";
    if (file.type === "image/png") ext = "png";
    if (file.type === "image/webp") ext = "webp";

    const bucketName = "media-library";
    const storagePath = `avatars/associates/${sessionRes.associate.id}/${hash}.${ext}`;

    // 4. Deduplication check in media_items
    let mediaId: string | null = null;
    let publicUrl: string | null = null;

    const { data: existingMedia } = await supabaseAdmin
      .from("media_items")
      .select("id, public_url, storage_path")
      .eq("sha256_hash", hash)
      .maybeSingle();

    if (existingMedia) {
      mediaId = existingMedia.id;
      publicUrl = existingMedia.public_url;
    } else {
      // Upload file to Supabase Storage
      const { error: uploadError } = await supabaseAdmin.storage
        .from(bucketName)
        .upload(storagePath, buffer, {
          contentType: file.type,
          upsert: true,
        });

      if (uploadError) {
        console.error("Error al subir avatar a Storage:", uploadError);
        return NextResponse.json(
          { success: false, error: "Error al almacenar la imagen en el servidor." },
          { status: 500 }
        );
      }

      const { data: publicUrlData } = supabaseAdmin.storage
        .from(bucketName)
        .getPublicUrl(storagePath);

      publicUrl = publicUrlData.publicUrl;

      // Insert record into public.media_items
      const { data: newMedia, error: mediaInsertError } = await supabaseAdmin
        .from("media_items")
        .insert([
          {
            title: `Avatar - ${sessionRes.associate.full_name}`,
            description: "Foto de perfil profesional del asociado en el Portal",
            original_filename: file.name,
            storage_bucket: bucketName,
            storage_path: storagePath,
            public_url: publicUrl,
            mime_type: file.type,
            file_extension: ext,
            file_size_bytes: file.size,
            sha256_hash: hash,
            uploaded_by: sessionRes.user?.id || null,
            status: "active",
            visibility: "public",
          },
        ])
        .select("id")
        .single();

      if (mediaInsertError || !newMedia) {
        console.error("Error al registrar media_item:", mediaInsertError);
        return NextResponse.json(
          { success: false, error: "Error al registrar metadatos de la imagen." },
          { status: 500 }
        );
      }

      mediaId = newMedia.id;
    }

    // 5. Ensure doctor_directory_profile exists or create it, then update profile_media_id
    const { data: profile } = await supabaseAdmin
      .from("doctor_directory_profiles")
      .select("id")
      .eq("associate_id", sessionRes.associate.id)
      .maybeSingle();

    if (!profile) {
      // Auto-create basic profile row if not existing yet
      const { error: createProfileError } = await supabaseAdmin
        .from("doctor_directory_profiles")
        .insert([
          {
            associate_id: sessionRes.associate.id,
            display_name: sessionRes.associate.full_name,
            specialty: sessionRes.associate.specialty || "Ginecología y Obstetricia",
            public_email: sessionRes.associate.email,
            profile_media_id: mediaId,
            is_published: false,
            display_order: 0,
          },
        ]);

      if (createProfileError) {
        console.error("Error al crear perfil durante avatar upload:", createProfileError);
        return NextResponse.json(
          { success: false, error: "No se pudo asociar la foto al perfil." },
          { status: 500 }
        );
      }
    } else {
      // Replace only the reference, leaving old media intact
      const { error: updateError } = await supabaseAdmin
        .from("doctor_directory_profiles")
        .update({ profile_media_id: mediaId })
        .eq("associate_id", sessionRes.associate.id);

      if (updateError) {
        console.error("Error al actualizar profile_media_id:", updateError);
        return NextResponse.json(
          { success: false, error: "No se pudo actualizar la foto en el perfil." },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Foto de perfil actualizada exitosamente.",
      profile_media_id: mediaId,
      public_url: publicUrl,
    });
  } catch (err: unknown) {
    console.error("POST /api/portal/profile/avatar error:", err);
    return NextResponse.json(
      { success: false, error: "Error interno del servidor al procesar la imagen." },
      { status: 500 }
    );
  }
}
