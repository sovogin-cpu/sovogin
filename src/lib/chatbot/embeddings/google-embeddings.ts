import { GoogleGenAI } from "@google/genai";
import { EmbeddingError, EmbeddingResult } from "./types";

// Guardrail Server-Only
if (typeof window !== "undefined") {
  throw new Error("El motor de embeddings sólo puede ejecutarse en el servidor.");
}

export const EMBEDDING_MODEL = "gemini-embedding-2";
export const EMBEDDING_DIMENSIONS = 768;
export const MAX_RETRIES = 3;
export const MAX_CHUNK_CHARS = 10000; // ~2500 tokens máximo por chunk

/**
 * Obtiene la API Key de Google Generative AI de forma segura desde las variables de entorno
 */
function getGoogleApiKey(): string {
  const key =
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY;

  if (!key || key.trim().length === 0) {
    throw new EmbeddingError(
      "EMBEDDING_PROVIDER_ERROR",
      "No se encontró una API Key válida de Google (GOOGLE_GENERATIVE_AI_API_KEY / GEMINI_API_KEY) en las variables de entorno del servidor.",
      401
    );
  }

  return key.trim();
}

/**
 * Pausa la ejecución por los milisegundos especificados
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Determina si un error devuelto por el proveedor es reintentable (429, 5xx, timeout)
 */
function isTransientError(status?: number): boolean {
  if (!status) return true; // Errores de red o timeout sin status HTTP
  return status === 429 || status >= 500;
}

/**
 * Valida la compatibilidad del vector numérico con la extensión pgvector
 */
export function validatePgvectorCompatibility(vector: number[]): boolean {
  if (!Array.isArray(vector)) return false;
  if (vector.length !== EMBEDDING_DIMENSIONS) return false;
  return vector.every((val) => typeof val === "number" && Number.isFinite(val));
}

/**
 * Genera un embedding vectorial de 768 dimensiones para un fragmento de texto usando Google Gen AI SDK (@google/genai)
 */
export async function generateSingleEmbedding(text: string): Promise<EmbeddingResult> {
  const trimmed = text ? text.trim() : "";

  if (trimmed.length === 0) {
    throw new EmbeddingError(
      "EMBEDDING_EMPTY_INPUT",
      "El contenido de texto para generar el embedding no puede estar vacío."
    );
  }

  if (trimmed.length > MAX_CHUNK_CHARS) {
    throw new EmbeddingError(
      "EMBEDDING_INPUT_TOO_LARGE",
      `El tamaño del fragmento (${trimmed.length} caracteres) supera el límite máximo defensivo de ${MAX_CHUNK_CHARS} caracteres.`
    );
  }

  const apiKey = getGoogleApiKey();
  const startTime = Date.now();

  let attempt = 0;
  let lastError: any = null;

  while (attempt < MAX_RETRIES) {
    attempt++;

    try {
      const ai = new GoogleGenAI({ apiKey });

      const response = await ai.models.embedContent({
        model: EMBEDDING_MODEL,
        contents: trimmed,
        config: {
          outputDimensionality: EMBEDDING_DIMENSIONS,
        },
      });

      const vector = response?.embeddings?.[0]?.values;

      if (!vector || !Array.isArray(vector)) {
        throw new EmbeddingError(
          "EMBEDDING_PROVIDER_ERROR",
          "El proveedor Google Gen AI no devolvió una estructura de vector válida."
        );
      }

      // Validar dimensión estricta (768)
      if (vector.length !== EMBEDDING_DIMENSIONS) {
        throw new EmbeddingError(
          "EMBEDDING_INVALID_DIMENSION",
          `El vector generado tiene ${vector.length} dimensiones, pero se requieren exactamente ${EMBEDDING_DIMENSIONS}.`
        );
      }

      // Validar compatibilidad numérica con pgvector (finite numbers)
      if (!validatePgvectorCompatibility(vector)) {
        throw new EmbeddingError(
          "EMBEDDING_INVALID_DIMENSION",
          "El vector generado contiene valores no finitos (NaN, Infinity) incompatibles con pgvector."
        );
      }

      const durationMs = Date.now() - startTime;

      return {
        vector,
        dimensions: EMBEDDING_DIMENSIONS,
        model: EMBEDDING_MODEL,
        durationMs,
      };
    } catch (err: any) {
      lastError = err;

      // Si ya es un EmbeddingError de input/dimensión, no reintentar
      if (
        err instanceof EmbeddingError &&
        (err.code === "EMBEDDING_EMPTY_INPUT" ||
          err.code === "EMBEDDING_INPUT_TOO_LARGE" ||
          err.code === "EMBEDDING_INVALID_DIMENSION")
      ) {
        throw err;
      }

      const status = err?.status || err?.response?.status;

      // Si es un error de cliente no reintentable (400, 401, 403, 404), lanzar de inmediato
      if (status && (status === 400 || status === 401 || status === 403 || status === 404)) {
        throw new EmbeddingError(
          status === 429 ? "EMBEDDING_RATE_LIMIT" : "EMBEDDING_PROVIDER_ERROR",
          status === 401
            ? "API Key de Google inválida o no autorizada."
            : `Error de proveedor Google Gen AI (${status}).`,
          status,
          err?.message
        );
      }

      // Si no es reintentable o se agotaron los intentos
      if (!isTransientError(status) || attempt >= MAX_RETRIES) {
        break;
      }

      // Backoff exponencial: 200ms, 400ms, 800ms
      const backoffMs = 200 * Math.pow(2, attempt - 1);
      await delay(backoffMs);
    }
  }

  const finalStatus = lastError?.status || lastError?.response?.status;
  const isRateLimit = finalStatus === 429;

  throw new EmbeddingError(
    isRateLimit ? "EMBEDDING_RATE_LIMIT" : "EMBEDDING_PROVIDER_ERROR",
    `Fallo en generación de embedding tras ${attempt} intentos: ${lastError?.message || "Error desconocido"}`,
    finalStatus,
    lastError?.message
  );
}
