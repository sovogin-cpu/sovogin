"use client";

import React, { useState, useEffect } from "react";
import { Search, Loader2, Trash2, FileText, CheckCircle2, XCircle, Clock, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/utils/supabase/client";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import * as XLSX from "xlsx";

function maskDocument(docType?: string, docNum?: string) {
  if (!docNum) return "-";
  const clean = docNum.trim();
  if (clean.length <= 4) return `${docType ? docType + " - " : ""}${clean}`;
  const masked = "*".repeat(Math.max(0, clean.length - 4)) + clean.slice(-4);
  return `${docType ? docType + " - " : ""}${masked}`;
}

export default function RegistrationsAdmin() {
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const supabase = createClient();

  useEffect(() => {
    fetchRegistrations();
  }, []);

  async function fetchRegistrations() {
    try {
      const { data, error } = await supabase
        .from('registrations')
        .select('*, events(title)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setRegistrations(data || []);
    } catch (error) {
      console.error("Error fetching registrations:", error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteRegistration(id: string) {
    if (!confirm("¿Eliminar esta inscripción?")) return;
    try {
      const { error } = await supabase.from('registrations').delete().eq('id', id);
      if (error) throw error;
      fetchRegistrations();
    } catch (error: any) {
      alert("Error: " + error.message);
    }
  }

  function exportToExcel() {
    const dataToExport = registrations.map(r => ({
      Participante: r.full_name,
      Email: r.email,
      Documento: maskDocument(r.customer_document_type, r.document_number),
      Telefono: r.phone,
      Evento: r.events?.title,
      Monto: r.amount,
      Modalidad: r.modality,
      Categoria: r.category,
      EstadoInscripcion: r.status,
      EstadoPago: r.payment_status || r.status,
      Referencia: r.payment_reference || r.payment_id || "-",
      Origen: r.origin || "Manual",
      Fecha: new Date(r.paid_at || r.created_at).toLocaleString()
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inscritos");
    XLSX.writeFile(workbook, "Inscritos_Eventos_SOVOGIN.xlsx");
  }

  const filtered = registrations.filter(r => 
    r.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.events?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.payment_reference?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-heading">Gestión de Inscritos</h1>
          <p className="text-slate-500">Personas registradas en los simposios y eventos.</p>
        </div>
        
        <Button onClick={exportToExcel} variant="outline" className="h-12 px-6 rounded-xl border-slate-200 text-slate-700 hover:bg-slate-50 gap-2 font-bold shadow-sm">
          <FileText className="w-5 h-5" />
          Exportar Excel
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input 
            placeholder="Buscar por nombre, email, evento o referencia..." 
            className="pl-12 h-14 rounded-2xl bg-white border-slate-100 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow className="border-slate-100 h-16">
                <TableHead className="pl-8 text-slate-900 font-bold">Participante</TableHead>
                <TableHead className="text-slate-900 font-bold">Evento</TableHead>
                <TableHead className="text-slate-900 font-bold">Modalidad / Origen</TableHead>
                <TableHead className="text-slate-900 font-bold">Monto / Referencia</TableHead>
                <TableHead className="text-slate-900 font-bold">Estado</TableHead>
                <TableHead className="text-right pr-8 text-slate-900 font-bold">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length > 0 ? filtered.map((r) => (
                <TableRow key={r.id} className="border-slate-50 hover:bg-slate-50/50 transition-colors h-20">
                  <TableCell className="pl-8">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900">{r.full_name}</span>
                      <span className="text-xs text-slate-500">{r.email}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Doc: {maskDocument(r.customer_document_type, r.document_number)}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-slate-700">{r.events?.title || "Evento General"}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs px-2.5 py-0.5 bg-slate-100 rounded-full w-fit capitalize font-medium">{r.modality || "presencial"}</span>
                      {r.origin === "openpay" ? (
                        <span className="text-[10px] font-bold text-primary flex items-center gap-1">
                          <CreditCard className="w-3 h-3" /> Openpay
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400">Manual</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900">${new Intl.NumberFormat('es-CO').format(r.amount || 0)} COP</span>
                      {r.payment_reference && (
                        <span className="text-[10px] font-mono text-slate-400">{r.payment_reference}</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {r.status === 'confirmed' || r.payment_status === 'paid' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : r.status === 'pending' ? (
                        <Clock className="w-4 h-4 text-amber-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span className={`text-[10px] font-bold uppercase ${
                        r.status === 'confirmed' || r.payment_status === 'paid' ? 'text-emerald-700' : 
                        r.status === 'pending' ? 'text-amber-700' : 'text-red-700'
                      }`}>
                        {r.status === 'confirmed' || r.payment_status === 'paid' ? 'Confirmado' : r.status === 'pending' ? 'Pendiente' : 'Cancelado'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right pr-8">
                    <Button variant="ghost" size="icon" onClick={() => deleteRegistration(r.id)} className="h-10 w-10 rounded-xl text-slate-400 hover:text-red-500">
                      <Trash2 className="w-5 h-5" />
                    </Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-20 text-slate-400">No se encontraron inscritos.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}
