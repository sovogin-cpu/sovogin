/**
 * Tipos y DTOs para la Capa Server-Side de Persistencia RAG y Búsqueda Semántica
 */

export type RagErrorCode =
  | "DOCUMENT_CREATE_FAILED"
  | "DOCUMENT_CHUNK_INSERT_FAILED"
  | "DOCUMENT_STATUS_UPDATE_FAILED"
  | "DOCUMENT_NOT_FOUND"
  | "SEMANTIC_SEARCH_FAILED";

export class RagError extends Error {
  public readonly code: RagErrorCode;
  public readonly status?: number;
  public readonly details?: string;

  constructor(code: RagErrorCode, message: string, status?: number, details?: string) {
    super(message);
    this.name = "RagError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export interface IngestDocumentOptions {
  buffer: Buffer;
  fileName: string;
  storagePath: string;
  name?: string;
  mimeType?: string;
  category?: string;
  description?: string;
  createdBy?: string;
}

export interface IngestDocumentResult {
  documentId: string;
  name: string;
  storagePath: string;
  chunkCount: number;
  status: "ready" | "failed";
  durationMs: number;
}

export interface SemanticSearchOptions {
  query: string;
  matchThreshold?: number;
  matchCount?: number;
}

export interface SearchResultItem {
  chunkId: string;
  documentId: string;
  documentName: string;
  category: string | null;
  content: string;
  metadata: Record<string, any>;
  similarity: number;
}
