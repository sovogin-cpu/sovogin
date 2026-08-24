import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

export async function POST(req: Request) {
  try {
    const { message, sessionId } = await req.json();
    const supabase = await createClient();

    if (!OPENROUTER_API_KEY) {
      return NextResponse.json({ error: "OpenRouter API Key is missing in .env" }, { status: 500 });
    }

    // 1. Fetch knowledge from Supabase (RAG)
    const { data: knowledge } = await supabase
      .from('chatbot_knowledge')
      .select('content');

    const context = knowledge?.map(k => k.content).join("\n") || "No hay información específica disponible.";

    // 2. Prepare OpenRouter Call
    const systemPrompt = `
      Eres el asistente virtual de SOVOGIN (Sociedad de Ginecología y Obstetricia).
      Tu objetivo es ayudar a los usuarios con información sobre la asociación, simposios y recursos.
      
      INSTRUCCIONES:
      - Responde ÚNICAMENTE basándote en el CONTEXTO proporcionado abajo.
      - Si la respuesta no está en el contexto, di amablemente que no tienes esa información y sugiera contactar a info@sovogin.org.
      - Sé profesional, médico pero amable.
      - Responde en Español.
      
      CONTEXTO:
      ${context}
    `;

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000", // Opcional para OpenRouter
        "X-Title": "SOVOGIN Assistant"
      },
      body: JSON.stringify({
        "model": "google/gemini-2.5-flash",
        "messages": [
          { "role": "system", "content": systemPrompt },
          { "role": "user", "content": message }
        ],
        "max_tokens": 2048
      })
    });

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content;

    if (!response.ok || !text) {
      console.error("OpenRouter API Error:", data.error?.message || "No content returned from OpenRouter");
      return NextResponse.json({
        error: "No pudimos generar una respuesta en este momento. Por favor intenta nuevamente."
      }, { status: 500 });
    }

    // 3. Store conversation
    await supabase.from('chatbot_conversations').insert({
      session_id: sessionId,
      user_message: message,
      ai_response: text
    });

    return NextResponse.json({ text });
  } catch (error: any) {
    console.error("Chat API Route Error:", error?.message || error);
    return NextResponse.json({
      error: "No pudimos generar una respuesta en este momento. Por favor intenta nuevamente."
    }, { status: 500 });
  }
}
