import { supabaseAdmin } from "@/lib/supabase/admin";
import { embedText } from "@/lib/chatbot/embeddings/embed-text";
import { RagError, SearchResultItem, SemanticSearchOptions } from "./types";

// Guardrail Server-Only
if (typeof window !== "undefined") {
  throw new Error("La búsqueda semántica sólo puede ejecutarse en el servidor.");
}

const MAX_QUERY_LENGTH_CHARS = 2000;

/**
 * Función server-side de búsqueda semántica vectorial sobre la base de conocimiento documental
 */
export async function searchDocumentKnowledge(
  options: SemanticSearchOptions
): Promise<SearchResultItem[]> {
  const query = options.query ? options.query.trim() : "";

  if (query.length === 0) {
    throw new RagError(
      "SEMANTIC_SEARCH_FAILED",
      "La consulta de búsqueda semántica no puede estar vacía.",
      400
    );
  }

  if (query.length > MAX_QUERY_LENGTH_CHARS) {
    throw new RagError(
      "SEMANTIC_SEARCH_FAILED",
      `La consulta excede el límite máximo de ${MAX_QUERY_LENGTH_CHARS} caracteres.`,
      400
    );
  }

  const effectiveCount = Math.max(1, Math.min(options.matchCount ?? 5, 20));
  const effectiveThreshold = Math.max(0.0, Math.min(options.matchThreshold ?? 0.5, 1.0));

  let queryVector: number[];
  try {
    queryVector = await embedText(query);
  } catch (err: any) {
    throw new RagError(
      "SEMANTIC_SEARCH_FAILED",
      "No se pudo generar el embedding de la consulta semántica.",
      500,
      err?.message
    );
  }

  const { data, error } = await supabaseAdmin.rpc(
    "match_chatbot_document_chunks",
    {
      query_embedding: queryVector,
      match_threshold: effectiveThreshold,
      match_count: effectiveCount,
    }
  );

  if (error) {
    throw new RagError(
      "SEMANTIC_SEARCH_FAILED",
      "Error al ejecutar la consulta vectorial en la base de datos.",
      500,
      error.message
    );
  }

  if (!Array.isArray(data)) {
    return [];
  }

  return data.map((row: any) => ({
    chunkId: row.chunk_id,
    documentId: row.document_id,
    documentName: row.document_name,
    category: row.category || null,
    content: row.content,
    metadata: row.metadata || {},
    similarity: typeof row.similarity === "number" ? row.similarity : parseFloat(row.similarity || "0"),
  }));
}
