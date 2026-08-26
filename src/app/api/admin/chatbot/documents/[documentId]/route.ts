import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/chatbot/rag/admin-auth";
import { deleteDocumentRecord } from "@/lib/chatbot/rag/document-repository";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ documentId: string }>;
}

/**
 * PATCH /api/admin/chatbot/documents/[documentId]
 * Actualiza el estado activo/inactivo (is_active) o la metadata del documento
 */
export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    await requireAdminUser();
    const { documentId } = await params;
    const body = await req.json();

    const updates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (typeof body.isActive === "boolean") {
      updates.is_active = body.isActive;
    }
    if (typeof body.name === "string" && body.name.trim().length > 0) {
      updates.name = body.name.trim();
    }
    if (typeof body.category === "string") {
      updates.category = body.category.trim() || null;
    }
    if (typeof body.description === "string") {
      updates.description = body.description.trim() || null;
    }

    const { data, error } = await supabaseAdmin
      .from("chatbot_documents")
      .update(updates)
      .eq("id", documentId)
      .select("id, name, original_filename, storage_path, file_type, mime_type, file_size, category, description, status, is_active, chunk_count, processing_error, created_at, updated_at")
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "No se pudo actualizar el documento especificado." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      document: {
        id: data.id,
        name: data.name,
        originalFilename: data.original_filename,
        storagePath: data.storage_path,
        fileType: data.file_type,
        mimeType: data.mime_type,
        fileSize: data.file_size,
        category: data.category || null,
        description: data.description || null,
        status: data.status,
        isActive: data.is_active,
        chunkCount: data.chunk_count,
        processingError: data.processing_error || null,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    });
  } catch (err: any) {
    const status = err?.status || (err?.message === "UNAUTHORIZED" ? 401 : err?.message === "FORBIDDEN" ? 403 : 500);
    return NextResponse.json(
      { error: err?.message || "Error al actualizar el documento." },
      { status }
    );
  }
}

/**
 * DELETE /api/admin/chatbot/documents/[documentId]
 * Elimina un documento de Storage privado y de la base de datos (CASCADE elimina chunks)
 */
export async function DELETE(_req: Request, { params }: RouteParams) {
  try {
    await requireAdminUser();
    const { documentId } = await params;

    // 1. Obtener la ruta de almacenamiento (storage_path) del documento
    const { data: doc, error: fetchError } = await supabaseAdmin
      .from("chatbot_documents")
      .select("id, storage_path")
      .eq("id", documentId)
      .single();

    if (fetchError || !doc) {
      return NextResponse.json(
        { error: "El documento especificado no existe." },
        { status: 404 }
      );
    }

    // 2. Eliminar el archivo físico de Storage privado chatbot-docs
    if (doc.storage_path) {
      const { error: storageError } = await supabaseAdmin.storage
        .from("chatbot-docs")
        .remove([doc.storage_path]);

      // Si falla el borrado de Storage, NO eliminar el registro de BD para evitar archivos huérfanos sin control
      if (storageError) {
        return NextResponse.json(
          { error: `No se pudo eliminar el archivo de Storage (${storageError.message}). La eliminación fue abortada para mantener la integridad.` },
          { status: 500 }
        );
      }
    }

    // 3. Eliminar el registro de la base de datos (ON DELETE CASCADE elimina los chunks vectoriales)
    try {
      await deleteDocumentRecord(documentId);
    } catch (dbErr: any) {
      console.error(
        `[Inconsistency Alert] El archivo de Storage (${doc.storage_path}) fue eliminado, pero falló la eliminación en BD para el documento ${documentId}:`,
        dbErr.message
      );
      return NextResponse.json(
        {
          error: `Inconsistencia detectada: el archivo fue eliminado de Storage, pero no se pudo eliminar el registro en la base de datos (${dbErr.message}).`,
          code: "DB_DELETE_INCONSISTENCY",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    const status = err?.status || (err?.message === "UNAUTHORIZED" ? 401 : err?.message === "FORBIDDEN" ? 403 : 500);
    return NextResponse.json(
      { error: err?.message || "Error al eliminar el documento." },
      { status }
    );
  }
}
