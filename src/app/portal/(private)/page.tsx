import React from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  UserCheck,
  Award,
  BookOpen,
  User,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Sparkles,
  FileText,
} from "lucide-react";
import { maskDocument } from "@/lib/registrations/registration-utils";

export default async function PortalDashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: associate } = await supabaseAdmin
    .from("associates")
    .select("id, full_name, email, document_number, specialty, status, created_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!associate) return null;

  const maskedDoc = associate.document_number
    ? maskDocument(associate.document_number)
    : "No registrado";

  const memberSinceStr = associate.created_at
    ? new Date(associate.created_at).toLocaleDateString("es-CO", {
        year: "numeric",
        month: "long",
      })
    : "Miembro Activo";

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-[#006666]/30 border border-slate-800 p-6 md:p-10 rounded-[2.5rem] relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/10 blur-3xl rounded-full pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-teal-500/20 border border-teal-500/40 text-teal-300 text-xs font-bold rounded-full uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              Expediente Gremiado Verificado
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white font-heading">
              Bienvenido(a), {associate.full_name}
            </h1>
            <p className="text-slate-300 text-xs md:text-sm max-w-2xl leading-relaxed">
              Plataforma oficial de miembros de la Asociación Vallecaucana de Obstetricia y Ginecología (SOVOGIN).
            </p>
          </div>

          <div className="bg-slate-950/90 border border-slate-800 p-5 rounded-2xl flex items-center gap-4 shrink-0 shadow-inner">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest block">
                Estado Gremiado
              </span>
              <span className="text-lg font-extrabold text-emerald-400 font-heading">
                {associate.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid de Ficha del Asociado */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Tarjeta: Información de Miembro */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
            <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center">
              <User className="w-4 h-4 text-teal-400" />
            </div>
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Datos de Membresía
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400 font-medium">Documento:</span>
              <span className="font-mono font-bold text-slate-200">{maskedDoc}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400 font-medium">Correo Electrónico:</span>
              <span className="font-bold text-slate-200 truncate max-w-[180px]" title={associate.email}>
                {associate.email}
              </span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400 font-medium">Miembro desde:</span>
              <span className="font-bold text-slate-200">{memberSinceStr}</span>
            </div>
          </div>
        </div>

        {/* Tarjeta: Especialidad Médica */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
            <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center">
              <Award className="w-4 h-4 text-teal-400" />
            </div>
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Especialidad Registrada
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-xs text-slate-400 block font-medium">Especialidad Principal:</span>
            <span className="text-base font-bold text-white block">
              {associate.specialty || "Ginecología y Obstetricia"}
            </span>
            <span className="text-[11px] text-slate-400 block pt-2">
              Registrado oficialmente en el padrón gremial de SOVOGIN.
            </span>
          </div>
        </div>

        {/* Tarjeta: Beneficios y Respaldo */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4 shadow-sm">
          <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
            <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-teal-400" />
            </div>
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Cobertura Gremial
            </span>
          </div>

          <div className="space-y-2 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <span>Respaldo gremial en ejercicio profesional</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <span>Aval internacional ACOG / Fecolsog</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-teal-400 shrink-0" />
              <span>Educación médica continuada preferencial</span>
            </div>
          </div>
        </div>
      </div>

      {/* Módulos Futuros del Portal (Próximamente) */}
      <div className="space-y-4 pt-4">
        <h3 className="text-xl font-bold text-white font-heading">
          Accesos del Portal
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {/* Card: Mi Perfil */}
          <Link
            href="/portal/perfil"
            className="bg-slate-900 border border-slate-800 hover:border-teal-500/60 p-6 rounded-3xl space-y-3 relative group transition-all hover:scale-[1.02] shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-500/40 text-teal-300 flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/40 px-2.5 py-1 rounded-full uppercase">
                Disponible
              </span>
            </div>
            <h4 className="text-base font-bold text-white group-hover:text-teal-300 transition-colors">
              Mi Perfil Profesional
            </h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Autogestión de biografía, consultorio y visibilidad en el Directorio Médico.
            </p>
          </Link>

          {/* Card: Convenios */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-3 relative cursor-not-allowed">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-slate-700/60 text-slate-300 flex items-center justify-center">
                <Award className="w-5 h-5 text-slate-400" />
              </div>
              <span className="text-[10px] font-bold bg-slate-800 border border-slate-700 text-slate-300 px-2.5 py-1 rounded-full uppercase">
                Próximamente
              </span>
            </div>
            <h4 className="text-base font-bold text-slate-200">Beneficios Exclusivos</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Convenios comerciales y códigos de descuento para asociados activos.
            </p>
          </div>

          {/* Card: Certificados */}
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-3 relative cursor-not-allowed">
            <div className="flex items-center justify-between">
              <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-slate-700/60 text-slate-300 flex items-center justify-center">
                <FileText className="w-5 h-5 text-slate-400" />
              </div>
              <span className="text-[10px] font-bold bg-slate-800 border border-slate-700 text-slate-300 px-2.5 py-1 rounded-full uppercase">
                Próximamente
              </span>
            </div>
            <h4 className="text-base font-bold text-slate-200">Certificados Gremiados</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Descarga digital de constancias de membresía y asistencias a simposios.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
