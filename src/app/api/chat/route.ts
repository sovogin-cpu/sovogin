import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { searchDocumentKnowledge } from "@/lib/chatbot/rag/semantic-search";
import { SearchResultItem } from "@/lib/chatbot/rag/types";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

const MAX_QUERY_LENGTH_CHARS = 2000;
const RAG_TIMEOUT_MS = 5000;
const MAX_RAG_CHUNKS = 8;
const DEFAULT_MATCH_COUNT = 5;
const DEFAULT_MATCH_THRESHOLD = 0.5; // Default inicial calibrable
const MAX_RAG_CONTEXT_CHARS = 12000;
const MAX_LEGACY_CONTEXT_CHARS = 20000;

export interface ChatSourceMetadata {
  documentName: string;
  category: string | null;
  pageNumber?: number;
  sheetName?: string;
  sectionTitle?: string;
}

/**
 * Truncador seguro de cadenas para evitar corte en medio de un surrogate pair UTF-8.
 */
function safeTruncate(str: string, maxChars: number): string {
  if (str.length <= maxChars) return str;
  const sliced = str.slice(0, maxChars);
  const lastCharCode = sliced.charCodeAt(sliced.length - 1);
  if (lastCharCode >= 0xd800 && lastCharCode <= 0xdbff) {
    return sliced.slice(0, sliced.length - 1);
  }
  return sliced;
}

/**
 * Ejecuta la búsqueda RAG con un timeout defensivo para evitar bloquear el chat.
 * Previene unhandledRejections en segundo plano si la promesa resuelve post-timeout.
 */
async function fetchRagKnowledgeWithTimeout(
  query: string,
  matchCount: number,
  matchThreshold: number,
  timeoutMs: number
): Promise<{ chunks: SearchResultItem[]; fallbackUsed: boolean }> {
  let timeoutId: NodeJS.Timeout | undefined;

  const timeoutPromise = new Promise<{ chunks: SearchResultItem[]; fallbackUsed: boolean }>(
    (_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`Timeout de ${timeoutMs}ms excedido en búsqueda RAG.`));
      }, timeoutMs);
    }
  );

  const searchPromise = (async () => {
    const results = await searchDocumentKnowledge({
      query,
      matchCount: Math.min(matchCount, MAX_RAG_CHUNKS),
      matchThreshold,
    });
    return { chunks: results.slice(0, MAX_RAG_CHUNKS), fallbackUsed: false };
  })();

  // Prevenir unhandled promise rejection si searchPromise falla después del timeout
  searchPromise.catch(() => {});

  try {
    const res = await Promise.race([searchPromise, timeoutPromise]);
    if (timeoutId) clearTimeout(timeoutId);
    return res;
  } catch (err: any) {
    if (timeoutId) clearTimeout(timeoutId);
    console.warn(
      "[RAG-FALLBACK] Fallback a conocimiento manual debido a error o timeout en búsqueda RAG:",
      err?.message || err
    );
    return { chunks: [], fallbackUsed: true };
  }
}

/**
 * Deduplica las fuentes RAG retornadas preservando metadatos estructurados.
 */
function buildDeduplicatedSources(chunks: SearchResultItem[]): ChatSourceMetadata[] {
  const seen = new Set<string>();
  const sources: ChatSourceMetadata[] = [];

  for (const chunk of chunks) {
    const documentName = chunk.documentName || "Documento sin nombre";
    const category = chunk.category || null;
    const pageNumber =
      typeof chunk.metadata?.pageNumber === "number"
        ? chunk.metadata.pageNumber
        : typeof chunk.metadata?.page_number === "number"
        ? chunk.metadata.page_number
        : undefined;

    const sheetName =
      typeof chunk.metadata?.sheetName === "string"
        ? chunk.metadata.sheetName
        : typeof chunk.metadata?.sheet_name === "string"
        ? chunk.metadata.sheet_name
        : undefined;

    const sectionTitle =
      typeof chunk.metadata?.sectionTitle === "string"
        ? chunk.metadata.sectionTitle
        : typeof chunk.metadata?.section_title === "string"
        ? chunk.metadata.section_title
        : typeof chunk.metadata?.title === "string"
        ? chunk.metadata.title
        : undefined;

    const dedupeKey = `${documentName}|${category || ""}|${pageNumber || ""}|${sheetName || ""}|${sectionTitle || ""}`;

    if (!seen.has(dedupeKey)) {
      seen.add(dedupeKey);
      const sourceMeta: ChatSourceMetadata = {
        documentName,
        category,
      };
      if (pageNumber !== undefined) sourceMeta.pageNumber = pageNumber;
      if (sheetName !== undefined) sourceMeta.sheetName = sheetName;
      if (sectionTitle !== undefined) sourceMeta.sectionTitle = sectionTitle;

      sources.push(sourceMeta);
    }
  }

  return sources;
}

/**
 * Realiza la llamada a OpenRouter API con reintentos defensivos para resiliencia de red.
 */
async function callOpenRouterWithRetry(
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
  maxRetries = 2
): Promise<{ ok: boolean; responseText?: string; error?: string }> {
  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
          "X-Title": "SOVOGIN Assistant",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          max_tokens: 2048,
        }),
      });

      const data = await res.json().catch(() => ({}));
      const text = data.choices?.[0]?.message?.content;

      if (res.ok && typeof text === "string" && text.trim().length > 0) {
        return { ok: true, responseText: text };
      }

      if (attempt <= maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
        continue;
      }

      return { ok: false, error: data.error?.message || "No content returned from OpenRouter" };
    } catch (err: any) {
      if (attempt <= maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * attempt));
        continue;
      }
      return { ok: false, error: err?.message || "Network error fetching OpenRouter" };
    }
  }

  return { ok: false, error: "OpenRouter retry limit reached" };
}

export async function POST(req: Request) {
  const startTime = Date.now();

  try {
    const body = await req.json().catch(() => ({}));
    const rawMessage = typeof body.message === "string" ? body.message : "";
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "default-session";
    const message = rawMessage.trim();

    if (!message) {
      return NextResponse.json(
        { error: "El mensaje no puede estar vacío." },
        { status: 400 }
      );
    }

    if (message.length > MAX_QUERY_LENGTH_CHARS) {
      return NextResponse.json(
        { error: `El mensaje excede el límite máximo de ${MAX_QUERY_LENGTH_CHARS} caracteres.` },
        { status: 400 }
      );
    }

    if (!OPENROUTER_API_KEY) {
      console.error("Chat API Error: OPENROUTER_API_KEY missing");
      return NextResponse.json(
        { error: "OpenRouter API Key is missing in environment variables." },
        { status: 500 }
      );
    }

    // 1. Obtener chunks RAG con timeout y resiliencia a fallos
    const { chunks: ragChunks, fallbackUsed } = await fetchRagKnowledgeWithTimeout(
      message,
      DEFAULT_MATCH_COUNT,
      DEFAULT_MATCH_THRESHOLD,
      RAG_TIMEOUT_MS
    );

    // 2. Obtener conocimiento manual legacy determinista desde chatbot_knowledge
    const { data: legacyData, error: legacyError } = await supabaseAdmin
      .from("chatbot_knowledge")
      .select("content")
      .order("created_at", { ascending: true });

    if (legacyError) {
      console.warn("Chat API Error: No se pudo obtener chatbot_knowledge:", legacyError.message);
    }

    const legacyItems = (legacyData || [])
      .map((k) => k.content)
      .filter((c): c is string => typeof c === "string" && c.trim().length > 0);

    const legacyKnowledgeUsed = legacyItems.length > 0;

    // 3. Construir contexto RAG filtrado estrictamente por presupuesto de caracteres
    const usedRagChunks: SearchResultItem[] = [];
    let accumulatedRagLength = 0;
    const ragTextParts: string[] = [];

    for (let idx = 0; idx < ragChunks.length; idx++) {
      const c = ragChunks[idx];
      const formattedChunk = `--- CHUNK DOCUMENTAL ${idx + 1} [Fuente: ${c.documentName}] ---\n${c.content}`;

      if (accumulatedRagLength + formattedChunk.length > MAX_RAG_CONTEXT_CHARS) {
        const remainingBudget = MAX_RAG_CONTEXT_CHARS - accumulatedRagLength;
        if (remainingBudget > 100) {
          const truncatedChunk = safeTruncate(formattedChunk, remainingBudget);
          ragTextParts.push(truncatedChunk);
          usedRagChunks.push(c);
        }
        break;
      } else {
        ragTextParts.push(formattedChunk);
        usedRagChunks.push(c);
        accumulatedRagLength += formattedChunk.length + 2;
      }
    }

    const rawRagText = ragTextParts.join("\n\n");
    let rawLegacyText = legacyItems.join("\n\n");
    rawLegacyText = safeTruncate(rawLegacyText, MAX_LEGACY_CONTEXT_CHARS);

    // Fuentes construidas ÚNICAMENTE con los chunks que efectivamente se incluyeron en el contexto
    const sources = buildDeduplicatedSources(usedRagChunks);

    // 4. Construir System Prompt Anti-Alucinaciones
    const systemPrompt = `Eres el asistente virtual oficial de SOVOGIN (Sociedad de Ginecología y Obstetricia de Guatemala).
Tu objetivo es brindar información institucional precisa, amable y profesional basada ÚNICAMENTE en el contexto de conocimiento proporcionado a continuación.

REGLAS ESTRICTAS DE RESPUESTA Y ANTI-ALUCINACIÓN:
1. Responde basándote prioritariamente en las FUENTES DOCUMENTALES (RAG) y en el CONOCIMIENTO MANUAL proporcionados.
2. NO inventes información institucional, códigos, cifras, políticas, teléfonos ni eventos que no aparezcan explícitamente en el contexto.
3. Si la información solicitada NO está presente en el contexto proporcionado, responde amablemente indicando: "No encontré esa información en la base de conocimiento de SOVOGIN." o sugiere contactar a info@sovogin.com para más detalles.
4. Distingue información institucional oficial de conceptos médicos generales. No emitas diagnósticos médicos ni prescripciones personalizadas.
5. NO afirme que un documento dice algo que no aparezca de forma directa en el contexto.
6. El contexto proporcionado representa el conocimiento disponible. Si la información solicitada no está presente en el contexto, no asumas su existencia.
7. Responde siempre en español de forma profesional, clara y concisa.

==================================================
CONTEXTO DE CONOCIMIENTO DISPONIBLE:
==================================================

[FUENTES DOCUMENTALES RAG]:
${rawRagText || "No se encontraron fragmentos documentales semánticamente coincidentes."}

[CONOCIMIENTO MANUAL INSTITUCIONAL]:
${rawLegacyText || "No hay conocimiento manual adicional registrado."}
`;

    // 5. Llamada a OpenRouter API (Gemini 2.5 Flash) con reintentos de red
    const { ok, responseText, error: llmError } = await callOpenRouterWithRetry(
      OPENROUTER_API_KEY,
      systemPrompt,
      message,
      2
    );

    if (!ok || !responseText) {
      console.error("OpenRouter API Error:", llmError || "No content returned from OpenRouter");
      return NextResponse.json(
        { error: "No pudimos generar una respuesta en este momento. Por favor intenta nuevamente." },
        { status: 500 }
      );
    }

    // 6. Guardar conversación (sin bloquear respuesta si falla)
    Promise.resolve(
      supabaseAdmin.from("chatbot_conversations").insert({
        session_id: sessionId,
        user_message: message,
        ai_response: responseText,
      })
    ).catch(() => {});

    // 7. Logging estructurado seguro (sin PII ni API keys)
    const durationMs = Date.now() - startTime;
    console.log(
      JSON.stringify({
        event: "[RAG-CHAT]",
        queryLength: message.length,
        ragChunks: usedRagChunks.length,
        legacyKnowledgeUsed,
        fallbackUsed,
        durationMs,
      })
    );

    // 8. Respuesta retrocompatible
    return NextResponse.json({
      response: responseText,
      text: responseText,
      sources,
    });
  } catch (error: any) {
    console.error("Chat API Route Error:", error?.message || error);
    return NextResponse.json(
      { error: "No pudimos generar una respuesta en este momento. Por favor intenta nuevamente." },
      { status: 500 }
    );
  }
}
