import {
  DocumentExtractionResult,
  DocumentProcessingError,
  ProcessedDocumentPayload,
  SupportedFileType,
} from "./types";
import { extractTextFromPlainOrMarkdown } from "./extractors/text";
import { extractTextFromSpreadsheet } from "./extractors/spreadsheet";
import { extractTextFromWord } from "./extractors/word";
import { extractTextFromPdf } from "./extractors/pdf";
import { chunkDocument } from "./chunk-text";

// Guardrail Server-Only
if (typeof window !== "undefined") {
  throw new Error("El procesamiento de documentos sólo puede ejecutarse en el servidor.");
}

const MAX_FILE_SIZE_BYTES = 15 * 1024 * 1024; // 15 MB

/**
 * Infiere el tipo de archivo soportado según la extensión o el tipo MIME
 */
export function inferSupportedFileType(fileName: string, mimeType?: string): SupportedFileType {
  const ext = fileName.split(".").pop()?.toLowerCase() || "";

  if (ext === "pdf" || mimeType?.includes("pdf")) return "pdf";
  if (ext === "docx" || mimeType?.includes("wordprocessingml")) return "docx";
  if (ext === "doc" || mimeType === "application/msword") return "doc";
  if (ext === "xlsx" || mimeType?.includes("spreadsheetml")) return "xlsx";
  if (ext === "xls" || mimeType === "application/vnd.ms-excel") return "xls";
  if (ext === "csv" || mimeType === "text/csv") return "csv";
  if (ext === "txt" || mimeType === "text/plain") return "txt";
  if (ext === "md" || ext === "markdown" || mimeType === "text/markdown") return "md";

  throw new DocumentProcessingError(
    "UNSUPPORTED_FILE_TYPE",
    `El tipo de archivo o extensión (.${ext}) no está soportado. Formatos permitidos: PDF, DOCX, DOC, XLSX, XLS, CSV, TXT, MD.`
  );
}

/**
 * Función principal Server-Side de procesamiento de documentos en memoria
 */
export async function processDocumentBuffer(
  buffer: Buffer,
  fileName: string,
  mimeType?: string
): Promise<ProcessedDocumentPayload> {
  if (!buffer || buffer.length === 0) {
    throw new DocumentProcessingError("EMPTY_FILE", "El archivo proporcionado está vacío (0 bytes).");
  }

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new DocumentProcessingError(
      "FILE_TOO_LARGE",
      `El tamaño del archivo (${(buffer.length / (1024 * 1024)).toFixed(2)} MB) excede el límite máximo permitido de 15 MB.`
    );
  }

  const fileType = inferSupportedFileType(fileName, mimeType);
  const resolvedMime = mimeType || `application/${fileType}`;

  let extraction: DocumentExtractionResult;

  switch (fileType) {
    case "txt":
    case "md":
      extraction = extractTextFromPlainOrMarkdown(buffer, fileName, fileType, resolvedMime);
      break;

    case "xlsx":
    case "xls":
    case "csv":
      extraction = extractTextFromSpreadsheet(buffer, fileName, fileType, resolvedMime);
      break;

    case "docx":
    case "doc":
      extraction = await extractTextFromWord(buffer, fileName, fileType, resolvedMime);
      break;

    case "pdf":
      extraction = await extractTextFromPdf(buffer, fileName, resolvedMime);
      break;

    default:
      throw new DocumentProcessingError(
        "UNSUPPORTED_FILE_TYPE",
        `Formato no soportado para extracción: ${fileType}`
      );
  }

  const chunks = chunkDocument(extraction);

  return {
    extraction,
    chunks,
  };
}
