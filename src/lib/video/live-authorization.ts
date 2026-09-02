/**
 * Live Stream Access Control Helper
 * Shared authorization logic for live events between client/server pages and unit tests.
 */

export interface LiveRegistrationRecord {
  event_id: string;
  email: string;
  document_number?: string;
  status: "pending" | "confirmed" | "cancelled" | string;
}

export interface LiveAttendeeRecord {
  event_live_id: string;
  email: string;
  document_number?: string;
}

export function isUserAuthorizedForLiveStream(params: {
  targetEventId: string;
  userEmail: string | null | undefined;
  userDocumentNumber?: string | null;
  registration: LiveRegistrationRecord | null;
  guestAttendee: LiveAttendeeRecord | null;
}): boolean {
  const { targetEventId, userEmail, registration, guestAttendee } = params;

  if (!userEmail || typeof userEmail !== "string") return false;
  const cleanEmail = userEmail.toLowerCase().trim();

  // 1. Guest list check (specific to this live event)
  if (guestAttendee) {
    const isMatchingGuest =
      guestAttendee.event_live_id === targetEventId &&
      guestAttendee.email.toLowerCase().trim() === cleanEmail;
    if (isMatchingGuest) return true;
  }

  // 2. Confirmed registration check (specific to target event)
  if (registration) {
    const isMatchingRegistration =
      registration.event_id === targetEventId &&
      registration.email.toLowerCase().trim() === cleanEmail &&
      registration.status === "confirmed";
    if (isMatchingRegistration) return true;
  }

  return false;
}
