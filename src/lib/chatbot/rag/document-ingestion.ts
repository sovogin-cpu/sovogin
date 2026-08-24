import { processDocumentBuffer } from "@/lib/chatbot/documents/extract-text";
import { embedTexts } from "@/lib/chatbot/embeddings/embed-text";
import {
  createDocumentRecord,
  deleteDocumentChunks,
  deleteDocumentRecord,
  findDocumentByStoragePath,
  insertChunksBulk,
  updateDocumentStatus,
} from "./document-repository";
import { IngestDocumentOptions, IngestDocumentResult, RagError } from "./types";

// Guardrail Server-Only
if (typeof window !== "undefined") {
  throw new Error("La ingesta documental sólo puede ejecutarse en el servidor.");
}

/**
 * Función principal server-side de ingesta completa end-to-end con atomicidad y cleanup de chunks parciales
 */
export async function ingestDocument(
  options: IngestDocumentOptions
): Promise<IngestDocumentResult> {
  const startTime = Date.now();

  // 1. Validaciones iniciales
  if (!options.buffer || options.buffer.length === 0) {
    throw new RagError(
      "DOCUMENT_CREATE_FAILED",
      "El buffer del archivo proporcionado está vacío.",
      400
    );
  }

  if (!options.fileName || options.fileName.trim().length === 0) {
    throw new RagError(
      "DOCUMENT_CREATE_FAILED",
      "El nombre original del archivo es obligatorio.",
      400
    );
  }

  if (!options.storagePath || options.storagePath.trim().length === 0) {
    throw new RagError(
      "DOCUMENT_CREATE_FAILED",
      "La ruta de almacenamiento (storagePath) es obligatoria.",
      400
    );
  }

  // 2. Idempotencia & Re-ingesta sobre fallidos previos
  const existingDoc = await findDocumentByStoragePath(options.storagePath);
  if (existingDoc) {
    if (existingDoc.status === "ready") {
      throw new RagError(
        "DOCUMENT_CREATE_FAILED",
        `Ya existe un documento activo y disponible ('ready') registrado con la ruta (${options.storagePath}).`,
        409
      );
    }
    // Si el documento anterior quedó en estado 'failed' o 'processing' atascado, eliminarlo antes de reintentar
    try {
      await deleteDocumentRecord(existingDoc.id);
    } catch {
      // Continuar e intentar recrear
    }
  }

  // 3. Procesamiento documental en memoria (Extracción + Normalización + Chunking)
  const processed = await processDocumentBuffer(
    options.buffer,
    options.fileName,
    options.mimeType
  );

  if (!processed.chunks || processed.chunks.length === 0) {
    throw new RagError(
      "DOCUMENT_CREATE_FAILED",
      "El documento no generó ningún fragmento de texto procesable.",
      400
    );
  }

  // 4. Crear cabecera inicial en DB status = 'processing'
  const documentName = options.name || options.fileName;
  const documentId = await createDocumentRecord({
    name: documentName,
    originalFilename: options.fileName,
    storagePath: options.storagePath,
    fileType: processed.extraction.metadata.fileType,
    mimeType: processed.extraction.metadata.mimeType,
    fileSize: processed.extraction.metadata.fileSize,
    category: options.category,
    description: options.description,
    createdBy: options.createdBy,
  });

  try {
    // 5. Generación vectorial de embeddings para todos los chunks (Google Gen AI - 768d)
    const chunkTexts = processed.chunks.map((c) => c.content);
    const embeddingBatch = await embedTexts(chunkTexts, 5);

    // 6. Inserción bulk de chunks y vectores en chatbot_document_chunks (Lotes de 30)
    await insertChunksBulk(
      documentId,
      processed.chunks,
      embeddingBatch.vectors,
      30
    );

    // 7. Marcar documento como status = 'ready'
    await updateDocumentStatus(documentId, "ready", processed.chunks.length, null);

    const durationMs = Date.now() - startTime;

    return {
      documentId,
      name: documentName,
      storagePath: options.storagePath,
      chunkCount: processed.chunks.length,
      status: "ready",
      durationMs,
    };
  } catch (err: any) {
    const errorMessage = err?.message || "Fallo durante la generación de embeddings o inserción de vectores";

    // COMPENSACIÓN ATÓMICA DE ATOMICIDAD DE CHUNKS:
    // 1. Eliminar cualquier chunk parcial insertado por lotes previos
    await deleteDocumentChunks(documentId);

    // 2. Marcar cabecera como 'failed' con 0 chunks
    let statusUpdateFailed = false;
    try {
      await updateDocumentStatus(documentId, "failed", 0, errorMessage);
    } catch {
      statusUpdateFailed = true;
    }

    if (statusUpdateFailed) {
      throw new RagError(
        "DOCUMENT_STATUS_UPDATE_FAILED",
        `Fallo crítico de compensación: no se pudieron insertar los vectores ni actualizar el estado a 'failed' para el documento ${documentId}.`,
        500,
        errorMessage
      );
    }

    if (err instanceof RagError) {
      throw err;
    }

    throw new RagError(
      "DOCUMENT_CHUNK_INSERT_FAILED",
      `Fallo en ingesta vectorial del documento ${documentId}: ${errorMessage}`,
      500,
      errorMessage
    );
  }
}
