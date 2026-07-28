import { Hero } from "@/components/home/Hero";
import { createClient } from "@/utils/supabase/server";
import Link from "next/link";

export default async function Home() {
  const supabase = await createClient();
  
  // Fetch Events
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .order('date', { ascending: true })
    .limit(3);

  // Fetch Sponsors
  const { data: sponsors } = await supabase
    .from('sponsors')
    .select('*')
    .order('created_at', { ascending: true });

  return (
    <div className="flex flex-col min-h-screen">
      <Hero />
      
      {/* Association Info Section */}
      <section className="py-24 bg-white">
        <div className="container mx-auto px-4 text-center space-y-6">
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 tracking-tight">
            Nuestra Misión y Visión
          </h2>
          <p className="text-lg text-slate-600 leading-relaxed max-w-3xl mx-auto">
            Fomentar el desarrollo científico y gremial de la especialidad, garantizando una atención de salud con calidad y calidez para la mujer y el recién nacido.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-12">
            <div className="p-10 rounded-3xl bg-slate-50 border border-slate-100 text-left space-y-4 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-2">
                <span className="font-bold text-xl">M</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900">Misión</h3>
              <p className="text-slate-600 leading-relaxed">
                Liderar el ejercicio ético y científico de la ginecología y obstetricia, promoviendo la educación continua, la investigación y el bienestar integral de la mujer colombiana a través de la excelencia profesional.
              </p>
            </div>
            <div className="p-10 rounded-3xl bg-slate-50 border border-slate-100 text-left space-y-4 hover:shadow-lg transition-all">
              <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary mb-2">
                <span className="font-bold text-xl">V</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900">Visión</h3>
              <p className="text-slate-600 leading-relaxed">
                Ser la asociación líder en el país en 2030, reconocida internacionalmente por su excelencia académica, compromiso social y defensa incansable del ejercicio profesional ético de sus asociados.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Symposium Preview */}
      <section className="py-24 bg-slate-50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
            <div className="space-y-4">
              <h2 className="text-3xl md:text-5xl font-bold text-slate-900 tracking-tight">Próximos eventos</h2>
              <p className="text-slate-600 max-w-xl text-lg">
                Participe en nuestros eventos académicos de alto nivel con expertos nacionales e internacionales.
              </p>
            </div>
            <Link href="/simposios" className="text-primary font-bold hover:underline flex items-center gap-2 text-lg">
              Ver todos los eventos
              <span>→</span>
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {events && events.length > 0 ? (
              events.map((event) => (
                <div key={event.id} className="group bg-white rounded-3xl overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-300 border border-slate-100">
                  <div className="aspect-video bg-slate-200 relative overflow-hidden">
                    <img 
                      src={event.image_url || "/img/1.jpeg"} 
                      alt={event.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10 opacity-60 group-hover:opacity-40 transition-opacity" />
                    <div className="absolute bottom-4 left-4 z-20">
                      <span className="px-3 py-1 bg-primary text-white text-xs font-bold rounded-full uppercase tracking-wider shadow-lg">
                        {event.category || "Académico"}
                      </span>
                    </div>
                  </div>
                  <div className="p-8 space-y-4">
                    <div className="text-primary text-sm font-bold uppercase tracking-widest">
                      {new Date(event.date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                    <h3 className="text-2xl font-bold text-slate-900 group-hover:text-primary transition-colors leading-tight">
                      {event.title}
                    </h3>
                    <p className="text-slate-600 leading-relaxed line-clamp-2">
                      {event.description || "Participe en nuestros eventos académicos de alto nivel con expertos nacionales e internacionales."}
                    </p>
                    <div className="pt-4 flex items-center justify-between border-t border-slate-50">
                      <span className="text-slate-900 font-bold text-xl">
                        {event.price ? `$${new Intl.NumberFormat('es-CO').format(event.price)} COP` : "Gratis"}
                      </span>
                      <Link href={`/simposios/${event.id}/registro`}>
                        <button className="font-bold text-primary hover:text-primary/80 transition-colors">Registrarse →</button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-12 text-center text-slate-500">
                No hay eventos programados en este momento.
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-primary text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <h2 className="text-3xl md:text-5xl font-bold">Únete a la excelencia médica</h2>
            <p className="text-xl text-primary-foreground/80 leading-relaxed">
              Sea parte de la red más importante de especialistas en ginecología y obstetricia. 
              Acceda a recursos exclusivos, networking y formación continua.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link href="/asociarse">
                <button className="bg-white text-primary font-bold px-10 py-4 rounded-xl shadow-xl hover:bg-slate-50 transition-all">
                  Convertirse en Asociado
                </button>
              </Link>
              <Link href="/asociarse">
                <button className="bg-primary-foreground/10 text-white font-bold px-10 py-4 rounded-xl border border-white/20 hover:bg-white/10 transition-all">
                  Saber más sobre beneficios
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Sponsors Section */}
      {sponsors && sponsors.length > 0 && (
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-10">
              <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-xs">Patrocinadores y Aliados Estratégicos</p>
            </div>
            <div className="flex flex-wrap justify-center items-center gap-12 opacity-60 hover:opacity-100 transition-opacity duration-500">
              {sponsors.map((sponsor) => (
                <div key={sponsor.id} className="w-32 md:w-40 grayscale hover:grayscale-0 transition-all duration-300">
                  <img 
                    src={sponsor.logo_url} 
                    alt={sponsor.name} 
                    className="w-full h-auto object-contain max-h-16"
                    title={sponsor.name}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
