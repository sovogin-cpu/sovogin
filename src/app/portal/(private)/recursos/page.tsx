import React from "react";
import { PortalResourcesCatalog } from "@/components/portal/resources/PortalResourcesCatalog";

export const metadata = {
  title: "Biblioteca de Recursos | Portal SOVOGIN",
  description: "Acceso exclusivo a guías clínicas, actas, protocolos y documentación oficial para asociados activos.",
};

export default function PortalResourcesPage() {
  return <PortalResourcesCatalog />;
}
