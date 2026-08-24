import {
  DocumentExtractionResult,
  DocumentProcessingError,
  PageExtraction,
  SupportedFileType,
} from "../types";
import { normalizeText } from "../normalize-text";

// Importación CJS de PDFParse
const { PDFParse } = require("pdf-parse");

export async function extractTextFromPdf(
  buffer: Buffer,
  fileName: string,
  mimeType: string
): Promise<DocumentExtractionResult> {
  if (!buffer || buffer.length === 0) {
    throw new DocumentProcessingError("EMPTY_FILE", "El archivo PDF está vacío.");
  }

  const pageExtractions: PageExtraction[] = [];
  let pdfResult: any;

  try {
    const parser = new PDFParse({ data: buffer });
    pdfResult = await parser.getText();
  } catch (err: any) {
    throw new DocumentProcessingError(
      "PARSING_FAILED",
      "No se pudo interpretar la estructura del archivo PDF digital.",
      err?.message
    );
  }

  if (pdfResult && Array.isArray(pdfResult.pages) && pdfResult.pages.length > 0) {
    for (const p of pdfResult.pages) {
      const normalizedPageText = normalizeText(p.text || "");
      if (normalizedPageText.length > 0) {
        pageExtractions.push({
          pageNumber: p.num || pageExtractions.length + 1,
          text: normalizedPageText,
        });
      }
    }
  }

  // Ordenar páginas por número consecutivo
  pageExtractions.sort((a, b) => a.pageNumber - b.pageNumber);

  const fullTextParts: string[] = [];
  for (const page of pageExtractions) {
    fullTextParts.push(`[Página ${page.pageNumber}]\n${page.text}`);
  }

  const combinedRawText = fullTextParts.join("\n\n");
  const normalizedText = normalizeText(combinedRawText || pdfResult?.text || "");

  // Threshold defensivo: rechaza PDFs vacíos o escaneados de sólo imagen sin capa de texto
  if (!normalizedText || normalizedText.trim().length < 5) {
    throw new DocumentProcessingError(
      "NO_EXTRACTABLE_TEXT",
      "El PDF no contiene capa de texto digital extraíble (posible documento escaneado sin OCR o protegido)."
    );
  }

  return {
    rawText: combinedRawText,
    normalizedText,
    metadata: {
      fileName,
      fileType: "pdf" as SupportedFileType,
      mimeType,
      fileSize: buffer.length,
      pageCount: pageExtractions.length || pdfResult?.total || 1,
    },
    pages: pageExtractions,
  };
}
