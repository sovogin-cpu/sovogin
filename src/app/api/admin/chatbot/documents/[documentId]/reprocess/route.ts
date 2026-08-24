import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/chatbot/rag/admin-auth";
import { processDocumentBuffer } from "@/lib/chatbot/documents/extract-text";
import { embedTexts } from "@/lib/chatbot/embeddings/embed-text";
import {
  deleteDocumentChunks,
  insertChunksBulk,
  updateDocumentStatus,
} from "@/lib/chatbot/rag/document-repository";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface RouteParams {
  params: Promise<{ documentId: string }>;
}

/**
 * POST /api/admin/chatbot/documents/[documentId]/reprocess
 * Lee el archivo desde Storage privado, purga los fragmentos previos y vuelve a generar los chunks y embeddings vectoriales
 */
export async function POST(_req: Request, { params }: RouteParams) {
  try {
    await requireAdminUser();
    const { documentId } = await params;

    // 1. Obtener registro del documento
    const { data: doc, error: fetchError } = await supabaseAdmin
      .from("chatbot_documents")
      .select("id, name, original_filename, storage_path, mime_type")
      .eq("id", documentId)
      .single();

    if (fetchError || !doc) {
      return NextResponse.json(
        { error: "El documento especificado no existe." },
        { status: 404 }
      );
    }

    // 2. Descargar archivo desde Storage privado chatbot-docs
    const { data: fileBlob, error: downloadError } = await supabaseAdmin.storage
      .from("chatbot-docs")
      .download(doc.storage_path);

    if (downloadError || !fileBlob) {
      return NextResponse.json(
        { error: `No se pudo descargar el archivo desde Storage para el reprocesamiento: ${downloadError?.message || "Archivo no encontrado"}` },
        { status: 500 }
      );
    }

    const arrayBuffer = await fileBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 3. Cambiar estado a 'processing' y purgar chunks anteriores
    await deleteDocumentChunks(documentId);
    await updateDocumentStatus(documentId, "processing", 0, null);

    try {
      // 4. Extracción + Normalización + Chunking
      const processed = await processDocumentBuffer(
        buffer,
        doc.original_filename,
        doc.mime_type
      );

      if (!processed.chunks || processed.chunks.length === 0) {
        throw new Error("El documento no generó ningún fragmento de texto procesable.");
      }

      // 5. Generación de embeddings (Google Gen AI 768d)
      const chunkTexts = processed.chunks.map((c) => c.content);
      const embeddingBatch = await embedTexts(chunkTexts, 5);

      // 6. Inserción Bulk
      await insertChunksBulk(documentId, processed.chunks, embeddingBatch.vectors, 30);

      // 7. Marcar como ready
      await updateDocumentStatus(documentId, "ready", processed.chunks.length, null);

      return NextResponse.json({
        success: true,
        documentId,
        chunkCount: processed.chunks.length,
        status: "ready",
      });
    } catch (err: any) {
      const errorMessage = err?.message || "Fallo durante el reprocesamiento de embeddings.";

      await deleteDocumentChunks(documentId);
      await updateDocumentStatus(documentId, "failed", 0, errorMessage);

      return NextResponse.json(
        { error: `Fallo en el reprocesamiento: ${errorMessage}` },
        { status: 500 }
      );
    }
  } catch (err: any) {
    const status = err?.status || (err?.message === "UNAUTHORIZED" ? 401 : err?.message === "FORBIDDEN" ? 403 : 500);
    return NextResponse.json(
      { error: err?.message || "Error al reprocesar el documento." },
      { status }
    );
  }
}
