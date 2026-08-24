import {
  DocumentExtractionResult,
  DocumentProcessingError,
  SupportedFileType,
} from "../types";
import { normalizeText } from "../normalize-text";

export function extractTextFromPlainOrMarkdown(
  buffer: Buffer,
  fileName: string,
  fileType: "txt" | "md",
  mimeType: string
): DocumentExtractionResult {
  if (!buffer || buffer.length === 0) {
    throw new DocumentProcessingError("EMPTY_FILE", "El archivo está vacío.");
  }

  let rawText = buffer.toString("utf-8");

  // Eliminar BOM (Byte Order Mark) si existe
  if (rawText.charCodeAt(0) === 0xfeff) {
    rawText = rawText.slice(1);
  }

  const normalized = normalizeText(rawText);

  if (!normalized || normalized.length === 0) {
    throw new DocumentProcessingError(
      "NO_EXTRACTABLE_TEXT",
      "El archivo no contiene texto procesable."
    );
  }

  return {
    rawText,
    normalizedText: normalized,
    metadata: {
      fileName,
      fileType: fileType as SupportedFileType,
      mimeType,
      fileSize: buffer.length,
    },
  };
}
