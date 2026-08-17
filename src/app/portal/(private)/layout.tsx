import React from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { PortalShell } from "@/components/portal/PortalShell";

type PortalLayoutProps = {
  children: React.ReactNode;
};

export default async function PortalProtectedLayout({ children }: PortalLayoutProps) {
  const supabase = await createClient();

  // 1. Verificar sesión activa de autenticación
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/portal/login");
  }

  // 2. Verificar existencia de expediente de asociado vinculado por user_id
  const { data: associate } = await supabaseAdmin
    .from("associates")
    .select("id, full_name, email, document_number, specialty, status, user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  // Caso 1: El usuario no posee un registro de asociado vinculado
  if (!associate) {
    redirect("/portal/no-autorizado");
  }

  // Caso 2: El asociado existe pero su estado es Inactivo
  if (associate.status !== "Activo") {
    redirect("/portal/membresia-inactiva");
  }

  // Caso 3: Asociado Activo confirmado
  return (
    <PortalShell
      associateName={associate.full_name || "Estimado(a) Doctor(a)"}
      associateEmail={associate.email || user.email || ""}
    >
      {children}
    </PortalShell>
  );
}
