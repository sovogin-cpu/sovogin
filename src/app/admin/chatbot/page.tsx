"use client";

import React, { useState, useEffect } from "react";
import { Bot, MessageSquare, Plus, Trash2, Edit2, Loader2, BookOpen, FileText, Database } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/utils/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DocumentLibrary } from "@/components/admin/chatbot/DocumentLibrary";

export default function ChatbotAdmin() {
  const [activeTab, setActiveTab] = useState<"rag" | "manual">("rag");
  const [knowledge, setKnowledge] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const supabase = createClient();

  const [formData, setFormData] = useState({
    title: "",
    content: "",
    category: "General",
  });

  useEffect(() => {
    fetchKnowledge();
  }, []);

  async function fetchKnowledge() {
    try {
      const { data, error } = await supabase
        .from("chatbot_knowledge")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setKnowledge(data || []);
    } catch (error) {
      console.error("Error fetching knowledge:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (editingId) {
        const { error } = await supabase.from("chatbot_knowledge").update(formData).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("chatbot_knowledge").insert([formData]);
        if (error) throw error;
      }
      setIsModalOpen(false);
      fetchKnowledge();
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function openEditModal(item: any) {
    setEditingId(item.id);
    setFormData({
      title: item.title,
      content: item.content,
      category: item.category || "General",
    });
    setIsModalOpen(true);
  }

  async function deleteKnowledge(id: string) {
    if (!confirm("¿Eliminar este conocimiento? La IA dejará de saber sobre esto.")) return;
    try {
      const { error } = await supabase.from("chatbot_knowledge").delete().eq("id", id);
      if (error) throw error;
      fetchKnowledge();
    } catch (error: any) {
      alert("Error: " + error.message);
    }
  }

  return (
    <div className="space-y-8">
      {/* Tarjetas de Encabezado */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-sm rounded-3xl bg-primary text-white overflow-hidden relative group">
          <CardContent className="p-8">
            <Bot className="w-12 h-12 mb-4 opacity-20 group-hover:scale-110 transition-transform" />
            <h3 className="text-3xl font-bold font-heading">Estado: Activo</h3>
            <p className="opacity-80">Asistente AI SOVOGIN RAG</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden relative group border border-slate-50">
          <CardContent className="p-8">
            <BookOpen className="w-12 h-12 mb-4 text-primary opacity-20 group-hover:scale-110 transition-transform" />
            <h3 className="text-3xl font-bold text-slate-900 font-heading">{knowledge.length}</h3>
            <p className="text-slate-500">Conocimientos Manuales</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-3xl bg-white overflow-hidden relative group border border-slate-50">
          <CardContent className="p-8">
            <MessageSquare className="w-12 h-12 mb-4 text-primary opacity-20 group-hover:scale-110 transition-transform" />
            <h3 className="text-3xl font-bold text-slate-900 font-heading">Gemini 2.5 Flash</h3>
            <p className="text-slate-500">Modelo de lenguaje actual</p>
          </CardContent>
        </Card>
      </div>

      {/* Navegación por Pestañas */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-4">
        <button
          onClick={() => setActiveTab("rag")}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
            activeTab === "rag"
              ? "bg-primary text-white shadow-md shadow-primary/20"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <Database className="w-4 h-4" />
          Biblioteca Documental RAG
        </button>

        <button
          onClick={() => setActiveTab("manual")}
          className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${
            activeTab === "manual"
              ? "bg-primary text-white shadow-md shadow-primary/20"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Conocimiento Manual (Legacy)
        </button>
      </div>

      {/* Pestaña 1: Biblioteca Documental RAG */}
      {activeTab === "rag" && <DocumentLibrary />}

      {/* Pestaña 2: Conocimiento Manual (Existente) */}
      {activeTab === "manual" && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-slate-900 font-heading">Base de Conocimientos Manual</h2>
              <p className="text-slate-500 text-sm">Entrena a la IA con bloques de texto directo de la asociación.</p>
            </div>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
              <Button
                onClick={() => {
                  setEditingId(null);
                  setFormData({ title: "", content: "", category: "General" });
                  setIsModalOpen(true);
                }}
                className="bg-primary hover:bg-primary/90 h-12 px-6 rounded-xl shadow-lg shadow-primary/20 gap-2 font-bold text-white"
              >
                <Plus className="w-5 h-5" />
                Nuevo Conocimiento
              </Button>
              <DialogContent className="sm:max-w-[600px] rounded-[2.5rem] border-none shadow-2xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold font-heading">
                    {editingId ? "Editar Conocimiento" : "Entrenar Asistente"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                  <div className="space-y-2">
                    <Label>Título / Tema</Label>
                    <Input
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Ej: Requisitos de inscripción"
                      className="rounded-xl h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Contenido Detallado (Lo que la IA aprenderá)</Label>
                    <textarea
                      required
                      value={formData.content}
                      onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                      className="w-full min-h-[200px] p-4 rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-primary/20 text-sm"
                      placeholder="Escribe aquí toda la información detallada..."
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-14 rounded-xl font-bold bg-primary text-white text-lg"
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Guardar Conocimiento"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {knowledge.map((item) => (
                <Card key={item.id} className="border-none shadow-sm rounded-2xl bg-white border border-slate-50 overflow-hidden">
                  <CardContent className="p-6 flex items-start gap-4">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary shrink-0">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900">{item.title}</h4>
                      <p className="text-slate-500 text-sm line-clamp-2 mt-1">{item.content}</p>
                      <span className="text-[10px] font-bold uppercase text-primary mt-2 inline-block bg-primary/5 px-2 py-0.5 rounded-full">
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditModal(item)}
                        className="text-slate-400 hover:text-primary h-10 w-10 rounded-xl"
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteKnowledge(item.id)}
                        className="text-slate-400 hover:text-red-500 h-10 w-10 rounded-xl"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {knowledge.length === 0 && (
                <div className="text-center py-20 bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-100">
                  <Bot className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium font-heading">La IA no tiene conocimientos específicos todavía.</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
