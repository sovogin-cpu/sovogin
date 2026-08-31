-- Migración: Acreditación y Check-in por QR (SOVOGIN)
-- Descripción: Agrega soporte para token de check-in por QR almacenado en forma de hash SHA-256 opaco en public.registrations.

-- 1. Agregar columna checkin_token_hash a public.registrations
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS checkin_token_hash TEXT NULL;

-- 2. Índice único parcial para acelerar búsqueda por token_hash y garantizar unicidad
CREATE UNIQUE INDEX IF NOT EXISTS idx_registrations_checkin_token_hash 
ON public.registrations (checkin_token_hash) 
WHERE checkin_token_hash IS NOT NULL;
