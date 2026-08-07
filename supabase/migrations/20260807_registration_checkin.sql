-- Migración: Módulo de Check-in para Inscripciones a Eventos (SOVOGIN)
-- Descripción: Agrega soporte para registro de ingreso en sitio, auditoría del responsable e índices de rendimiento.

-- 1. Agregar columnas a public.registrations
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS checked_in_at TIMESTAMP WITH TIME ZONE NULL;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS checked_in_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS check_in_method TEXT NULL;

-- 2. Restricción CHECK para controlar los métodos de check-in permitidos
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'registrations_check_in_method_check'
    ) THEN
        ALTER TABLE public.registrations 
        ADD CONSTRAINT registrations_check_in_method_check 
        CHECK (check_in_method IN ('manual', 'document', 'qr'));
    END IF;
END $$;

-- 3. Índices para optimización de consultas y reportes de asistencia
CREATE INDEX IF NOT EXISTS idx_registrations_checked_in_at 
ON public.registrations (checked_in_at);

CREATE INDEX IF NOT EXISTS idx_registrations_event_checkin 
ON public.registrations (event_id, checked_in_at);
