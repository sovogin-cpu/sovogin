/**
 * Tipos y Errores para el Motor de Embeddings Server-Side (Google Generative AI)
 */

export type EmbeddingErrorCode =
  | "EMBEDDING_EMPTY_INPUT"
  | "EMBEDDING_INPUT_TOO_LARGE"
  | "EMBEDDING_PROVIDER_ERROR"
  | "EMBEDDING_RATE_LIMIT"
  | "EMBEDDING_INVALID_DIMENSION";

export class EmbeddingError extends Error {
  public readonly code: EmbeddingErrorCode;
  public readonly status?: number;
  public readonly details?: string;

  constructor(code: EmbeddingErrorCode, message: string, status?: number, details?: string) {
    super(message);
    this.name = "EmbeddingError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export interface EmbeddingResult {
  vector: number[];
  dimensions: number;
  model: string;
  durationMs: number;
}

export interface BatchEmbeddingResult {
  vectors: number[][];
  totalChunks: number;
  model: string;
  durationMs: number;
}
