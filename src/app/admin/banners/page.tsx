"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Edit2,
  ExternalLink,
  Image as ImageIcon,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";

import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type BannerPosition =
  | "EVENTS_HEADER"
  | "INNOVATION_HEADER"
  | "COMMUNITY_HEADER"
  | "RESOURCES_HEADER"
  | "HOME_HERO"
  | "ASSOCIATION_HEADER";

type Banner = {
  id: string;
  title: string;
  image_url: string;
  link_url: string | null;
  position: BannerPosition;
  open_in_new_tab: boolean;
  display_order: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
};

type BannerFormData = {
  title: string;
  image_url: string;
  link_url: string;
  position: BannerPosition;
  open_in_new_tab: boolean;
  display_order: number;
  is_active: boolean;
  starts_at: string;
  ends_at: string;
};

const bannerPositions: Array<{
  value: BannerPosition;
  label: string;
}> = [
  {
    value: "EVENTS_HEADER",
    label: "Eventos",
  },
  {
    value: "INNOVATION_HEADER",
    label: "Innovación",
  },
  {
    value: "COMMUNITY_HEADER",
    label: "A la comunidad",
  },
  {
    value: "RESOURCES_HEADER",
    label: "Recursos",
  },
  {
    value: "HOME_HERO",
    label: "Banner principal del Home",
  },
  {
    value: "ASSOCIATION_HEADER",
    label: "Cabecera de Asociación",
  },
];

const initialFormData: BannerFormData = {
  title: "",
  image_url: "",
  link_url: "",
  position: "EVENTS_HEADER",
  open_in_new_tab: false,
  display_order: 0,
  is_active: true,
  starts_at: "",
  ends_at: "",
};

function formatDateForInput(value: string | null) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);

  return localDate.toISOString().slice(0, 16);
}

function toISOStringOrNull(value: string) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function getPositionLabel(position: BannerPosition) {
  return (
    bannerPositions.find((item) => item.value === position)?.label ??
    position
  );
}

export default function BannersAdminPage() {
  const supabase = useMemo(() => createClient(), []);

  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [formData, setFormData] =
    useState<BannerFormData>(initialFormData);

  const fetchBanners = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    }

    try {
      const { data, error } = await supabase
        .from("banners")
        .select("*")
        .order("position", { ascending: true })
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      setBanners((data as Banner[]) ?? []);
    } catch (error) {
      console.error("Error consultando banners:", error);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    let isMounted = true;

    async function loadInitialBanners() {
      try {
        const { data, error } = await supabase
          .from("banners")
          .select("*")
          .order("position", { ascending: true })
          .order("display_order", { ascending: true })
          .order("created_at", { ascending: false });

        if (error) {
          throw error;
        }

        if (isMounted) {
          setBanners((data as Banner[]) ?? []);
        }
      } catch (error) {
        console.error("Error consultando banners:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadInitialBanners();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  function openCreateModal() {
    setEditingId(null);
    setSelectedFile(null);
    setFormData(initialFormData);
    setIsModalOpen(true);
  }

  function openEditModal(banner: Banner) {
    setEditingId(banner.id);
    setSelectedFile(null);

    setFormData({
      title: banner.title,
      image_url: banner.image_url,
      link_url: banner.link_url ?? "",
      position: banner.position,
      open_in_new_tab: banner.open_in_new_tab,
      display_order: banner.display_order,
      is_active: banner.is_active,
      starts_at: formatDateForInput(banner.starts_at),
      ends_at: formatDateForInput(banner.ends_at),
    });

    setIsModalOpen(true);
  }

  async function uploadImage(file: File) {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      throw new Error(
        "La imagen debe estar en formato JPG, PNG o WebP."
      );
    }

    const maximumSize = 5 * 1024 * 1024;

    if (file.size > maximumSize) {
      throw new Error(
        "La imagen no puede superar los 5 MB."
      );
    }

    const fileExtension =
      file.name.split(".").pop()?.toLowerCase() || "webp";

    const safeFileName = crypto.randomUUID();
    const filePath = `${new Date().getFullYear()}/${safeFileName}.${fileExtension}`;

    const { error: uploadError } = await supabase.storage
      .from("banners")
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from("banners")
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      let finalImageUrl = formData.image_url;

      if (selectedFile) {
        finalImageUrl = await uploadImage(selectedFile);
      }

      if (!finalImageUrl) {
        throw new Error(
          "Debes seleccionar una imagen para el banner."
        );
      }

      if (formData.starts_at && formData.ends_at) {
        const startDate = new Date(formData.starts_at);
        const endDate = new Date(formData.ends_at);

        if (endDate <= startDate) {
          throw new Error(
            "La fecha final debe ser posterior a la fecha inicial."
          );
        }
      }

      const payload = {
        title: formData.title.trim(),
        image_url: finalImageUrl,
        link_url: formData.link_url.trim() || null,
        position: formData.position,
        open_in_new_tab: formData.open_in_new_tab,
        display_order: Number(formData.display_order) || 0,
        is_active: formData.is_active,
        starts_at: toISOStringOrNull(formData.starts_at),
        ends_at: toISOStringOrNull(formData.ends_at),
      };

      if (editingId) {
        const { error } = await supabase
          .from("banners")
          .update(payload)
          .eq("id", editingId);

        if (error) {
          throw error;
        }
      } else {
        const { error } = await supabase
          .from("banners")
          .insert([payload]);

        if (error) {
          throw error;
        }
      }

      setIsModalOpen(false);
      setEditingId(null);
      setSelectedFile(null);
      setFormData(initialFormData);

      await fetchBanners();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No fue posible guardar el banner.";

      alert(`Error: ${message}`);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function toggleBannerStatus(banner: Banner) {
    try {
      const { error } = await supabase
        .from("banners")
        .update({
          is_active: !banner.is_active,
        })
        .eq("id", banner.id);

      if (error) {
        throw error;
      }

      await fetchBanners();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No fue posible actualizar el estado.";

      alert(`Error: ${message}`);
    }
  }

  async function deleteBanner(banner: Banner) {
    const confirmed = window.confirm(
      `¿Deseas eliminar el banner "${banner.title}"?`
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("banners")
        .delete()
        .eq("id", banner.id);

      if (error) {
        throw error;
      }

      await fetchBanners();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "No fue posible eliminar el banner.";

      alert(`Error: ${message}`);
    }
  }

  const previewUrl = selectedFile
    ? URL.createObjectURL(selectedFile)
    : formData.image_url;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-slate-900">
            Administrador de Banners
          </h1>

          <p className="mt-1 text-slate-500">
            Gestiona imágenes promocionales, enlaces, posiciones y
            fechas de publicación.
          </p>
        </div>

        <Button
          type="button"
          onClick={openCreateModal}
          className="h-12 gap-2 rounded-xl bg-primary px-6 font-bold shadow-lg shadow-primary/20 hover:bg-primary/90"
        >
          <Plus className="h-5 w-5" />
          Nuevo Banner
        </Button>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto rounded-[2.5rem] border-none shadow-2xl sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle className="font-heading text-2xl font-bold">
              {editingId ? "Editar Banner" : "Nuevo Banner"}
            </DialogTitle>
          </DialogHeader>

          <form
            onSubmit={handleSubmit}
            className="space-y-6 pt-4"
          >
            <div className="space-y-3">
              <Label>Imagen del banner</Label>

              <div className="overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50">
                <div className="relative aspect-[16/9] w-full">
                  {previewUrl ? (
                    <img
                      src={previewUrl}
                      alt="Vista previa del banner"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-300">
                      <ImageIcon className="h-12 w-12" />
                      <span className="text-sm font-medium">
                        Sin imagen seleccionada
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) =>
                  setSelectedFile(
                    event.target.files?.[0] ?? null
                  )
                }
                className="h-12 cursor-pointer pt-2"
              />

              <p className="text-xs text-slate-400">
                Recomendado: imagen horizontal 1600 × 900 px,
                formato WebP, JPG o PNG y máximo 5 MB.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Título interno</Label>

              <Input
                required
                value={formData.title}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    title: event.target.value,
                  })
                }
                placeholder="Ej: Simposio de agosto"
                className="h-12 rounded-xl"
              />

              <p className="text-xs text-slate-400">
                Este título será visible únicamente en el
                administrador.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Ubicación del banner</Label>

              <select
                value={formData.position}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    position:
                      event.target.value as BannerPosition,
                  })
                }
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 outline-none focus:ring-2 focus:ring-primary/20"
              >
                {bannerPositions.map((position) => (
                  <option
                    key={position.value}
                    value={position.value}
                  >
                    {position.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Enlace al hacer clic</Label>

              <Input
                type="url"
                value={formData.link_url}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    link_url: event.target.value,
                  })
                }
                placeholder="https://www.sovogin.com/..."
                className="h-12 rounded-xl"
              />

              <p className="text-xs text-slate-400">
                Es opcional. Puede dirigir a un evento, recurso,
                inscripción o página externa.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Orden de aparición</Label>

                <Input
                  type="number"
                  min={0}
                  value={formData.display_order}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      display_order:
                        Number(event.target.value) || 0,
                    })
                  }
                  className="h-12 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label>Estado</Label>

                <label className="flex h-12 cursor-pointer items-center gap-3 rounded-xl border border-slate-200 px-4">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(event) =>
                      setFormData({
                        ...formData,
                        is_active: event.target.checked,
                      })
                    }
                    className="h-4 w-4 accent-primary"
                  />

                  <span className="text-sm font-medium text-slate-700">
                    Banner activo
                  </span>
                </label>
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 p-4">
              <input
                type="checkbox"
                checked={formData.open_in_new_tab}
                onChange={(event) =>
                  setFormData({
                    ...formData,
                    open_in_new_tab: event.target.checked,
                  })
                }
                className="h-4 w-4 accent-primary"
              />

              <div>
                <span className="block text-sm font-bold text-slate-700">
                  Abrir enlace en una nueva pestaña
                </span>

                <span className="text-xs text-slate-400">
                  Recomendado para páginas externas.
                </span>
              </div>
            </label>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Publicar desde</Label>

                <Input
                  type="datetime-local"
                  value={formData.starts_at}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      starts_at: event.target.value,
                    })
                  }
                  className="h-12 rounded-xl"
                />
              </div>

              <div className="space-y-2">
                <Label>Publicar hasta</Label>

                <Input
                  type="datetime-local"
                  value={formData.ends_at}
                  onChange={(event) =>
                    setFormData({
                      ...formData,
                      ends_at: event.target.value,
                    })
                  }
                  className="h-12 rounded-xl"
                />
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-amber-800">
              <CalendarClock className="mt-0.5 h-5 w-5 shrink-0" />

              <p className="text-xs leading-relaxed">
                Las fechas son opcionales. Sin fechas, el banner
                permanecerá visible mientras esté activo.
              </p>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-14 w-full rounded-2xl bg-primary text-lg font-bold text-white shadow-xl shadow-primary/20"
            >
              {isSubmitting ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : editingId ? (
                "Guardar cambios"
              ) : (
                "Crear banner"
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : banners.length === 0 ? (
        <div className="rounded-[3rem] border-2 border-dashed border-slate-100 bg-white py-24 text-center">
          <ImageIcon className="mx-auto mb-4 h-16 w-16 text-slate-200" />

          <h2 className="font-heading text-2xl font-bold text-slate-700">
            Todavía no hay banners
          </h2>

          <p className="mt-2 text-sm text-slate-400">
            Crea el primer banner para comenzar.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-2">
          {banners.map((banner) => (
            <Card
              key={banner.id}
              className="overflow-hidden rounded-[2.5rem] border border-slate-100 bg-white shadow-sm"
            >
              <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
                <img
                  src={banner.image_url}
                  alt={banner.title}
                  className="h-full w-full object-cover"
                />

                <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                  <span className="rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-700 backdrop-blur">
                    {getPositionLabel(banner.position)}
                  </span>

                  <span
                    className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                      banner.is_active
                        ? "bg-emerald-500 text-white"
                        : "bg-slate-700 text-white"
                    }`}
                  >
                    {banner.is_active ? "Activo" : "Inactivo"}
                  </span>
                </div>
              </div>

              <CardContent className="space-y-5 p-7">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    {banner.title}
                  </h2>

                  <p className="mt-1 text-xs font-medium uppercase tracking-wider text-slate-400">
                    Orden: {banner.display_order}
                  </p>
                </div>

                {banner.link_url && (
                  <a
                    href={banner.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 truncate text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-4 w-4 shrink-0" />
                    <span className="truncate">
                      {banner.link_url}
                    </span>
                  </a>
                )}

                <div className="grid grid-cols-1 gap-2 text-xs text-slate-500 sm:grid-cols-2">
                  <div>
                    <span className="font-bold">Desde: </span>
                    {banner.starts_at
                      ? new Date(
                          banner.starts_at
                        ).toLocaleString("es-CO")
                      : "Sin fecha"}
                  </div>

                  <div>
                    <span className="font-bold">Hasta: </span>
                    {banner.ends_at
                      ? new Date(
                          banner.ends_at
                        ).toLocaleString("es-CO")
                      : "Sin fecha"}
                  </div>
                </div>

                <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => openEditModal(banner)}
                    className="h-11 flex-1 gap-2 rounded-xl font-bold"
                  >
                    <Edit2 className="h-4 w-4" />
                    Editar
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => toggleBannerStatus(banner)}
                    className="h-11 flex-1 rounded-xl font-bold"
                  >
                    {banner.is_active
                      ? "Desactivar"
                      : "Activar"}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => deleteBanner(banner)}
                    className="h-11 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-5 w-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}