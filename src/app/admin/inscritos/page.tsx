"use client";

import React, { useState, useEffect } from "react";
import { Search, Filter, Loader2, Trash2, FileText, CheckCircle2, XCircle, Clock } from "lucide-react";
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
      Documento: r.document_number,
      Telefono: r.phone,
      Evento: r.events?.title,
      Monto: r.amount,
      Modalidad: r.modality,
      Categoria: r.category,
      Estado: r.status,
      Fecha: new Date(r.created_at).toLocaleString()
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Inscritos");
    XLSX.writeFile(workbook, "Inscritos_Eventos_SOVOGIN.xlsx");
  }

  const filtered = registrations.filter(r => 
    r.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.events?.title?.toLowerCase().includes(searchTerm.toLowerCase())
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
            placeholder="Buscar por nombre, email o evento..." 
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
                <TableHead className="text-slate-900 font-bold">Modalidad/Categoría</TableHead>
                <TableHead className="text-slate-900 font-bold">Monto</TableHead>
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
                      <span className="text-[10px] text-slate-400">Doc: {r.document_number}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-medium text-slate-700">{r.events?.title}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <span className="text-xs px-2 py-0.5 bg-slate-100 rounded-full w-fit capitalize">{r.modality}</span>
                      <span className="text-[10px] text-slate-500 capitalize">{r.category}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="font-bold text-slate-900">${new Intl.NumberFormat('es-CO').format(r.amount || 0)}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {r.status === 'confirmed' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      ) : r.status === 'pending' ? (
                        <Clock className="w-4 h-4 text-amber-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <span className={`text-[10px] font-bold uppercase ${
                        r.status === 'confirmed' ? 'text-emerald-700' : 
                        r.status === 'pending' ? 'text-amber-700' : 'text-red-700'
                      }`}>
                        {r.status === 'confirmed' ? 'Confirmado' : r.status === 'pending' ? 'Pendiente' : 'Cancelado'}
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
