import { Metadata } from "next";
import Link from "next/link";
import { UserCheck, ArrowRight } from "lucide-react";
import { ContentChannelPage } from "@/components/content/public/ContentChannelPage";

export const metadata: Metadata = {
  title: "A la comunidad | SOVOGIN",
  description:
    "Información educativa, prevención en salud femenina y directorio público de médicos especialistas - SOVOGIN.",
};

export default function ComunidadPage() {
  return (
    <div className="space-y-0">
      <ContentChannelPage
        channel="community"
        title="A la Comunidad"
        description="Información médica accesible, artículos de prevención, salud integral de la mujer y recursos educativos desarrollados por especialistas de SOVOGIN."
        basePath="/comunidad"
        headerBannerPosition="COMMUNITY_HEADER"
        inlineBannerPosition="COMMUNITY_INLINE"
      />

      {/* Directory Callout Banner */}
      <section className="bg-slate-900 text-white py-12 border-t border-slate-800">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="bg-gradient-to-r from-slate-900 via-[#004d4d] to-slate-900 p-8 sm:p-12 rounded-3xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
            <div className="space-y-2 text-center sm:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-sm text-emerald-300 text-xs font-bold rounded-full border border-white/10">
                <UserCheck className="w-3.5 h-3.5" />
                <span>Directorio de Médicos Asociados</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                ¿Buscas un médico especialista en Ginecología u Obstetricia?
              </h2>
              <p className="text-sm text-slate-300 max-w-xl">
                Consulta el directorio público oficial de médicos avalados por la Sociedad Vallecaucana de Ginecología y Obstetricia.
              </p>
            </div>

            <Link
              href="/comunidad/directorio-medico"
              className="px-6 py-3.5 bg-white text-slate-900 hover:bg-emerald-50 font-extrabold text-sm rounded-2xl transition-colors shadow-lg flex items-center gap-2 shrink-0"
            >
              <span>Consultar Directorio Médico</span>
              <ArrowRight className="w-4 h-4 text-[#006666]" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
