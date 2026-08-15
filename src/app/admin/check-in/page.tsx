"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { QrCode, Loader2, ArrowLeft, Keyboard, Camera } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";
import { RegistrationEventItem } from "@/lib/registrations/types";
import { listEventsForAdminRegistration } from "@/lib/registrations/registration-repository";
import { CheckInEventSelector } from "@/components/check-in/CheckInEventSelector";
import { CheckInScanner } from "@/components/check-in/CheckInScanner";
import { CheckInManualInput } from "@/components/check-in/CheckInManualInput";
import { CheckInResult, CheckInResultData } from "@/components/check-in/CheckInResult";

export default function AdminCheckInPage() {
  const [events, setEvents] = useState<RegistrationEventItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [loadingEvents, setLoadingEvents] = useState<boolean>(true);

  // Modo de escaneo: 'camera' | 'manual'
  const [mode, setMode] = useState<"camera" | "manual">("camera");

  // Estado del proceso de check-in
  const [processing, setProcessing] = useState<boolean>(false);
  const [resultData, setResultData] = useState<CheckInResultData | null>(null);

  const supabase = useMemo(() => createClient(), []);

  // Cargar eventos activos
  useEffect(() => {
    async function loadEvents() {
      try {
        setLoadingEvents(true);
        const data = await listEventsForAdminRegistration(supabase);
        setEvents(data);
        if (data.length > 0) {
          setSelectedEventId(data[0].id);
        }
      } catch (err) {
        console.error("Error al cargar eventos para el check-in:", err);
      } finally {
        setLoadingEvents(false);
      }
    }
    loadEvents();
  }, [supabase]);

  // Procesar escaneo/token
  const handleProcessToken = useCallback(
    async (token: string) => {
      if (!selectedEventId) {
        alert("Por favor selecciona un evento antes de escanear.");
        return;
      }

      try {
        setProcessing(true);
        const response = await fetch("/api/admin/check-in/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, eventId: selectedEventId }),
        });

        const data = await response.json();

        if (response.ok) {
          if (data.alreadyCheckedIn) {
            setResultData({
              status: "already_checked_in",
              fullName: data.fullName,
              eventTitle: data.eventTitle,
              category: data.category,
              modality: data.modality,
              checkedInAt: data.checkedInAt,
            });
          } else {
            setResultData({
              status: "success",
              fullName: data.fullName,
              eventTitle: data.eventTitle,
              category: data.category,
              modality: data.modality,
              checkedInAt: data.checkedInAt,
            });
          }
        } else {
          // Errores de negocio
          if (data.code === "EVENT_MISMATCH") {
            setResultData({
              status: "event_mismatch",
              fullName: data.fullName,
              actualEventTitle: data.actualEventTitle,
            });
          } else if (data.code === "REGISTRATION_PENDING") {
            setResultData({
              status: "pending",
              fullName: data.fullName,
              eventTitle: data.eventTitle,
            });
          } else if (data.code === "REGISTRATION_CANCELLED") {
            setResultData({
              status: "cancelled",
              fullName: data.fullName,
              eventTitle: data.eventTitle,
            });
          } else {
            setResultData({
              status: "invalid_qr",
              message: data.error || "Código no reconocido.",
            });
          }
        }
      } catch (error: unknown) {
        console.error("Error al procesar el token de ingreso:", error);
        setResultData({
          status: "error",
          message: "Error de conexión al verificar el ingreso.",
        });
      } finally {
        setProcessing(false);
      }
    },
    [selectedEventId]
  );

  const handleReset = () => {
    setResultData(null);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 pb-12">
      {/* Top Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-20 shadow-md">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/inscritos"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight flex items-center gap-2">
                <QrCode className="w-5 h-5 text-sky-400" /> Acreditación SOVOGIN
              </h1>
              <p className="text-[11px] text-slate-400">Control de ingreso en sitio por QR</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-xl mx-auto px-4 pt-4 space-y-4">
        {/* Selector de Evento */}
        {loadingEvents ? (
          <div className="bg-slate-900 text-white p-4 rounded-2xl flex items-center justify-center gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-sky-400" />
            <span className="text-sm">Cargando eventos activos...</span>
          </div>
        ) : (
          <CheckInEventSelector
            events={events}
            selectedEventId={selectedEventId}
            onSelectEvent={setSelectedEventId}
            disabled={processing || !!resultData}
          />
        )}

        {/* Zona Central de Resultado o Escáner */}
        {resultData ? (
          <div className="py-4 flex justify-center">
            <CheckInResult data={resultData} onReset={handleReset} />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Controls Toggle */}
            <div className="grid grid-cols-2 gap-2 bg-slate-200 p-1.5 rounded-2xl">
              <button
                type="button"
                onClick={() => setMode("camera")}
                className={`py-2.5 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                  mode === "camera"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Camera className="w-4 h-4" /> Escáner de Cámara
              </button>
              <button
                type="button"
                onClick={() => setMode("manual")}
                className={`py-2.5 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
                  mode === "manual"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Keyboard className="w-4 h-4" /> Código Manual
              </button>
            </div>

            {processing && (
              <div className="bg-sky-50 border border-sky-200 text-sky-900 p-4 rounded-2xl flex items-center justify-center gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-sky-600" />
                <span className="font-semibold text-sm">Verificando acreditación...</span>
              </div>
            )}

            {/* Escáner o Campo Manual */}
            {mode === "camera" ? (
              <CheckInScanner
                onScanSuccess={handleProcessToken}
                active={!processing && !!selectedEventId}
                disabled={processing || !selectedEventId}
              />
            ) : (
              <CheckInManualInput
                onSubmitToken={handleProcessToken}
                loading={processing}
                disabled={!selectedEventId}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
