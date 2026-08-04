import { Metadata } from "next";
import { notFound } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { getPublishedDoctorById } from "@/lib/directory/directory-repository";
import { DoctorProfilePage } from "@/components/directory/DoctorProfilePage";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const supabase = createClient();
  const doctor = await getPublishedDoctorById(supabase, id);

  if (!doctor) {
    return {
      title: "Especialista no encontrado | SOVOGIN",
    };
  }

  return {
    title: `${doctor.display_name} - ${doctor.specialty} | SOVOGIN`,
    description: `Perfil profesional del Dr. ${doctor.display_name}, especialista en ${doctor.specialty} en ${doctor.city} - Miembro Asociado SOVOGIN.`,
  };
}

export default async function DoctorProfileDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = createClient();
  const doctor = await getPublishedDoctorById(supabase, id);

  if (!doctor) {
    notFound();
  }

  return <DoctorProfilePage doctor={doctor} />;
}
