import mammoth from "mammoth";
import {
  DocumentExtractionResult,
  DocumentProcessingError,
  SupportedFileType,
} from "../types";
import { normalizeText } from "../normalize-text";

/**
 * Convierte el HTML estructurado generado por Mammoth a representación Markdown semántica para LLMs
 */
function convertMammothHtmlToMarkdown(html: string): string {
  if (!html) return "";

  return html
    // Títulos H1-H6
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "\n\n# $1\n\n")
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "\n\n## $1\n\n")
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "\n\n### $1\n\n")
    .replace(/<h[4-6][^>]*>([\s\S]*?)<\/h[4-6]>/gi, "\n\n#### $1\n\n")

    // Párrafos
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "\n$1\n")

    // Tablas
    .replace(/<tr[^>]*>([\s\S]*?)<\/tr>/gi, (_, trContent) => {
      const cells: string[] = [];
      const cellMatches = trContent.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) || [];
      for (const cellHtml of cellMatches) {
        const cleanCell = cellHtml.replace(/<[^>]+>/g, "").trim();
        if (cleanCell.length > 0) {
          cells.push(cleanCell);
        }
      }
      return cells.length > 0 ? "\n" + cells.join(" | ") : "";
    })
    .replace(/<table[^>]*>([\s\S]*?)<\/table>/gi, "\n\n$1\n\n")

    // Listas
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "\n- $1")
    .replace(/<ul[^>]*>([\s\S]*?)<\/ul>/gi, "\n$1\n")
    .replace(/<ol[^>]*>([\s\S]*?)<\/ol>/gi, "\n$1\n")

    // Remover etiquetas HTML remanentes
    .replace(/<[^>]+>/g, "")
    // Entidades HTML comunes
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'");
}

/**
 * Extracción Best-Effort de archivos .doc legacy (cadenas imprimibles UTF-8 / ASCII)
 */
function extractLegacyDocText(buffer: Buffer): string {
  const printableStrings = buffer
    .toString("latin1")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, " ")
    .split(/\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10 && /[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9]/.test(s));

  return printableStrings.join("\n\n");
}

export async function extractTextFromWord(
  buffer: Buffer,
  fileName: string,
  fileType: "docx" | "doc",
  mimeType: string
): Promise<DocumentExtractionResult> {
  if (!buffer || buffer.length === 0) {
    throw new DocumentProcessingError("EMPTY_FILE", "El archivo Word está vacío.");
  }

  let rawText = "";

  if (fileType === "docx") {
    try {
      const htmlResult = await mammoth.convertToHtml({ buffer });
      rawText = convertMammothHtmlToMarkdown(htmlResult.value);

      // Fallback a extractRawText si la conversión HTML es excesivamente breve
      if (!rawText || rawText.trim().length < 5) {
        const rawResult = await mammoth.extractRawText({ buffer });
        rawText = rawResult.value;
      }
    } catch (err: any) {
      throw new DocumentProcessingError(
        "PARSING_FAILED",
        "No se pudo interpretar la estructura del archivo DOCX con Mammoth.",
        err?.message
      );
    }
  } else {
    // Legacy .doc format: Best-effort
    rawText = extractLegacyDocText(buffer);
  }

  const normalized = normalizeText(rawText);

  if (!normalized || normalized.trim().length < 5) {
    throw new DocumentProcessingError(
      "NO_EXTRACTABLE_TEXT",
      fileType === "doc"
        ? "El archivo .doc legacy no contiene texto extraíble en formato binario plano. Se recomienda convertirlo a .docx."
        : "No se pudo extraer texto procesable del documento Word."
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
