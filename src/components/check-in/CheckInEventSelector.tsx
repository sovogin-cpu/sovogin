"use client";

import React from "react";
import { Calendar } from "lucide-react";
import { RegistrationEventItem } from "@/lib/registrations/types";

interface CheckInEventSelectorProps {
  events: RegistrationEventItem[];
  selectedEventId: string;
  onSelectEvent: (eventId: string) => void;
  disabled?: boolean;
}

export const CheckInEventSelector: React.FC<CheckInEventSelectorProps> = ({
  events,
  selectedEventId,
  onSelectEvent,
  disabled = false,
}) => {
  return (
    <div className="w-full bg-slate-900 text-white p-4 rounded-2xl shadow-lg border border-slate-800">
      <label className="flex items-center gap-2 text-xs font-semibold text-sky-400 uppercase tracking-wider mb-2">
        <Calendar className="w-4 h-4 text-sky-400" />
        Evento Seleccionado para Acreditación
      </label>
      <select
        value={selectedEventId}
        onChange={(e) => onSelectEvent(e.target.value)}
        disabled={disabled}
        className="w-full bg-slate-800 text-slate-100 font-medium text-base sm:text-lg px-4 py-3 rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50 appearance-none cursor-pointer"
      >
        <option value="" disabled>
          -- Selecciona un evento para registrar asistencia --
        </option>
        {events.map((event) => (
          <option key={event.id} value={event.id} className="bg-slate-900 text-white">
            {event.title}
          </option>
        ))}
      </select>
    </div>
  );
};
