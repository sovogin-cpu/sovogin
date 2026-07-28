-- Script para corregir la tabla de inscripciones (registrations)
-- Agrega las columnas faltantes detectadas en el frontend

-- 1. Agregar columnas si no existen
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS document_number TEXT;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS amount DECIMAL(12,2) DEFAULT 0.00;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS modality TEXT;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.registrations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- 2. Asegurar que user_id sea opcional (ya lo es por defecto, pero por claridad)
ALTER TABLE public.registrations ALTER COLUMN user_id DROP NOT NULL;

-- 3. Actualizar Políticas de RLS
-- Eliminar políticas antiguas si es necesario para evitar conflictos
DROP POLICY IF EXISTS "Users can register themselves." ON public.registrations;
DROP POLICY IF EXISTS "Public can register for events." ON public.registrations;

-- Nueva política: Permitir que cualquier persona se inscriba (público)
CREATE POLICY "Public can register for events." ON public.registrations
    FOR INSERT WITH CHECK (true);

-- Nueva política: Permitir que los administradores vean todas las inscripciones
DROP POLICY IF EXISTS "Admins can view all registrations." ON public.registrations;
CREATE POLICY "Admins can view all registrations." ON public.registrations
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Nueva política: Permitir que los administradores eliminen inscripciones
DROP POLICY IF EXISTS "Admins can delete registrations." ON public.registrations;
CREATE POLICY "Admins can delete registrations." ON public.registrations
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- Nota: Recordar refrescar el "PostgREST cache" en Supabase (API Settings) 
-- si el error persiste después de aplicar el SQL.
