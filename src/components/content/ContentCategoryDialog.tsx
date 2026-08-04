import React, { useState } from "react";
import { X } from "lucide-react";
import { ContentCategory, ContentChannel } from "@/lib/content/types";
import {
  formatContentChannel,
  normalizeContentSlug,
  slugifyContentTitle,
} from "@/lib/content/content-utils";

interface ContentCategoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (payload: {
    channel: ContentChannel | null;
    name: string;
    slug: string;
    description: string | null;
    is_active: boolean;
  }) => Promise<void>;
  categoryToEdit?: ContentCategory | null;
}

export const ContentCategoryDialog: React.FC<ContentCategoryDialogProps> = ({
  isOpen,
  onClose,
  onSave,
  categoryToEdit,
}) => {
  if (!isOpen) return null;

  return (
    <ContentCategoryDialogForm
      onClose={onClose}
      onSave={onSave}
      categoryToEdit={categoryToEdit}
    />
  );
};

interface ContentCategoryDialogFormProps {
  onClose: () => void;
  onSave: (payload: {
    channel: ContentChannel | null;
    name: string;
    slug: string;
    description: string | null;
    is_active: boolean;
  }) => Promise<void>;
  categoryToEdit?: ContentCategory | null;
}

const ContentCategoryDialogForm: React.FC<ContentCategoryDialogFormProps> = ({
  onClose,
  onSave,
  categoryToEdit,
}) => {
  const [name, setName] = useState(categoryToEdit?.name || "");
  const [slug, setSlug] = useState(categoryToEdit?.slug || "");
  const [channel, setChannel] = useState<ContentChannel | "global">(
    categoryToEdit?.channel || "global"
  );
  const [description, setDescription] = useState(categoryToEdit?.description || "");
  const [isActive, setIsActive] = useState(categoryToEdit?.is_active ?? true);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSlugCustom, setIsSlugCustom] = useState(Boolean(categoryToEdit));

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (!isSlugCustom) {
      setSlug(slugifyContentTitle(val));
    }
  };

  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsSlugCustom(true);
    setSlug(normalizeContentSlug(e.target.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const trimmedName = name.trim();
    const trimmedSlug = normalizeContentSlug(slug || name);

    if (!trimmedName) {
      setErrorMsg("El nombre de la categoría es obligatorio.");
      return;
    }

    if (!trimmedSlug) {
      setErrorMsg("El slug de la categoría no es válido.");
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave({
        name: trimmedName,
        slug: trimmedSlug,
        channel: channel === "global" ? null : channel,
        description: description.trim() || null,
        is_active: isActive,
      });
      onClose();
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Error al guardar la categoría.";
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-lg font-bold text-slate-900">
            {categoryToEdit ? "Editar Categoría CMS" : "Nueva Categoría CMS"}
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Nombre <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={handleNameChange}
              placeholder="Ej. Artículos Académicos"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006666] focus:bg-white"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Slug (Identificador URL) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={slug}
              onChange={handleSlugChange}
              placeholder="ej. articulos-academicos"
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006666] focus:bg-white font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Canal Asignado
            </label>
            <select
              value={channel}
              onChange={(e) =>
                setChannel(e.target.value as ContentChannel | "global")
              }
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006666] text-slate-700 font-medium"
            >
              <option value="global">Global (Todos los canales)</option>
              <option value="innovation">Innovación ({formatContentChannel("innovation")})</option>
              <option value="community">A la comunidad ({formatContentChannel("community")})</option>
              <option value="news">Noticias ({formatContentChannel("news")})</option>
              <option value="benefits">Beneficios ({formatContentChannel("benefits")})</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Descripción Opcional
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Breve descripción del propósito de la categoría..."
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#006666] focus:bg-white"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="is_active_check"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="w-4 h-4 text-[#006666] rounded border-slate-300 focus:ring-[#006666]"
            />
            <label
              htmlFor="is_active_check"
              className="text-sm font-medium text-slate-700 select-none cursor-pointer"
            >
              Categoría Activa (Visible para filtrados y asignaciones)
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-semibold text-white bg-[#006666] hover:bg-[#004d4d] rounded-lg transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting
                ? "Guardando..."
                : categoryToEdit
                ? "Actualizar Categoría"
                : "Crear Categoría"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
