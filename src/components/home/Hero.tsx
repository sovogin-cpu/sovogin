"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ChevronRight, Award, Users, BookOpen } from "lucide-react";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Full-width Background Banner */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/img/banner.png" 
          alt="SOVOGIN Banner" 
          className="w-full h-full object-cover object-[70%_center] md:object-center"
        />
        {/* Advanced Gradient Overlay for premium feel and text contrast */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/40 to-transparent" />
      </div>

      <div className="container mx-auto px-4 relative z-10 pt-20">
        <div className="max-w-4xl space-y-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/10 text-white backdrop-blur-xl border border-white/20 text-sm font-bold tracking-widest uppercase"
          >
            <Award className="w-4 h-4 text-primary" />
            <span>Excelencia en Salud Femenina</span>
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-6xl md:text-9xl font-bold text-white leading-[0.9] tracking-tighter"
          >
            Liderando el futuro de la <span className="text-primary">Ginecología</span>
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="text-xl md:text-3xl text-slate-100/80 leading-relaxed max-w-2xl font-light"
          >
            Unimos a los profesionales de la salud para promover la educación continua, 
            la investigación y los más altos estándares.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="flex flex-wrap gap-6 pt-6"
          >
            <Link href="/simposios">
              <Button size="lg" className="h-14 px-8 text-lg bg-primary hover:bg-primary/90 text-white gap-3 shadow-lg transition-all hover:scale-105 active:scale-95 border-none rounded-xl font-bold">
                Ver Eventos
                <ChevronRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="/asociarse">
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg border-2 border-white/40 text-white hover:bg-white hover:text-slate-900 bg-white/5 backdrop-blur-md transition-all rounded-xl font-bold">
                Asociarse Ahora
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
      
      {/* Scroll Indicator */}
      <motion.div 
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 hidden md:block"
      >
        <div className="w-8 h-12 rounded-full border-2 border-white/30 flex justify-center p-2">
          <div className="w-1 h-3 bg-white/60 rounded-full" />
        </div>
      </motion.div>
    </section>
  );
}
