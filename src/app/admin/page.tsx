"use client";

import React, { useState, useEffect } from "react";
import { 
  Users, 
  Calendar, 
  CreditCard, 
  TrendingUp, 
  MessageSquare,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  FileText
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { createClient } from "@/utils/supabase/client";

export default function AdminOverview() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any[]>([]);
  const [recentRegistrations, setRecentRegistrations] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch Counts
        const { count: membersCount } = await supabase.from('associates').select('*', { count: 'exact', head: true });
        const { count: eventsCount } = await supabase.from('events').select('*', { count: 'exact', head: true });
        const { count: registrationsCount } = await supabase.from('registrations').select('*', { count: 'exact', head: true });
        const { count: resourcesCount } = await supabase.from('resources').select('*', { count: 'exact', head: true });

        // Fetch Recent Registrations
        const { data: recent } = await supabase
          .from('registrations')
          .select('*, events(title)')
          .order('created_at', { ascending: false })
          .limit(5);

        // Fetch Upcoming Events
        const { data: upcoming } = await supabase
          .from('events')
          .select('*')
          .gte('date', new Date().toISOString())
          .order('date', { ascending: true })
          .limit(2);

        setStats([
          { name: "Total Asociados", value: membersCount || 0, icon: Users, trend: "+", trendUp: true },
          { name: "Inscripciones", value: registrationsCount || 0, icon: CreditCard, trend: "+", trendUp: true },
          { name: "Eventos Activos", value: eventsCount || 0, icon: Calendar, trend: "0%", trendUp: true },
          { name: "Biblioteca", value: resourcesCount || 0, icon: FileText, trend: "+", trendUp: true },
        ]);

        setRecentRegistrations(recent || []);
        setUpcomingEvents(upcoming || []);
      } catch (err) {
        console.error("Error fetching admin stats:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 font-heading">Panel de Control</h1>
          <p className="text-slate-500">Resumen actualizado de la actividad de SOVOGIN.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.name} className="border-none shadow-sm rounded-2xl hover:shadow-md transition-all">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-500">{stat.name}</CardTitle>
                <div className="w-10 h-10 bg-primary/5 rounded-xl flex items-center justify-center text-primary">
                  <Icon className="w-5 h-5" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{stat.value}</div>
                <div className="flex items-center gap-1 mt-2">
                  <span className="text-emerald-500 text-xs font-bold">Activo</span>
                  <span className="text-slate-400 text-xs ml-1">en base de datos</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-none shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="bg-white border-b border-slate-50 flex flex-row justify-between items-center">
            <CardTitle className="text-lg">Inscripciones Recientes</CardTitle>
            <button className="text-sm text-primary font-bold hover:underline">Ver todas</button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead className="pl-6">Participante</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead>Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right pr-6">Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentRegistrations.length > 0 ? recentRegistrations.map((r) => (
                  <TableRow key={r.id} className="hover:bg-slate-50 transition-colors border-slate-50">
                    <TableCell className="font-medium pl-6">
                      <div className="flex flex-col">
                        <span>{r.full_name || 'Usuario'}</span>
                        <span className="text-[10px] text-slate-400">{r.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>{r.events?.title || 'Evento'}</TableCell>
                    <TableCell className="font-bold">
                      ${new Intl.NumberFormat('es-CO').format(r.amount || 0)}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                        r.status === 'confirmed' ? 'bg-emerald-100 text-emerald-700' : 
                        r.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {r.status === 'confirmed' ? 'Confirmado' : r.status === 'pending' ? 'Pendiente' : 'Cancelado'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right pr-6 text-slate-500 text-xs">
                      {new Date(r.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-slate-400">No hay inscripciones recientes.</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg">Próximos Eventos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {upcomingEvents.length > 0 ? upcomingEvents.map((event) => {
              const date = new Date(event.date);
              return (
                <div key={event.id} className="flex gap-4 p-4 rounded-2xl border border-slate-100 hover:bg-slate-50 transition-all cursor-pointer group">
                  <div className="w-14 h-14 bg-primary/10 rounded-2xl flex flex-col items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                    <span className="text-[10px] font-bold uppercase">{date.toLocaleDateString('es-ES', { month: 'short' })}</span>
                    <span className="text-xl font-bold leading-none">{date.getDate()}</span>
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-slate-900 text-sm leading-tight line-clamp-1">{event.title}</h4>
                    <p className="text-slate-500 text-xs mt-1">{event.location}</p>
                    <div className="flex items-center gap-1 mt-2">
                       <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                       <span className="text-[10px] text-slate-400">Inscripciones abiertas</span>
                    </div>
                  </div>
                </div>
              );
            }) : (
              <p className="text-center py-10 text-slate-400 text-sm">No hay eventos próximos.</p>
            )}
            <button className="w-full py-4 text-sm font-bold text-primary bg-primary/5 hover:bg-primary/10 rounded-2xl transition-all">
              Ver todos los eventos
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
