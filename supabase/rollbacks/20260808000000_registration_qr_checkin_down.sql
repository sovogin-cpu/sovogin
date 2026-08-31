-- Reversión de Migración: Acreditación y Check-in por QR (SOVOGIN)

DROP INDEX IF EXISTS public.idx_registrations_checkin_token_hash;
ALTER TABLE public.registrations DROP COLUMN IF EXISTS checkin_token_hash;
