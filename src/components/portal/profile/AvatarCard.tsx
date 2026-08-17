"use client";

import React, { useState, useRef } from "react";
import { Camera, Upload, Loader2, User, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AvatarCardProps {
  currentMediaUrl: string | null;
  associateName: string;
  onAvatarUpdated: (newUrl: string, mediaId: string) => void;
}

export const AvatarCard: React.FC<AvatarCardProps> = ({
  currentMediaUrl,
  associateName,
  onAvatarUpdated,
}) => {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentMediaUrl);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setErrorMsg("Formato no permitido. Seleccione una imagen JPG, PNG o WEBP.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg("El archivo excede el tamaño máximo permitido de 5 MB.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/portal/profile/avatar", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMsg(data.error || "No se pudo actualizar la foto de perfil.");
        setPreviewUrl(currentMediaUrl);
        return;
      }

      setSuccessMsg("¡Foto de perfil actualizada exitosamente!");
      onAvatarUpdated(data.public_url, data.profile_media_id);
    } catch (err: unknown) {
      console.error("Error al subir avatar:", err);
      setErrorMsg("Error de conexión al subir la imagen.");
      setPreviewUrl(currentMediaUrl);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("");
  };

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-[2rem] space-y-6 shadow-md">
      <div className="flex items-center gap-3 border-b border-slate-800 pb-5">
        <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-slate-700 text-teal-300 flex items-center justify-center">
          <Camera className="w-5 h-5 text-teal-400" />
        </div>
        <div>
          <h3 className="text-base font-extrabold text-white font-heading">
            Fotografía Profesional
          </h3>
          <span className="text-xs text-slate-400">
            Cargue su avatar para ser visualizado en la ficha del Directorio Médico.
          </span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-6">
        {/* Avatar Display */}
        <div className="relative group shrink-0">
          <div className="w-28 h-28 md:w-32 md:h-32 rounded-full overflow-hidden bg-slate-950 border-4 border-slate-800 shadow-xl flex items-center justify-center relative">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={associateName}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-teal-600/40 to-slate-900 flex items-center justify-center text-2xl md:text-3xl font-extrabold text-white font-heading">
                {getInitials(associateName) || <User className="w-12 h-12 text-slate-400" />}
              </div>
            )}

            {uploading && (
              <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 text-white">
                <Loader2 className="w-7 h-7 animate-spin text-teal-400" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Subiendo</span>
              </div>
            )}
          </div>
        </div>

        {/* Upload Action & Guidance */}
        <div className="space-y-3 flex-1 text-center sm:text-left">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white">Cargar nueva fotografía</h4>
            <p className="text-xs text-slate-300 leading-relaxed">
              Formatos soportados: <strong className="text-white">JPG, PNG o WEBP</strong>. Tamaño máximo permitido: <strong className="text-white">5 MB</strong>. Se recomienda una imagen cuadrada de buena resolución.
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
            id="avatar-file-input"
            disabled={uploading}
          />

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-1">
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="bg-[#006666] hover:bg-[#005555] text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all shadow-md flex items-center gap-2 focus:ring-2 focus:ring-teal-500"
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
              {uploading ? "Procesando..." : "Seleccionar Foto"}
            </Button>
          </div>

          {errorMsg && (
            <div className="flex items-center gap-2 text-rose-300 text-xs font-medium bg-rose-500/15 border border-rose-500/30 p-2.5 rounded-xl mt-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 text-emerald-300 text-xs font-medium bg-emerald-500/15 border border-emerald-500/30 p-2.5 rounded-xl mt-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
