"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Bot, Loader2, BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface ChatSource {
  documentName: string;
  category?: string | null;
  pageNumber?: number;
  sheetName?: string;
  sectionTitle?: string;
}

interface Message {
  role: "user" | "bot";
  content: string;
  sources?: ChatSource[];
}

interface ChatApiResponse {
  response?: string;
  text?: string;
  error?: string;
  details?: string;
  sources?: ChatSource[];
}

/**
 * Formatea un objeto ChatSource a una cadena legible para el usuario final.
 * Formatos soportados:
 * - PDF: Documento.pdf · pág. 12
 * - XLSX: Tarifas.xlsx · hoja "2026"
 * - DOCX / Sección: Reglamento.docx · sección "Membresías"
 * - Combinado: Documento.pdf · pág. 12 · sección "Capítulo IV"
 */
export function formatSourceItem(src: ChatSource): string {
  const parts: string[] = [];
  const docName = (src.documentName || "Documento").trim();
  parts.push(docName);

  if (typeof src.pageNumber === "number" && !isNaN(src.pageNumber)) {
    parts.push(`pág. ${src.pageNumber}`);
  }
  if (typeof src.sheetName === "string" && src.sheetName.trim().length > 0) {
    parts.push(`hoja "${src.sheetName.trim()}"`);
  }
  if (typeof src.sectionTitle === "string" && src.sectionTitle.trim().length > 0) {
    parts.push(`sección "${src.sectionTitle.trim()}"`);
  }

  return parts.join(" · ");
}

/**
 * Deduplica una lista de ChatSource client-side de forma defensiva basándose en su etiqueta visible.
 */
export function deduplicateSources(sources: ChatSource[]): ChatSource[] {
  const seen = new Set<string>();
  const result: ChatSource[] = [];

  for (const src of sources) {
    if (!src || typeof src !== "object") continue;
    const label = formatSourceItem(src);
    if (!seen.has(label)) {
      seen.add(label);
      result.push(src);
    }
  }

  return result;
}

export function ChatbotWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "bot", content: "¡Hola! Soy el asistente virtual de SOVOGIN. ¿En qué puedo ayudarte hoy?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Record<number, boolean>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage, sessionId: "temp-session" })
      });
      
      const data = (await res.json()) as ChatApiResponse;
      
      const responseText =
        typeof data.response === "string" && data.response.trim().length > 0
          ? data.response
          : typeof data.text === "string" && data.text.trim().length > 0
          ? data.text
          : null;

      const sources = Array.isArray(data.sources) ? data.sources : [];

      if (res.ok && responseText) {
        setMessages((prev) => [
          ...prev,
          {
            role: "bot",
            content: responseText,
            sources,
          },
        ]);
      } else {
        const errorMessage =
          typeof data.error === "string" && data.error.trim().length > 0
            ? data.error
            : "Lo siento, tuve un problema al procesar tu solicitud. Por favor intenta de nuevo más tarde.";
        setMessages((prev) => [
          ...prev,
          {
            role: "bot",
            content: errorMessage,
            sources: [],
          },
        ]);
      }
    } catch (error: unknown) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          content: "Lo siento, tuve un problema al procesar tu solicitud. Por favor intenta de nuevo más tarde.",
          sources: [],
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[100]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="mb-4 w-[350px] sm:w-[400px] h-[500px] bg-white rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 bg-primary text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-bold">Asistente SOVOGIN</div>
                  <div className="text-xs text-white/70">En línea ahora</div>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-2 rounded-lg transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
              {messages.map((msg, i) => {
                const deduppedSources = msg.sources ? deduplicateSources(msg.sources) : [];

                return (
                  <div
                    key={i}
                    className={cn(
                      "flex flex-col max-w-[85%]",
                      msg.role === "user" ? "ml-auto items-end" : "mr-auto items-start"
                    )}
                  >
                    <div
                      className={cn(
                        "p-3 rounded-2xl text-sm leading-relaxed",
                        msg.role === "user"
                          ? "bg-primary text-white rounded-tr-none"
                          : "bg-white text-slate-800 shadow-sm border border-slate-100 rounded-tl-none"
                      )}
                    >
                      <div>{msg.content}</div>

                      {/* Bloque visual secundario discreto de Fuentes */}
                      {msg.role === "bot" && deduppedSources.length > 0 && (
                        <div
                          role="region"
                          aria-label="Fuentes documentales consultadas"
                          className="mt-2.5 pt-2 border-t border-slate-100 text-[11px] text-slate-500 w-full"
                        >
                          <div className="flex items-center gap-1.5 font-semibold text-slate-600 mb-1">
                            <BookOpen className="w-3.5 h-3.5 text-primary shrink-0" />
                            <span>Fuentes</span>
                          </div>
                          <ul className="space-y-1 pl-3.5 list-disc marker:text-primary/70">
                            {(expandedSources[i] ? deduppedSources : deduppedSources.slice(0, 3)).map((src, idx) => (
                              <li key={idx} className="leading-tight break-words text-slate-600">
                                {formatSourceItem(src)}
                              </li>
                            ))}
                          </ul>
                          {deduppedSources.length > 3 && (
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedSources((prev) => ({
                                  ...prev,
                                  [i]: !prev[i],
                                }))
                              }
                              className="mt-1.5 text-[10px] font-medium text-primary hover:underline flex items-center gap-0.5 focus:outline-none"
                            >
                              {expandedSources[i] ? (
                                <>
                                  <span>Ocultar fuentes</span>
                                  <ChevronUp className="w-3 h-3" />
                                </>
                              ) : (
                                <>
                                  <span>Ver {deduppedSources.length - 3} fuentes más</span>
                                  <ChevronDown className="w-3 h-3" />
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {isLoading && (
                <div className="flex mr-auto items-start max-w-[80%]">
                  <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-slate-100 shadow-sm">
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t bg-white">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex gap-2"
              >
                <Input
                  placeholder="Escribe tu mensaje..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  className="rounded-xl border-slate-200 focus-visible:ring-primary"
                />
                <Button type="submit" size="icon" className="shrink-0 bg-primary rounded-xl" disabled={isLoading}>
                  <Send className="w-4 h-4" />
                </Button>
              </form>
              <div className="mt-2 text-[10px] text-center text-slate-400">
                Al usar el chat, aceptas nuestra política de tratamiento de datos.
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <Button
        onClick={() => setIsOpen(!isOpen)}
        size="icon"
        className={cn(
          "w-16 h-16 rounded-2xl shadow-2xl transition-all duration-300",
          isOpen ? "bg-slate-900 rotate-90" : "bg-primary hover:bg-primary/90"
        )}
      >
        {isOpen ? <X className="w-8 h-8" /> : <MessageCircle className="w-8 h-8" />}
      </Button>
    </div>
  );
}
