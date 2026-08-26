/**
 * Tipos y Errores para la Capa Server-Side de Extracción y Chunking de Documentos
 */

export type SupportedFileType = "pdf" | "docx" | "doc" | "xlsx" | "xls" | "csv" | "txt" | "md";

export type DocumentErrorCode =
  | "UNSUPPORTED_FILE_TYPE"
  | "FILE_TOO_LARGE"
  | "EMPTY_FILE"
  | "NO_EXTRACTABLE_TEXT"
  | "PARSING_FAILED";

export class DocumentProcessingError extends Error {
  public readonly code: DocumentErrorCode;
  public readonly details?: string;

  constructor(code: DocumentErrorCode, message: string, details?: string) {
    super(message);
    this.name = "DocumentProcessingError";
    this.code = code;
    this.details = details;
  }
}

export interface PageExtraction {
  pageNumber: number;
  text: string;
}

export interface SheetExtraction {
  sheetName: string;
  text: string;
  rowCount: number;
}

export interface DocumentMetadata {
  fileName: string;
  fileType: SupportedFileType;
  mimeType: string;
  fileSize: number;
  title?: string;
  pageCount?: number;
  sheetCount?: number;
}

export interface DocumentExtractionResult {
  rawText: string;
  normalizedText: string;
  metadata: DocumentMetadata;
  pages?: PageExtraction[];
  sheets?: SheetExtraction[];
}

export interface ChunkMetadata {
  pageNumber?: number;
  sheetName?: string;
  sectionTitle?: string;
}

export interface DocumentChunk {
  chunkIndex: number;
  content: string;
  tokenCount: number | null;
  metadata: ChunkMetadata;
}

export interface ProcessedDocumentPayload {
  extraction: DocumentExtractionResult;
  chunks: DocumentChunk[];
}
