import * as XLSX from "xlsx";
import {
  DocumentExtractionResult,
  DocumentProcessingError,
  SheetExtraction,
  SupportedFileType,
} from "../types";
import { normalizeText } from "../normalize-text";

export function extractTextFromSpreadsheet(
  buffer: Buffer,
  fileName: string,
  fileType: "xlsx" | "xls" | "csv",
  mimeType: string
): DocumentExtractionResult {
  if (!buffer || buffer.length === 0) {
    throw new DocumentProcessingError("EMPTY_FILE", "El archivo de hoja de cálculo está vacío.");
  }

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, { type: "buffer" });
  } catch (err: any) {
    throw new DocumentProcessingError(
      "PARSING_FAILED",
      "No se pudo interpretar el archivo de hoja de cálculo.",
      err?.message
    );
  }

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new DocumentProcessingError(
      "NO_EXTRACTABLE_TEXT",
      "La hoja de cálculo no contiene pestañas procesables."
    );
  }

  const sheetExtractions: SheetExtraction[] = [];
  const fullTextParts: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) continue;

    // Convertir hoja a matriz de filas (filtro de celdas)
    const rows = XLSX.utils.sheet_to_json<string[]>(worksheet, { header: 1, raw: false });

    const validLines: string[] = [];
    for (const row of rows) {
      if (!Array.isArray(row) || row.length === 0) continue;

      // Unir celdas no vacías con separador semántico pipe (|)
      const lineText = row
        .map((cell) => (cell !== undefined && cell !== null ? String(cell).trim() : ""))
        .join(" | ")
        .replace(/(?: \| )+/g, " | ")
        .trim();

      if (lineText.length > 0 && lineText !== "|") {
        validLines.push(lineText);
      }
    }

    if (validLines.length > 0) {
      const sheetHeader = `[Hoja: ${sheetName}]`;
      const sheetBody = validLines.join("\n");
      const fullSheetText = `${sheetHeader}\n${sheetBody}`;

      sheetExtractions.push({
        sheetName,
        text: fullSheetText,
        rowCount: validLines.length,
      });

      fullTextParts.push(fullSheetText);
    }
  }

  const combinedRawText = fullTextParts.join("\n\n");
  const normalizedText = normalizeText(combinedRawText);

  if (!normalizedText || normalizedText.length === 0) {
    throw new DocumentProcessingError(
      "NO_EXTRACTABLE_TEXT",
      "No se encontró contenido de texto ni celdas en la hoja de cálculo."
    );
  }

  return {
    rawText: combinedRawText,
    normalizedText,
    metadata: {
      fileName,
      fileType: fileType as SupportedFileType,
      mimeType,
      fileSize: buffer.length,
      sheetCount: sheetExtractions.length,
    },
    sheets: sheetExtractions,
  };
}
