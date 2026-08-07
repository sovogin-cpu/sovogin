-- Migración Down (Rollback): Módulo de Check-in para Inscripciones (SOVOGIN)
-- Descripción: Reversión limpia de índices, restricciones y columnas del módulo de check-in.

-- 1. Eliminar índices
DROP INDEX IF EXISTS public.idx_registrations_event_checkin;
DROP INDEX IF EXISTS public.idx_registrations_checked_in_at;

-- 2. Eliminar restricción CHECK
ALTER TABLE public.registrations DROP CONSTRAINT IF EXISTS registrations_check_in_method_check;

-- 3. Eliminar columnas agregadas (sin CASCADE)
ALTER TABLE public.registrations DROP COLUMN IF EXISTS check_in_method;
ALTER TABLE public.registrations DROP COLUMN IF EXISTS checked_in_by;
ALTER TABLE public.registrations DROP COLUMN IF EXISTS checked_in_at;
