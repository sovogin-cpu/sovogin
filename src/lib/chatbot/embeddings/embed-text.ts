import {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL,
  generateSingleEmbedding,
} from "./google-embeddings";
import { BatchEmbeddingResult, EmbeddingError } from "./types";

/**
 * Genera un embedding vectorial de 768 dimensiones para un único texto
 */
export async function embedText(text: string): Promise<number[]> {
  const result = await generateSingleEmbedding(text);
  return result.vector;
}

/**
 * Genera embeddings vectoriales en lote para un arreglo de fragmentos de texto con concurrencia controlada
 */
export async function embedTexts(
  texts: string[],
  maxConcurrency = 5
): Promise<BatchEmbeddingResult> {
  if (!Array.isArray(texts) || texts.length === 0) {
    return {
      vectors: [],
      totalChunks: 0,
      model: EMBEDDING_MODEL,
      durationMs: 0,
    };
  }

  const startTime = Date.now();
  const results: number[][] = new Array(texts.length);
  const effectiveConcurrency = Math.max(1, Math.min(maxConcurrency, 10));

  // Procesamiento por ventanas de concurrencia para evitar saturación de API o Rate Limit
  for (let i = 0; i < texts.length; i += effectiveConcurrency) {
    const batch = texts.slice(i, i + effectiveConcurrency);

    const promises = batch.map(async (text, batchIndex) => {
      const originalIndex = i + batchIndex;
      const res = await generateSingleEmbedding(text);
      results[originalIndex] = res.vector;
    });

    await Promise.all(promises);
  }

  // Validar que no haya índices vacíos o incompletos
  for (let i = 0; i < results.length; i++) {
    if (!results[i] || results[i].length !== EMBEDDING_DIMENSIONS) {
      throw new EmbeddingError(
        "EMBEDDING_INVALID_DIMENSION",
        `Fallo al procesar el fragmento en la posición ${i}: vector no generado o dimensión inválida.`
      );
    }
  }

  const durationMs = Date.now() - startTime;

  return {
    vectors: results,
    totalChunks: texts.length,
    model: EMBEDDING_MODEL,
    durationMs,
  };
}
