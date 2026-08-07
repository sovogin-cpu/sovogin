"use client";

import React from "react";
import { FormBlock } from "@/lib/content/types";
import { PublicBlockRendererProps } from "@/lib/content/public-renderer-types";

type FormComponentProps = {
  title?: string;
  description?: string;
};

// Explicit registry of safe, known form implementations
const REGISTERED_FORMS: Record<string, React.ComponentType<FormComponentProps>> = {};

export function FormPublicBlock({
  block,
}: PublicBlockRendererProps<FormBlock>) {
  const FormImpl = REGISTERED_FORMS[block.formKey];

  if (FormImpl) {
    return <FormImpl title={block.title} description={block.description} />;
  }

  if (process.env.NODE_ENV === "development") {
    return (
      <div className="p-4 rounded-xl border border-dashed border-amber-300 bg-amber-50 text-amber-800 text-xs my-3">
        <span className="font-bold">Formulario dinámico (Modo desarrollo):</span> Clave &quot;{block.formKey}&quot;
      </div>
    );
  }

  return null;
}
