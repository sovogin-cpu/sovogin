"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { UserCheck, Undo2, Loader2 } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { Registration } from "@/lib/registrations/types";
import {
  checkInRegistration,
  undoRegistrationCheckIn,
} from "@/lib/registrations/registration-repository";

interface RegistrationCheckInButtonProps {
  registration: Registration;
  onSuccess: () => void;
}

export function RegistrationCheckInButton({
  registration,
  onSuccess,
}: RegistrationCheckInButtonProps) {
  const [loading, setLoading] = useState(false);

  const isCheckedIn = Boolean(registration.checked_in_at);
  const isConfirmed = registration.status === "confirmed";

  const handleCheckIn = async () => {
    if (!isConfirmed) {
      alert("La inscripción debe estar confirmada antes de registrar el ingreso.");
      return;
    }

    if (!confirm(`¿Confirmar el ingreso de "${registration.full_name}" al evento?`)) {
      return;
    }

    try {
      setLoading(true);
      const supabase = createClient();
      await checkInRegistration(supabase, registration.id);
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al registrar ingreso";
      alert("Error: " + msg);
    } finally {
      setLoading(false);
    }
  };

  const handleUndoCheckIn = async () => {
    if (!confirm(`¿Deshacer el registro de ingreso de "${registration.full_name}"?`)) {
      return;
    }

    try {
      setLoading(true);
      const supabase = createClient();
      await undoRegistrationCheckIn(supabase, registration.id);
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al deshacer ingreso";
      alert("Error: " + msg);
    } finally {
      setLoading(false);
    }
  };

  if (isCheckedIn) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled={loading}
        onClick={handleUndoCheckIn}
        title="Deshacer registro de ingreso"
        className="h-8 px-2.5 rounded-xl border-amber-200 text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 text-[11px] font-bold gap-1"
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Undo2 className="w-3.5 h-3.5" />
        )}
        <span>Deshacer check-in</span>
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={loading || !isConfirmed}
      onClick={handleCheckIn}
      title={
        isConfirmed
          ? "Registrar ingreso del participante"
          : "La inscripción debe estar confirmada antes de registrar el ingreso"
      }
      className={`h-8 px-2.5 rounded-xl text-[11px] font-bold gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 ${
        !isConfirmed ? "opacity-50 cursor-not-allowed" : ""
      }`}
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : (
        <UserCheck className="w-3.5 h-3.5" />
      )}
      <span>Registrar ingreso</span>
    </Button>
  );
}
