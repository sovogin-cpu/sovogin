import {
  DocumentExtractionResult,
  DocumentChunk,
  ChunkMetadata,
} from "./types";

/**
 * Estimación rápida y precisa de tokens (promedio ~4 caracteres por token o ~1.3 tokens por palabra)
 */
export function estimateTokenCount(text: string): number {
  if (!text || text.trim().length === 0) return 0;
  const words = text.trim().split(/\s+/).length;
  const charEstimate = Math.ceil(text.length / 4);
  const wordEstimate = Math.ceil(words * 1.3);
  return Math.max(charEstimate, wordEstimate);
}

/**
 * Extrae el título o encabezado de sección activo dentro de un texto si existe
 */
function extractSectionTitle(text: string): string | undefined {
  const match = text.match(/^(?:#+\s*|\[Hoja:\s*|\[Sección:\s*)(.+?)(?:\]|\n|$)/m);
  if (match && match[1]) {
    return match[1].trim();
  }
  return undefined;
}

/**
 * Fragmenta un bloque continuo de texto respetando párrafos y solapamiento
 */
function chunkContinuousText(
  text: string,
  baseMetadata: ChunkMetadata,
  targetWordsPerChunk = 450,
  overlapWords = 60
): { content: string; metadata: ChunkMetadata }[] {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0);

  if (paragraphs.length === 0) return [];

  const results: { content: string; metadata: ChunkMetadata }[] = [];
  let currentParagraphs: string[] = [];
  let currentWordCount = 0;
  let activeSectionTitle: string | undefined = baseMetadata.sectionTitle;

  for (const para of paragraphs) {
    const title = extractSectionTitle(para);
    if (title) {
      activeSectionTitle = title;
    }

    const paraWords = para.split(/\s+/).length;

    // Si añadir este párrafo excede el tamaño objetivo y ya tenemos contenido acumulado
    if (currentWordCount + paraWords > targetWordsPerChunk && currentParagraphs.length > 0) {
      const chunkText = currentParagraphs.join("\n\n").trim();
      results.push({
        content: chunkText,
        metadata: {
          ...baseMetadata,
          sectionTitle: activeSectionTitle || extractSectionTitle(chunkText),
        },
      });

      // Calcular solapamiento (overlap) reteniendo los párrafos finales
      let overlapAcc: string[] = [];
      let overlapCount = 0;
      for (let i = currentParagraphs.length - 1; i >= 0; i--) {
        const pWords = currentParagraphs[i].split(/\s+/).length;
        if (overlapCount + pWords <= overlapWords) {
          overlapAcc.unshift(currentParagraphs[i]);
          overlapCount += pWords;
        } else {
          break;
        }
      }

      currentParagraphs = [...overlapAcc, para];
      currentWordCount = overlapCount + paraWords;
    } else {
      currentParagraphs.push(para);
      currentWordCount += paraWords;
    }
  }

  // Fragmento final si queda contenido
  if (currentParagraphs.length > 0) {
    const finalChunkText = currentParagraphs.join("\n\n").trim();
    results.push({
      content: finalChunkText,
      metadata: {
        ...baseMetadata,
        sectionTitle: activeSectionTitle || extractSectionTitle(finalChunkText),
      },
    });
  }

  return results;
}

/**
 * Función principal de chunking de un resultado de extracción
 */
export function chunkDocument(
  extraction: DocumentExtractionResult,
  targetWordsPerChunk = 450,
  overlapWords = 60
): DocumentChunk[] {
  const rawChunks: { content: string; metadata: ChunkMetadata }[] = [];

  // 1. Si el documento proviene de un PDF con desglose por páginas
  if (extraction.pages && extraction.pages.length > 0) {
    for (const page of extraction.pages) {
      if (!page.text || page.text.trim().length === 0) continue;
      const pageChunks = chunkContinuousText(
        page.text,
        { pageNumber: page.pageNumber },
        targetWordsPerChunk,
        overlapWords
      );
      rawChunks.push(...pageChunks);
    }
  }
  // 2. Si el documento proviene de Excel / CSV con desglose por hojas
  else if (extraction.sheets && extraction.sheets.length > 0) {
    for (const sheet of extraction.sheets) {
      if (!sheet.text || sheet.text.trim().length === 0) continue;
      const sheetChunks = chunkContinuousText(
        sheet.text,
        { sheetName: sheet.sheetName },
        targetWordsPerChunk,
        overlapWords
      );
      rawChunks.push(...sheetChunks);
    }
  }
  // 3. Documentos continuos (TXT, Markdown, Word)
  else if (extraction.normalizedText && extraction.normalizedText.trim().length > 0) {
    const continuousChunks = chunkContinuousText(
      extraction.normalizedText,
      {},
      targetWordsPerChunk,
      overlapWords
    );
    rawChunks.push(...continuousChunks);
  }

  // Asignar índices consecutivos y calcular tokenCount
  return rawChunks.map((chunk, index) => ({
    chunkIndex: index,
    content: chunk.content,
    tokenCount: estimateTokenCount(chunk.content),
    metadata: chunk.metadata,
  }));
}
