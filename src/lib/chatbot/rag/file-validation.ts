import { RagError } from "./types";

export const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

export interface AllowedTypeConfig {
  extension: string;
  allowedMimes: string[];
}

export const ALLOWED_DOCUMENT_TYPES: Record<string, string[]> = {
  pdf: ["application/pdf"],
  docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  doc: ["application/msword", "application/x-msword"],
  xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  xls: ["application/vnd.ms-excel"],
  csv: ["text/csv", "application/csv", "text/plain", "application/vnd.ms-excel"],
  txt: ["text/plain"],
  md: ["text/markdown", "text/plain", "text/x-markdown"],
};

/**
 * Valida la extensión, el MIME type y el tamaño máximo defensivo (15 MB)
 */
export function validateDocumentFile(
  fileName: string,
  mimeType: string,
  sizeBytes: number
): { extension: string; mimeType: string } {
  if (!fileName || fileName.trim().length === 0) {
    throw new RagError("DOCUMENT_CREATE_FAILED", "El nombre de archivo no puede estar vacío.", 400);
  }

  if (sizeBytes <= 0) {
    throw new RagError("DOCUMENT_CREATE_FAILED", "El archivo proporcionado está vacío (0 bytes).", 400);
  }

  if (sizeBytes > MAX_FILE_SIZE_BYTES) {
    throw new RagError(
      "DOCUMENT_CREATE_FAILED",
      `El tamaño del archivo (${(sizeBytes / (1024 * 1024)).toFixed(2)} MB) supera el límite máximo permitido de 15 MB.`,
      400
    );
  }

  const extMatch = fileName.toLowerCase().match(/\.([a-z0-9]+)$/);
  if (!extMatch) {
    throw new RagError(
      "DOCUMENT_CREATE_FAILED",
      "El archivo no posee una extensión válida (ej: .pdf, .docx, .xlsx, .txt, .csv).",
      400
    );
  }

  const ext = extMatch[1];
  const allowedMimes = ALLOWED_DOCUMENT_TYPES[ext];

  if (!allowedMimes) {
    throw new RagError(
      "DOCUMENT_CREATE_FAILED",
      `La extensión '.${ext}' no está permitida. Formatos aceptados: PDF, DOCX, DOC, XLSX, XLS, CSV, TXT, MD.`,
      400
    );
  }

  const normalizedMime = mimeType ? mimeType.toLowerCase().trim() : "";
  const isMimeValid =
    allowedMimes.includes(normalizedMime) ||
    normalizedMime === "application/octet-stream" || // Fallback genérico para uploads multipart
    normalizedMime === "";

  if (!isMimeValid) {
    throw new RagError(
      "DOCUMENT_CREATE_FAILED",
      `El tipo MIME '${mimeType}' es incompatible con la extensión '.${ext}'.`,
      400
    );
  }

  return {
    extension: ext,
    mimeType: allowedMimes[0],
  };
}

/**
 * Sanitiza un nombre de archivo para usarlo de forma segura en Storage y rutas de sistema
 */
export function sanitizeFilename(fileName: string): string {
  return fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Quitar acentos
    .replace(/[^a-zA-Z0-9._-]/g, "_") // Reemplazar caracteres especiales por '_'
    .replace(/_+/g, "_"); // Reemplazar '_' repetidos
}
