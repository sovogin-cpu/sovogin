import { Metadata } from "next";
import { DoctorDirectoryPage } from "@/components/directory/DoctorDirectoryPage";

export const metadata: Metadata = {
  title: "Directorio Médico | SOVOGIN",
  description:
    "Directorio oficial de ginecólogos y obstetras asociados a SOVOGIN en el Valle del Cauca. Canales de contacto profesional y telemedicina.",
};

export default function ComunidadDirectorioMedicoPage() {
  return <DoctorDirectoryPage />;
}
