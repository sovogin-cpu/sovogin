import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/chatbot/rag/admin-auth";
import { validateDocumentFile, sanitizeFilename } from "@/lib/chatbot/rag/file-validation";
import { ingestDocument } from "@/lib/chatbot/rag/document-ingestion";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { RagError } from "@/lib/chatbot/rag/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/chatbot/documents
 * Obtiene la lista completa de documentos registrados en la base de conocimientos RAG
 */
export async function GET() {
  try {
    await requireAdminUser();

    const { data, error } = await supabaseAdmin
      .from("chatbot_documents")
      .select(
        "id, name, original_filename, storage_path, file_type, mime_type, file_size, category, description, status, is_active, chunk_count, processing_error, created_at, updated_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    const documents = (data || []).map((doc: any) => ({
      id: doc.id,
      name: doc.name,
      originalFilename: doc.original_filename,
      storagePath: doc.storage_path,
      fileType: doc.file_type,
      mimeType: doc.mime_type,
      fileSize: doc.file_size,
      category: doc.category || null,
      description: doc.description || null,
      status: doc.status,
      isActive: doc.is_active,
      chunkCount: doc.chunk_count,
      processingError: doc.processing_error || null,
      createdAt: doc.created_at,
      updatedAt: doc.updated_at,
    }));

    return NextResponse.json({ documents });
  } catch (err: any) {
    const status = err?.status || (err?.message === "UNAUTHORIZED" ? 401 : err?.message === "FORBIDDEN" ? 403 : 500);
    return NextResponse.json(
      { error: err?.message || "Error al obtener documentos" },
      { status }
    );
  }
}

/**
 * POST /api/admin/chatbot/documents
 * Sube un nuevo documento al bucket privado chatbot-docs y procesa la ingesta vectorial RAG
 */
export async function POST(req: Request) {
  try {
    const user = await requireAdminUser();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const name = (formData.get("name") as string) || undefined;
    const category = (formData.get("category") as string) || undefined;
    const description = (formData.get("description") as string) || undefined;

    if (!file) {
      return NextResponse.json(
        { error: "No se proporcionó ningún archivo en la petición." },
        { status: 400 }
      );
    }

    // Validar archivo (extensión, MIME, 15MB max)
    const { mimeType } = validateDocumentFile(file.name, file.type, file.size);

    const documentUuid = crypto.randomUUID();
    const safeFilename = sanitizeFilename(file.name);
    const storagePath = `${documentUuid}/${crypto.randomUUID().slice(0, 8)}_${safeFilename}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 1. Subir archivo a Storage privado chatbot-docs
    const { error: storageError } = await supabaseAdmin.storage
      .from("chatbot-docs")
      .upload(storagePath, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (storageError) {
      return NextResponse.json(
        { error: `Fallo al subir el archivo al almacenamiento privado: ${storageError.message}` },
        { status: 500 }
      );
    }

    // 2. Iniciar ingesta documental y generación de embeddings
    try {
      const result = await ingestDocument({
        buffer,
        fileName: file.name,
        storagePath,
        name: name || file.name,
        mimeType,
        category,
        description,
        createdBy: user.id,
      });

      return NextResponse.json({ document: result }, { status: 201 });
    } catch (ingestErr: any) {
      // Compensación de Inconsistencia: Si falló la creación del registro inicial en BD, intentar borrar el archivo recién subido
      if (ingestErr instanceof RagError && ingestErr.code === "DOCUMENT_CREATE_FAILED") {
        const { error: cleanupError } = await supabaseAdmin.storage
          .from("chatbot-docs")
          .remove([storagePath]);

        if (cleanupError) {
          return NextResponse.json(
            {
              error: `Fallo en la creación del registro documental (${ingestErr.message}). Se detectó una inconsistencia: el archivo no pudo ser eliminado de Storage (${storagePath}).`,
              code: "STORAGE_INCONSISTENCY",
            },
            { status: 500 }
          );
        }
      }
      throw ingestErr;
    }
  } catch (err: any) {
    if (err instanceof RagError) {
      return NextResponse.json(
        { error: err.message, code: err.code },
        { status: err.status || 500 }
      );
    }

    const status = err?.status || (err?.message === "UNAUTHORIZED" ? 401 : err?.message === "FORBIDDEN" ? 403 : 500);
    return NextResponse.json(
      { error: err?.message || "Error al procesar la subida del documento." },
      { status }
    );
  }
}
