"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { History, Users, ShieldCheck, FileDown, CheckCircle2, Award, Target, Heart, Users2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export default function AsociacionPage() {
  const [boardMembers, setBoardMembers] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    async function fetchBoard() {
      const { data } = await supabase
        .from('board_members')
        .select('*')
        .order('order_index', { ascending: true });
      if (data) setBoardMembers(data);
    }
    fetchBoard();
  }, []);

  return (
    <main className="pt-24 min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative py-20 bg-slate-900 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <img src="/img/banner.png" alt="Banner" className="w-full h-full object-cover" />
        </div>
        <div className="container mx-auto px-4 relative z-10 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl md:text-7xl font-bold text-white mb-6 font-heading"
          >
            Nuestra <span className="text-primary">Asociación</span>
          </motion.h1>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto font-light">
            Comprometidos con la excelencia académica y el bienestar integral de la mujer colombiana.
          </p>
        </div>
      </section>

      {/* Historia Section */}
      <section id="historia" className="py-24 container mx-auto px-4 border-b border-slate-100">
        <div className="max-w-4xl mx-auto space-y-12">
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mx-auto">
              <History className="w-8 h-8" />
            </div>
            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 font-heading">Nuestra Historia</h2>
          </div>
          
          <div className="prose prose-slate prose-lg max-w-none text-slate-600 leading-relaxed text-center italic">
            <p>
              "El 17 de febrero de 1955, 21 ginecobstetras de ciencia conformaron una Asociación local que obrará en beneficio de la práctica médica de la Ginecología y la Obstetricia en la región, que conectara su conocimiento e investigación con el resto del mundo y sirviera como medio de avance y crecimiento de todos sus miembros. Su Fundación se conserva en esta Acta que guarda los ideales de evolución y compromisos que desde entonces se mantienen vigentes en quienes lideran y conforman la Asociación Vallecaucana de Obstetricia y Ginecología, SOVOGIN."
            </p>
          </div>

          <div className="pt-16 space-y-10">
            <div className="text-center">
              <h3 className="text-2xl font-bold text-slate-900 uppercase tracking-widest font-heading">Fundadores</h3>
              <div className="w-20 h-1.5 bg-primary mx-auto mt-4 rounded-full" />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                "Dr. Álvaro Vallejo O.", "Dr. Jorge Escobar Soto", "Dr. Jaime Múnera Ángel", "Dr. Sergio Vallejo Salazar",
                "Dr. Rafael Velandia", "Dr. Jesús Eduardo Cárdenas", "Dr. Luis Alfredo González", "Dr. Gabriel Yusti",
                "Dr. Libardo Palau", "Dr. Oscar Henao Cabal", "Dr. Alberto García Trejos", "Dr. Hugo Campo Gaviria",
                "Dr. Alonso Trujillo", "Dr. Luis Acuña Pinzón", "Dr. Vicente Muñoz D. del C.", "Dr. Luis Carlos Uribe Uribe",
                "Dr. Carlos Alberto Guzmán L.", "Dr. Horacio Ramírez Pinzón", "Dr. Tulio Sandoval", "Dr. Silvio Velásquez",
                "Dr. Jorge Solanilla", "Dr. Carlos Saa V.", "Dr. Tomas Becerra", "Dr. Carlos Haber"
              ].map((name, i) => (
                <div key={i} className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-center gap-3 hover:bg-white hover:shadow-md transition-all group">
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-[10px] font-bold text-slate-400 group-hover:text-primary border border-slate-100">
                    {i + 1}
                  </div>
                  <span className="text-sm font-medium text-slate-700">{name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Misión y Visión */}
      <section className="py-24 container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
              <Target className="w-8 h-8" />
            </div>
            <h2 className="text-4xl font-bold text-slate-900 font-heading">Nuestra Misión</h2>
            <p className="text-lg text-slate-600 leading-relaxed">
              Promover el desarrollo científico, ético y social de la ginecología y obstetricia en Colombia, 
              asegurando la educación continua de nuestros asociados y velando por la salud reproductiva 
              con los más altos estándares de calidad.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-6"
          >
            <div className="w-16 h-16 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary">
              <Award className="w-8 h-8" />
            </div>
            <h2 className="text-4xl font-bold text-slate-900 font-heading">Nuestra Visión</h2>
            <p className="text-lg text-slate-600 leading-relaxed">
              Ser la asociación líder y referente a nivel nacional e internacional en salud femenina, 
              reconocida por su excelencia académica, innovación en investigación y su impacto positivo 
              en las políticas públicas de salud en el país.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Junta Directiva */}
      <section id="junta" className="py-24 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 space-y-4">
            <h2 className="text-5xl font-bold text-slate-900 font-heading">Junta Directiva</h2>
            <p className="text-slate-500 text-xl font-light">El equipo de expertos liderando el futuro de SOVOGIN.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-12">
            {boardMembers.map((member, i) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group"
              >
                <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 group-hover:-translate-y-2 border border-slate-100">
                  <div className="aspect-[4/5] overflow-hidden relative">
                    <img 
                      src={member.image_url || "/img/logo.png"} 
                      alt={member.name} 
                      className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 scale-110 group-hover:scale-100" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <div className="p-8 text-center space-y-2">
                    <h3 className="text-2xl font-bold text-slate-900 group-hover:text-primary transition-colors">{member.name}</h3>
                    <p className="text-primary font-bold uppercase tracking-widest text-xs">{member.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {boardMembers.length === 0 && (
            <div className="text-center py-20 text-slate-400">
              <Users2 className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p>Los integrantes de la junta se están cargando...</p>
            </div>
          )}
        </div>
      </section>

      {/* Estatutos Section */}
      <section id="estatutos" className="py-24 bg-white">
        <div className="container mx-auto px-4 text-center space-y-10">
          <div className="max-w-2xl mx-auto space-y-6">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-900 mx-auto border border-slate-200 shadow-sm">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <h2 className="text-4xl font-bold text-slate-900 font-heading">Estatutos de SOVOGIN</h2>
            <p className="text-slate-500 text-lg leading-relaxed">
              Consulte el marco legal y las normativas que rigen nuestra asociación para garantizar 
              la transparencia y el compromiso ético en todas nuestras actividades.
            </p>
          </div>

          <a 
            href="/docs/EstatutosDef.pdf" 
            download
            className="inline-flex items-center gap-3 px-10 py-5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-bold text-lg shadow-2xl transition-all hover:-translate-y-1"
          >
            <FileDown className="w-6 h-6 text-primary" />
            Descargar Estatutos (PDF)
          </a>
        </div>
      </section>

      {/* Valores */}
      <section className="py-24 container mx-auto px-4">
        <div className="bg-slate-900 rounded-[4rem] p-12 md:p-24 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
            <div className="space-y-4">
              <div className="text-primary text-5xl font-bold font-heading">20+</div>
              <p className="text-white text-lg font-medium">Años de Historia</p>
            </div>
            <div className="space-y-4">
              <div className="text-primary text-5xl font-bold font-heading">500+</div>
              <p className="text-white text-lg font-medium">Asociados Activos</p>
            </div>
            <div className="space-y-4">
              <div className="text-primary text-5xl font-bold font-heading">15k+</div>
              <p className="text-white text-lg font-medium">Vidas Impactadas</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
