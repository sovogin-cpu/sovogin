"use client";

import React from "react";
import {
  EventPricingTierOption,
  PaymentSelectionForm,
} from "./PaymentSelectionForm";

interface OpenpayRegistrationFormProps {
  eventId: string;
  eventTitle: string;
  eventPrice: number;
  eventDate?: string;
  eventLocation?: string;
  className?: string;
  eventTiers?: EventPricingTierOption[];
  onSuccess?: (response: { reference: string; paymentUrl: string }) => void;
}

export function OpenpayRegistrationForm({
  eventId,
  eventTitle,
  eventPrice,
  eventDate,
  eventLocation,
  className = "",
  eventTiers,
}: OpenpayRegistrationFormProps) {
  return (
    <PaymentSelectionForm
      eventId={eventId}
      eventTitle={eventTitle}
      eventPrice={eventPrice}
      eventDate={eventDate}
      eventLocation={eventLocation}
      className={className}
      eventTiers={eventTiers}
    />
  );
}

export default OpenpayRegistrationForm;
