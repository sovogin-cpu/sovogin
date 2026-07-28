"use client";

import React from "react";
import { motion } from "framer-motion";
import { 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  Globe, 
  BookOpen, 
  Award,
  FileDown,
  Building2,
  Phone,
  Smartphone,
  MapPin,
  ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";

const reasons = [
  {
    title: "Respaldo en tu ejercicio profesional",
    desc: "Cuenta con respaldo gremial para el ejercicio de tu especialidad en el Valle del Cauca, así como apoyo en procesos de contratación laboral, brindándote mayor seguridad y reconocimiento."
  },
  {
    title: "Invitaciones a eventos y simposios de la Asociación",
    desc: "Disfruta de asistencia gratuita a los eventos académicos organizados por la Asociación durante el año, como parte de un programa de educación médica continuada y actualizada."
  },
  {
    title: "Apoyo legal en casos legales",
    desc: "Recibe asesoría en peritazgos y acompañamiento cuando enfrentes situaciones judiciales relacionadas con tu práctica médica."
  },
  {
    title: "Aval internacional",
    desc: "Obtén el aval internacional con el Colegio Americano de Ginecólogos y Obstetras (ACOG), fortaleciendo tu perfil profesional con reconocimiento global."
  },
  {
    title: "Certificaciones y constancias",
    desc: "Accede a la expedición de constancias para contratación con IPS del Valle del Cauca y con entidades del Estado, facilitando tus procesos laborales. Además, obtén certificación de pertenencia a Fecolsog."
  },
  {
    title: "Actualización académica constante",
    desc: "Participa en cursos, congresos y espacios de formación continua, incluyendo invitaciones a congresos nacionales a través de la industria farmacéutica."
  },
  {
    title: "Crecimiento profesional con alto retorno",
    desc: "Por cada peso invertido en tu afiliación, la Asociación subsidia aproximadamente $4,5 en beneficios como educación continua y acompañamiento gremial."
  }
];

export default function AsociarsePage() {
  return (
    <main className="pt-20 min-h-screen bg-white overflow-hidden">
      {/* Hero Section */}
      <section className="relative py-24 bg-slate-950">
        <div className="absolute inset-0 opacity-40">
          <img src="/img/sv1.png" alt="SOVOGIN Background" className="w-full h-full object-cover" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
        
        <div className="container mx-auto px-4 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl space-y-8"
          >
            <span className="px-4 py-1.5 rounded-full bg-primary/20 border border-primary/30 text-primary text-xs font-bold uppercase tracking-widest">
              Excelencia Gremial
            </span>
            <h1 className="text-5xl md:text-7xl font-bold text-white font-heading leading-tight tracking-tighter">
              Beneficios de ser <br />
              asociado de <span className="text-primary italic">Sovogin</span>
            </h1>
            <div className="space-y-6 text-xl text-slate-300 font-light max-w-3xl leading-relaxed">
              <p>
                Ser parte de Sovogin es integrarse a una comunidad médica de alto nivel científico, comprometida con el crecimiento profesional, el respaldo gremial y la excelencia en la atención de la salud de la mujer en el Valle del Cauca.
              </p>
              <p>
                Como asociado, accedes a una red sólida de apoyo, formación continua y oportunidades que fortalecen tu ejercicio profesional y potencian tu proyección a nivel nacional e internacional.
              </p>
            </div>
            <motion.div
              animate={{ y: [0, 10, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="pt-10"
            >
              <ChevronDown className="w-10 h-10 text-primary opacity-50" />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* 7 Razones Section */}
      <section className="py-32 container mx-auto px-4 relative">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-slate-50 -z-10 rounded-l-[10rem]" />
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-start">
          <div className="space-y-12">
            <div className="space-y-4">
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 font-heading">
                7 razones para ser <br /> miembro de Sovogin
              </h2>
              <div className="h-1.5 w-24 bg-primary rounded-full" />
            </div>

            <div className="space-y-8">
              {reasons.map((reason, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="flex gap-6 group"
                >
                  <div className="shrink-0 w-12 h-12 rounded-2xl bg-white shadow-md border border-slate-100 flex items-center justify-center text-primary font-bold text-lg group-hover:bg-primary group-hover:text-white transition-all duration-300">
                    {i + 1}
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-slate-900 group-hover:text-primary transition-colors">
                      {reason.title}
                    </h3>
                    <p className="text-slate-500 leading-relaxed">
                      {reason.desc}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="sticky top-32 space-y-8">
            <div className="relative rounded-[4rem] overflow-hidden shadow-2xl group">
              <img src="/img/sv2.png" alt="Medical Excellence" className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/40 to-transparent" />
            </div>
            <div className="bg-slate-900 p-12 rounded-[3rem] text-white space-y-6 shadow-xl relative overflow-hidden">
               <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-[60px] rounded-full" />
               <p className="text-lg font-light leading-relaxed relative z-10 italic">
                "Ser asociado de Sovogin no es solo pertenecer a una Asociación: es contar con respaldo, proyección, formación constante y una red que impulsa tu desarrollo profesional y el avance de la ginecología y obstetricia en la región."
               </p>
            </div>
          </div>
        </div>
      </section>

      {/* Requisitos Section */}
      <section className="py-32 bg-slate-50">
        <div className="container mx-auto px-4 max-w-5xl">
          <div className="bg-white rounded-[4rem] p-12 md:p-20 shadow-sm border border-slate-100 space-y-16">
            <div className="text-center space-y-4">
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 font-heading">Requisitos De Admisión</h2>
              <div className="h-1.5 w-24 bg-primary mx-auto rounded-full" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
              <div className="space-y-8">
                <div className="space-y-4">
                  <div className="text-primary font-bold text-sm tracking-widest uppercase">Artículo 13</div>
                  <p className="text-slate-600 leading-relaxed text-justify">
                    La solicitud de admisión a la Asociación como Miembro (s) de Número, deberá estar acompañada de los certificados debidamente autenticados de los títulos académicos que acrediten al solicitante como Médico especialista en Ginecología y Obstetricia, de dos (2) cartas de presentación personal del candidato, firmadas por dos (2) miembros de número en ejercicio de sus derechos.
                  </p>
                  <p className="text-slate-600 leading-relaxed text-justify">
                    La solicitud así presentada será sometida a la consideración de la Junta Directiva y en caso de ser aceptada, se comunicará por escrito a todos los Miembros de la Asociación para su aprobación o reparos sobre las condiciones del candidato.
                  </p>
                </div>
                
                <div className="p-8 bg-slate-50 rounded-3xl border-l-4 border-primary space-y-3 italic text-sm text-slate-500">
                  <span className="font-bold text-slate-700 block not-italic">Parágrafo 1:</span>
                  Los reparos sobre las condiciones del candidato deberán manifestarse por escrito, debidamente sustentados en objeciones de fondo.
                </div>
              </div>

              <div className="space-y-12">
                <div className="space-y-6">
                  <div className="space-y-3">
                    <div className="text-primary font-bold text-sm tracking-widest uppercase">Artículo 14</div>
                    <p className="text-slate-600 leading-relaxed">
                      Llenados los requisitos contemplados en el artículo anterior, en un plazo de treinta (30) días, será sometido el candidato a segunda consideración de la Junta Directiva.
                    </p>
                  </div>
                  
                  <div className="space-y-3">
                    <div className="text-primary font-bold text-sm tracking-widest uppercase">Artículo 15</div>
                    <p className="text-slate-600 leading-relaxed">
                      Una vez aprobado el candidato en forma definitiva, se le comunicará oportunamente por la secretaría para que cancele la cuota de admisión y asista a la Asamblea General siguiente.
                    </p>
                  </div>
                </div>

                <div className="p-8 bg-red-50 rounded-3xl border border-red-100 space-y-2">
                   <div className="flex items-center gap-2 text-red-600 font-bold text-sm">
                      <ShieldCheck className="w-5 h-5" />
                      Confidencialidad (Parágrafo 2)
                   </div>
                   <p className="text-xs text-red-800/70 leading-relaxed">
                    Las razones de no aceptación de un candidato son estrictamente confidenciales. El incumplimiento será considerado como una falta grave.
                   </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-32 container mx-auto px-4">
        <div className="bg-gradient-to-br from-primary to-blue-700 rounded-[5rem] p-12 md:p-24 text-white relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('/img/grid.png')] opacity-10" />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center relative z-10">
            <div className="space-y-8">
              <h2 className="text-4xl md:text-6xl font-bold font-heading leading-none">¿Listo para aplicar?</h2>
              <p className="text-xl text-white/80 leading-relaxed">
                Descarga el Formato de Solicitud de Inscripción, diligéncialo junto con sus anexos y envíalo a nuestras instalaciones.
              </p>
              
              <div className="space-y-6 pt-4">
                <div className="flex items-center gap-4 group">
                  <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 group-hover:bg-white group-hover:text-primary transition-all">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-xs font-bold opacity-60 uppercase tracking-widest">Dirección</div>
                    <div className="text-lg font-medium">Calle 20 Norte No. 6N – 33, Cali – Valle</div>
                  </div>
                </div>
                <div className="flex gap-12">
                  <div className="flex items-center gap-4 group">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 group-hover:bg-white group-hover:text-primary transition-all">
                      <Phone className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-xs font-bold opacity-60 uppercase tracking-widest">Teléfono</div>
                      <div className="text-lg font-medium">660.8599</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 group">
                    <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20 group-hover:bg-white group-hover:text-primary transition-all">
                      <Smartphone className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-xs font-bold opacity-60 uppercase tracking-widest">Celular</div>
                      <div className="text-lg font-medium">316 290 6133</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center">
              <div className="bg-white/10 backdrop-blur-3xl p-12 rounded-[4rem] border border-white/20 w-full max-w-md text-center space-y-8">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto shadow-2xl">
                  <FileDown className="w-12 h-12 text-primary" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold">Solicitud de Admisión</h3>
                  <p className="text-white/60 text-sm">Descarga el formulario oficial en PDF</p>
                </div>
                <a 
                  href="/docs/SolicitudAdmin.pdf" 
                  download 
                  className="inline-flex items-center justify-center w-full h-16 bg-white text-primary font-bold text-lg rounded-2xl hover:bg-slate-50 transition-all shadow-xl active:scale-95 gap-3"
                >
                  Descargar Formulario
                  <ArrowRight className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
