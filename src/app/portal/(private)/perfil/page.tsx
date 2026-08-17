import React from "react";
import { ProfileManager } from "@/components/portal/profile/ProfileManager";

export const metadata = {
  title: "Mi Perfil Profesional | Portal SOVOGIN",
  description: "Gestión de perfil profesional, datos públicos y visibilidad en el Directorio Médico SOVOGIN.",
};

export default function AssociateProfilePage() {
  return <ProfileManager />;
}
