"use client";

import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

interface StatusPollerProps {
  reference: string;
  initialStatus: string;
}

export function StatusPoller({ reference, initialStatus }: StatusPollerProps) {
  const [pollCount, setPollCount] = useState(0);

  useEffect(() => {
    const isPending = initialStatus === "pending" || initialStatus === "processing";
    if (!isPending || pollCount >= 10) return;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/payments/openpay/status/${encodeURIComponent(reference)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status && data.status !== initialStatus) {
            window.location.reload();
            return;
          }
        }
      } catch (err) {
        console.error("Error al verificar estado de la orden:", err);
      }
      setPollCount((prev) => prev + 1);
    }, 3000);

    return () => clearTimeout(timer);
  }, [reference, initialStatus, pollCount]);

  if (pollCount > 0 && pollCount < 10) {
    return (
      <div className="flex items-center justify-center gap-2 text-xs text-amber-600 font-medium animate-pulse pt-2">
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
        <span>Actualizando estado... (intento {pollCount}/10)</span>
      </div>
    );
  }

  return null;
}

export default StatusPoller;
