import { supabaseAdmin } from "@/lib/supabase/admin";
import { DocumentChunk } from "@/lib/chatbot/documents/types";
import { RagError } from "./types";

// Guardrail Server-Only
if (typeof window !== "undefined") {
  throw new Error("El repositorio documental sólo puede ejecutarse en el servidor.");
}

export interface CreateDocumentPayload {
  name: string;
  originalFilename: string;
  storagePath: string;
  fileType: string;
  mimeType: string;
  fileSize: number;
  category?: string;
  description?: string;
  createdBy?: string;
}

/**
 * Busca un registro de documento existente por su ruta de almacenamiento (storage_path)
 */
export async function findDocumentByStoragePath(
  storagePath: string
): Promise<{ id: string; status: string; chunk_count: number } | null> {
  const { data, error } = await supabaseAdmin
    .from("chatbot_documents")
    .select("id, status, chunk_count")
    .eq("storage_path", storagePath)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

/**
 * Registra la cabecera inicial de un documento en public.chatbot_documents con status 'processing'
 */
export async function createDocumentRecord(
  payload: CreateDocumentPayload
): Promise<string> {
  const { data, error } = await supabaseAdmin
    .from("chatbot_documents")
    .insert({
      name: payload.name,
      original_filename: payload.originalFilename,
      storage_path: payload.storagePath,
      file_type: payload.fileType,
      mime_type: payload.mimeType,
      file_size: payload.fileSize,
      category: payload.category || null,
      description: payload.description || null,
      created_by: payload.createdBy || null,
      status: "processing",
      is_active: true,
      chunk_count: 0,
      processing_error: null,
    })
    .select("id")
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      throw new RagError(
        "DOCUMENT_CREATE_FAILED",
        `Ya existe un documento registrado con la ruta de almacenamiento (${payload.storagePath}).`,
        409,
        error.message
      );
    }
    throw new RagError(
      "DOCUMENT_CREATE_FAILED",
      "No se pudo crear el registro del documento en la base de datos.",
      500,
      error?.message
    );
  }

  return data.id;
}

/**
 * Inserta un conjunto de chunks y sus vectores de 768 dimensiones en lotes (bulk insert)
 */
export async function insertChunksBulk(
  documentId: string,
  chunks: DocumentChunk[],
  vectors: number[][],
  batchSize = 30
): Promise<number> {
  if (!chunks || chunks.length === 0 || !vectors || vectors.length !== chunks.length) {
    throw new RagError(
      "DOCUMENT_CHUNK_INSERT_FAILED",
      "La cantidad de fragmentos y vectores debe ser idéntica y mayor a cero."
    );
  }

  let totalInserted = 0;

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batchChunks = chunks.slice(i, i + batchSize);
    const batchVectors = vectors.slice(i, i + batchSize);

    const rowsToInsert = batchChunks.map((chunk, batchIdx) => ({
      document_id: documentId,
      chunk_index: chunk.chunkIndex,
      content: chunk.content,
      token_count: chunk.tokenCount,
      metadata: chunk.metadata || {},
      embedding: batchVectors[batchIdx],
    }));

    const { error } = await supabaseAdmin
      .from("chatbot_document_chunks")
      .insert(rowsToInsert);

    if (error) {
      throw new RagError(
        "DOCUMENT_CHUNK_INSERT_FAILED",
        `Fallo al insertar lote de fragmentos (${i} a ${i + batchChunks.length - 1}) en la base de datos: ${error.message}`,
        500,
        error.message
      );
    }

    totalInserted += batchChunks.length;
  }

  return totalInserted;
}

/**
 * Elimina de forma defensiva todos los fragmentos asociados a un documento sin borrar el registro de cabecera
 */
export async function deleteDocumentChunks(documentId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("chatbot_document_chunks")
    .delete()
    .eq("document_id", documentId);

  if (error) {
    console.error(
      `[RAG Cleanup Error] No se pudieron eliminar los fragmentos parciales del documento ${documentId}:`,
      error.message
    );
  }
}

/**
 * Actualiza el estado final y conteo de fragmentos de un documento (ready o failed)
 */
export async function updateDocumentStatus(
  documentId: string,
  status: "ready" | "failed",
  chunkCount: number,
  errorMessage: string | null = null
): Promise<void> {
  const { error } = await supabaseAdmin
    .from("chatbot_documents")
    .update({
      status,
      chunk_count: chunkCount,
      processing_error: errorMessage ? errorMessage.slice(0, 1000) : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", documentId);

  if (error) {
    throw new RagError(
      "DOCUMENT_STATUS_UPDATE_FAILED",
      `No se pudo actualizar el estado del documento ${documentId} a '${status}'.`,
      500,
      error.message
    );
  }
}

/**
 * Elimina un documento registrado de chatbot_documents (ON DELETE CASCADE elimina sus chunks)
 */
export async function deleteDocumentRecord(documentId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("chatbot_documents")
    .delete()
    .eq("id", documentId);

  if (error) {
    throw new RagError(
      "DOCUMENT_NOT_FOUND",
      `No se pudo eliminar el documento ${documentId}.`,
      500,
      error.message
    );
  }
}
