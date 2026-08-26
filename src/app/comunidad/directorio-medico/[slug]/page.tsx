import { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { getPublishedDoctorProfile } from "@/lib/directory/directory-repository";
import { DoctorProfilePage } from "@/components/directory/DoctorProfilePage";
import { isUUID } from "@/lib/directory/directory-utils";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const doctor = await getPublishedDoctorProfile(supabase, slug);

  if (!doctor) {
    return {
      title: "Especialista no encontrado | SOVOGIN",
    };
  }

  const locationText = doctor.city + (doctor.department ? `, ${doctor.department}` : "");
  const canonicalUrl = `/comunidad/directorio-medico/${doctor.slug || doctor.id}`;

  return {
    title: `${doctor.display_name} - ${doctor.specialty} | SOVOGIN`,
    description: `Perfil profesional de ${doctor.display_name}, especialista en ${doctor.specialty} en ${locationText}. Médico Asociado a SOVOGIN.`,
    alternates: {
      canonical: canonicalUrl,
    },
  };
}

export default async function DoctorProfileDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const doctor = await getPublishedDoctorProfile(supabase, slug);

  if (!doctor) {
    notFound();
  }

  // Canonical HTTP 308 Permanent Redirect from legacy UUID parameter to friendly slug URL
  if (isUUID(slug) && doctor.slug && doctor.slug !== slug) {
    permanentRedirect(`/comunidad/directorio-medico/${doctor.slug}`);
  }

  return <DoctorProfilePage doctor={doctor} />;
}
